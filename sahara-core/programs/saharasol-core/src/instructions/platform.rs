use crate::errors::ErrorCode;
use crate::state::{AdminAction, AdminActionType, PlatformConfig};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializePlatformParams {
    pub platform_fee_percentage: u16,
    pub verification_threshold: u8,
    pub max_verifiers: u8,
    pub min_donation_amount: u64,
    pub max_donation_amount: u64,
    pub usdc_mint: Pubkey,
    pub platform_name: String,
    pub platform_version: String,
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = admin,
        space = PlatformConfig::SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializePlatform>, params: InitializePlatformParams) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let clock = Clock::get()?;

    require!(
        params.platform_fee_percentage <= 1000,
        ErrorCode::InvalidPlatformFee
    );

    require!(
        params.verification_threshold > 0 && params.verification_threshold <= params.max_verifiers,
        ErrorCode::VerificationThresholdNotMet
    );

    require!(
        params.min_donation_amount > 0 && params.min_donation_amount < params.max_donation_amount,
        ErrorCode::InvalidInput
    );

    require!(
        params.platform_name.len() <= PlatformConfig::MAX_PLATFORM_NAME_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.platform_version.len() <= PlatformConfig::MAX_VERSION_LEN,
        ErrorCode::StringTooLong
    );

    config.admin = ctx.accounts.admin.key();
    config.platform_fee_percentage = params.platform_fee_percentage;
    config.platform_fee_recipient = ctx.accounts.admin.key();
    config.verification_threshold = params.verification_threshold;
    config.max_verifiers = params.max_verifiers;
    config.min_donation_amount = params.min_donation_amount;
    config.max_donation_amount = params.max_donation_amount;
    config.verified_ngo_max_donation = params.max_donation_amount * 10;
    config.verified_ngo_pool_limit = 10;
    config.is_paused = false;

    config.total_disasters = 0;
    config.total_beneficiaries = 0;
    config.total_verified_beneficiaries = 0;
    config.total_field_workers = 0;
    config.total_ngos = 0;
    config.total_donations = 0;
    config.total_aid_distributed = 0;
    config.total_pools = 0;

    config.usdc_mint = params.usdc_mint;
    config.sol_usd_oracle = None;
    config.allowed_tokens = vec![params.usdc_mint];
    config.emergency_contacts = vec![ctx.accounts.admin.key()];

    config.platform_name = params.platform_name;
    config.platform_version = params.platform_version;
    config.created_at = clock.unix_timestamp;
    config.updated_at = clock.unix_timestamp;

    config.pending_admin = None;
    config.admin_transfer_initiated_at = None;
    config.admin_transfer_timeout = 7 * 24 * 60 * 60;

    config.bump = ctx.bumps.config;

    msg!("Platform initialized successfully");
    msg!("Admin: {}", config.admin);
    msg!("Platform fee: {}bps", config.platform_fee_percentage);
    msg!(
        "Verification threshold: {}/{}",
        config.verification_threshold,
        config.max_verifiers
    );

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdatePlatformConfigParams {
    pub platform_fee_percentage: Option<u16>,
    pub platform_fee_recipient: Option<Pubkey>,
    pub verification_threshold: Option<u8>,
    pub max_verifiers: Option<u8>,
    pub min_donation_amount: Option<u64>,
    pub max_donation_amount: Option<u64>,
    pub usdc_mint: Option<Pubkey>,
    pub is_paused: Option<bool>,
    pub sol_usd_oracle: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdatePlatformConfigWithAuditParams {
    pub config_params: UpdatePlatformConfigParams,
    pub reason: String,
    pub metadata: String,
}

#[derive(Accounts)]
#[instruction(timestamp: i64)]
pub struct UpdatePlatformConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = admin,
        space = AdminAction::SPACE,
        seeds = [
            b"admin-action",
            admin.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn update_platform_config_handler(
    ctx: Context<UpdatePlatformConfig>,
    _timestamp: i64,
    params: UpdatePlatformConfigWithAuditParams,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.metadata.len() <= AdminAction::MAX_METADATA_LEN,
        ErrorCode::StringTooLong
    );

    let config_params = params.config_params;
    let mut action_type = AdminActionType::UpdatePlatformConfig;

    if let Some(fee) = config_params.platform_fee_percentage {
        require!(fee <= 1000, ErrorCode::InvalidPlatformFee);
        config.platform_fee_percentage = fee;
        msg!("Platform fee updated to: {}bps", fee);
    }

    if let Some(recipient) = config_params.platform_fee_recipient {
        config.platform_fee_recipient = recipient;
        msg!("Platform fee recipient updated to: {}", recipient);
    }

    if let Some(threshold) = config_params.verification_threshold {
        require!(
            threshold > 0 && threshold <= config.max_verifiers,
            ErrorCode::VerificationThresholdNotMet
        );
        config.verification_threshold = threshold;
        msg!("Verification threshold updated to: {}", threshold);
    }

    if let Some(max_verifiers) = config_params.max_verifiers {
        require!(
            max_verifiers >= config.verification_threshold,
            ErrorCode::InvalidInput
        );
        config.max_verifiers = max_verifiers;
        msg!("Max verifiers updated to: {}", max_verifiers);
    }

    if let Some(min_amount) = config_params.min_donation_amount {
        require!(
            min_amount > 0 && min_amount < config.max_donation_amount,
            ErrorCode::InvalidInput
        );
        config.min_donation_amount = min_amount;
        msg!("Min donation amount updated to: {}", min_amount);
    }

    if let Some(max_amount) = config_params.max_donation_amount {
        require!(
            max_amount > config.min_donation_amount,
            ErrorCode::InvalidInput
        );
        config.max_donation_amount = max_amount;
        msg!("Max donation amount updated to: {}", max_amount);
    }

    if let Some(usdc_mint) = config_params.usdc_mint {
        config.usdc_mint = usdc_mint;
        msg!("USDC mint updated to: {}", usdc_mint);
    }

    if let Some(is_paused) = config_params.is_paused {
        config.is_paused = is_paused;
        action_type = if is_paused {
            AdminActionType::PausePlatform
        } else {
            AdminActionType::UnpausePlatform
        };
        msg!("Platform pause status updated to: {}", is_paused);
    }

    if let Some(oracle) = config_params.sol_usd_oracle {
        config.sol_usd_oracle = Some(oracle);
        msg!("SOL/USD oracle updated to: {}", oracle);
    }

    config.updated_at = clock.unix_timestamp;

    admin_action.action_type = action_type;
    admin_action.target = config.key();
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = params.metadata;
    admin_action.bump = ctx.bumps.admin_action;

    msg!("Platform configuration updated successfully");
    msg!("Admin action logged: {:?}", admin_action.action_type);

    Ok(())
}
