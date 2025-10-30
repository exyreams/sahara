use crate::errors::ErrorCode;
use crate::state::{
    Beneficiary, DisasterEvent, DonationRecord, DonationType, PlatformConfig, VerificationStatus,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DonateDirectParams {
    pub amount: u64,
    pub message: String,
    pub is_anonymous: bool,
}

#[derive(Accounts)]
#[instruction(beneficiary_authority: Pubkey, disaster_id: String, params: Box<DonateDirectParams>, timestamp: i64)]
pub struct DonateDirect<'info> {
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary_authority.as_ref(),
            disaster_id.as_bytes()
        ],
        bump = beneficiary.bump,
        constraint = beneficiary.verification_status == VerificationStatus::Verified @ ErrorCode::BeneficiaryNotVerified
    )]
    pub beneficiary: Box<Account<'info, Beneficiary>>,

    #[account(
        mut,
        seeds = [b"disaster", disaster_id.as_bytes()],
        bump = disaster.bump,
    )]
    pub disaster: Box<Account<'info, DisasterEvent>>,

    #[account(
        init,
        payer = donor,
        space = DonationRecord::SPACE,
        seeds = [
            b"donation",
            donor.key().as_ref(),
            beneficiary.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub donation_record: Box<Account<'info, DonationRecord>>,

    #[account(
        mut,
        constraint = donor_token_account.owner == donor.key() @ ErrorCode::InvalidAccountOwner
    )]
    pub donor_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = beneficiary_token_account.owner == beneficiary_authority @ ErrorCode::InvalidAccountOwner,
        constraint = beneficiary_token_account.mint == donor_token_account.mint @ ErrorCode::InvalidTokenMint
    )]
    pub beneficiary_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, PlatformConfig>>,

    #[account(
        mut,
        constraint = platform_fee_recipient.owner == config.platform_fee_recipient @ ErrorCode::InvalidAccountOwner,
        constraint = platform_fee_recipient.mint == donor_token_account.mint @ ErrorCode::InvalidTokenMint
    )]
    pub platform_fee_recipient: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub donor: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<DonateDirect>,
    _beneficiary_authority: Pubkey,
    disaster_id: String,
    params: Box<DonateDirectParams>,
    _timestamp: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    let beneficiary = &mut ctx.accounts.beneficiary;
    let disaster = &mut ctx.accounts.disaster;
    let config = &mut ctx.accounts.config;
    let donation_record = &mut ctx.accounts.donation_record;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    require!(
        params.amount >= config.min_donation_amount,
        ErrorCode::DonationBelowMinimum
    );

    require!(
        params.amount <= config.max_donation_amount,
        ErrorCode::DonationExceedsMaximum
    );

    require!(
        params.message.len() <= DonationRecord::MAX_MESSAGE_LEN,
        ErrorCode::StringTooLong
    );

    let platform_fee = (params.amount as u128)
        .checked_mul(config.platform_fee_percentage as u128)
        .ok_or(ErrorCode::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::DivisionByZero)? as u64;

    let net_amount = params
        .amount
        .checked_sub(platform_fee)
        .ok_or(ErrorCode::ArithmeticUnderflow)?;

    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.donor_token_account.to_account_info(),
            to: ctx.accounts.beneficiary_token_account.to_account_info(),
            authority: ctx.accounts.donor.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, net_amount)?;

    if platform_fee > 0 {
        let fee_transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.donor_token_account.to_account_info(),
                to: ctx.accounts.platform_fee_recipient.to_account_info(),
                authority: ctx.accounts.donor.to_account_info(),
            },
        );
        token::transfer(fee_transfer_ctx, platform_fee)?;
    }

    beneficiary.total_received = beneficiary
        .total_received
        .checked_add(net_amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    disaster.total_aid_distributed = disaster
        .total_aid_distributed
        .checked_add(net_amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    disaster.updated_at = clock.unix_timestamp;

    donation_record.donor = ctx.accounts.donor.key();
    donation_record.recipient = beneficiary.key();
    donation_record.donation_type = DonationType::Direct;
    donation_record.amount = params.amount;
    donation_record.token_mint = ctx.accounts.donor_token_account.mint;
    donation_record.disaster_id = disaster_id;
    donation_record.pool = None;
    donation_record.transaction_signature = String::new();
    donation_record.timestamp = clock.unix_timestamp;
    donation_record.is_anonymous = params.is_anonymous;
    donation_record.message = params.message;
    donation_record.platform_fee = platform_fee;
    donation_record.net_amount = net_amount;
    donation_record.donor_name = None;
    donation_record.donor_email = None;
    donation_record.receipt_sent = false;
    donation_record.bump = ctx.bumps.donation_record;

    config.total_donations = config
        .total_donations
        .checked_add(net_amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    config.total_aid_distributed = config
        .total_aid_distributed
        .checked_add(net_amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    msg!("Direct donation successful");
    msg!("Beneficiary: {}", beneficiary.name);
    msg!("Amount: {}", params.amount);
    msg!("Platform fee: {}", platform_fee);
    msg!("Net amount: {}", net_amount);

    Ok(())
}
