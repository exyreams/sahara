use crate::errors::ErrorCode;
use crate::state::{
    ActivityLog, ActivityType, DisasterEvent, DistributionType, DonationRecord, DonationType,
    FundPool, PlatformConfig, NGO,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateFundPoolParams {
    pub name: String,
    pub distribution_type: DistributionType,
    pub time_lock_duration: Option<i64>,
    pub distribution_percentage_immediate: u8,
    pub distribution_percentage_locked: u8,
    pub eligibility_criteria: String,
    pub minimum_family_size: Option<u8>,
    pub minimum_damage_severity: Option<u8>,
    pub target_amount: Option<u64>,
    pub description: String,
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String, timestamp: i64)]
pub struct CreateFundPool<'info> {
    #[account(
        init,
        payer = payer,
        space = FundPool::SPACE,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump
    )]
    pub pool: Box<Account<'info, FundPool>>,

    #[account(
        init,
        payer = payer,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [
            b"pool-token",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump
    )]
    pub pool_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"disaster", disaster_id.as_bytes()],
        bump = disaster.bump,
        constraint = disaster.is_active @ ErrorCode::DisasterNotActive
    )]
    pub disaster: Box<Account<'info, DisasterEvent>>,

    #[account(
        mut,
        seeds = [b"ngo", ngo_authority.key().as_ref()],
        bump = ngo.bump,
        constraint = ngo.is_active @ ErrorCode::NGONotActive,
        constraint = !ngo.is_blacklisted @ ErrorCode::NGOBlacklisted
    )]
    pub ngo: Box<Account<'info, NGO>>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, PlatformConfig>>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            ngo_authority.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    pub ngo_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateFundPool>,
    disaster_id: String,
    pool_id: String,
    _timestamp: i64,
    params: Box<CreateFundPoolParams>,
) -> Result<()> {
    let clock = Clock::get()?;

    let pool = &mut ctx.accounts.pool;
    let ngo = &mut ctx.accounts.ngo;
    let config = &mut ctx.accounts.config;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    require!(ngo.is_active, ErrorCode::NGONotActive);
    require!(!ngo.is_blacklisted, ErrorCode::NGOBlacklisted);

    let max_pools = if ngo.is_verified {
        config.verified_ngo_pool_limit as u32
    } else {
        3u32
    };

    require!(
        ngo.pools_created < max_pools,
        ErrorCode::OperationNotAllowed
    );

    require!(
        pool_id.len() <= FundPool::MAX_POOL_ID_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        disaster_id.len() <= FundPool::MAX_DISASTER_ID_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.name.len() <= FundPool::MAX_NAME_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.eligibility_criteria.len() <= FundPool::MAX_ELIGIBILITY_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.description.len() <= FundPool::MAX_DESCRIPTION_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.distribution_percentage_immediate + params.distribution_percentage_locked == 100,
        ErrorCode::InvalidDistributionPercentages
    );

    require!(
        config
            .allowed_tokens
            .contains(&ctx.accounts.token_mint.key()),
        ErrorCode::InvalidTokenMint
    );

    pool.pool_id = pool_id;
    pool.disaster_id = disaster_id;
    pool.name = params.name;
    pool.authority = ctx.accounts.ngo_authority.key();
    pool.token_mint = ctx.accounts.token_mint.key();
    pool.token_account = ctx.accounts.pool_token_account.key();
    pool.distribution_type = params.distribution_type;
    pool.time_lock_duration = params.time_lock_duration;
    pool.distribution_percentage_immediate = params.distribution_percentage_immediate;
    pool.distribution_percentage_locked = params.distribution_percentage_locked;
    pool.eligibility_criteria = params.eligibility_criteria;
    pool.minimum_family_size = params.minimum_family_size;
    pool.minimum_damage_severity = params.minimum_damage_severity;
    pool.target_amount = params.target_amount;
    pool.description = params.description;

    pool.total_deposited = 0;
    pool.total_distributed = 0;
    pool.total_claimed = 0;
    pool.beneficiary_count = 0;
    pool.total_allocation_weight = 0;
    pool.donor_count = 0;

    pool.is_active = true;
    pool.is_distributed = false;
    pool.created_at = clock.unix_timestamp;
    pool.distributed_at = None;
    pool.closed_at = None;

    pool.registration_locked = false;
    pool.expected_beneficiary_count = None;
    pool.registered_beneficiary_count = 0;

    pool.bump = ctx.bumps.pool;

    ngo.pools_created = ngo
        .pools_created
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    ngo.last_activity_at = clock.unix_timestamp;

    config.total_pools = config
        .total_pools
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::FundPoolCreated;
    activity_log.actor = ctx.accounts.ngo_authority.key();
    activity_log.target = pool.key();
    activity_log.amount = params.target_amount;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Pool: {} | Disaster: {} | Type: {:?}",
        pool.name, pool.disaster_id, pool.distribution_type
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Fund pool created successfully");
    msg!("Pool ID: {}", pool.pool_id);
    msg!("Name: {}", pool.name);
    msg!("Distribution type: {:?}", pool.distribution_type);
    msg!(
        "Immediate release: {}%",
        pool.distribution_percentage_immediate
    );
    msg!("Time-locked: {}%", pool.distribution_percentage_locked);

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DonateToPoolParams {
    pub amount: u64,
    pub message: String,
    pub is_anonymous: bool,
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String, params: DonateToPoolParams, timestamp: i64)]
pub struct DonateToPool<'info> {
    #[account(
        mut,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump = pool.bump,
        constraint = pool.is_active @ ErrorCode::PoolNotActive
    )]
    pub pool: Box<Account<'info, FundPool>>,

    #[account(
        mut,
        constraint = pool_token_account.key() == pool.token_account @ ErrorCode::TokenAccountMismatch
    )]
    pub pool_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = donor,
        space = DonationRecord::SPACE,
        seeds = [
            b"donation",
            donor.key().as_ref(),
            pool.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub donation_record: Box<Account<'info, DonationRecord>>,

    #[account(
        mut,
        constraint = donor_token_account.mint == pool.token_mint @ ErrorCode::InvalidTokenMint,
        constraint = donor_token_account.owner == donor.key() @ ErrorCode::InvalidAccountOwner
    )]
    pub donor_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, PlatformConfig>>,

    #[account(
        mut,
        constraint = platform_fee_recipient.owner == config.platform_fee_recipient @ ErrorCode::InvalidAccountOwner,
        constraint = platform_fee_recipient.mint == pool.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub platform_fee_recipient: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = donor,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            donor.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(mut)]
    pub donor: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn donate_to_pool_handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, DonateToPool<'info>>,
    disaster_id: String,
    _pool_id: String,
    params: DonateToPoolParams,
    _timestamp: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    let pool = &mut ctx.accounts.pool;
    let config = &mut ctx.accounts.config;
    let donation_record = &mut ctx.accounts.donation_record;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    let (ngo_pda, _) =
        Pubkey::find_program_address(&[b"ngo", pool.authority.as_ref()], ctx.program_id);

    let ngo_account = ctx
        .remaining_accounts
        .get(0)
        .ok_or(ErrorCode::ResourceNotFound)?;

    require!(ngo_account.key() == ngo_pda, ErrorCode::InvalidAccountOwner);

    let ngo: Account<NGO> = Account::try_from(ngo_account)?;

    require!(ngo.is_active, ErrorCode::NGONotActive);
    require!(!ngo.is_blacklisted, ErrorCode::NGOBlacklisted);

    require!(
        params.amount >= config.min_donation_amount,
        ErrorCode::DonationBelowMinimum
    );

    let max_donation = if ngo.is_verified {
        config.verified_ngo_max_donation
    } else {
        config.max_donation_amount
    };

    require!(
        params.amount <= max_donation,
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
            to: ctx.accounts.pool_token_account.to_account_info(),
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

    pool.total_deposited = pool
        .total_deposited
        .checked_add(net_amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    pool.donor_count = pool
        .donor_count
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    donation_record.donor = ctx.accounts.donor.key();
    donation_record.recipient = pool.key();
    donation_record.donation_type = DonationType::Pool;
    donation_record.amount = params.amount;
    donation_record.token_mint = pool.token_mint;
    donation_record.disaster_id = disaster_id;
    donation_record.pool = Some(pool.key());
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
    config.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::DonationToPool;
    activity_log.actor = ctx.accounts.donor.key();
    activity_log.target = pool.key();
    activity_log.amount = Some(net_amount);
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Pool: {} | Amount: {} | Fee: {}",
        pool.name, params.amount, platform_fee
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Donation to pool successful");
    msg!("Amount: {}", params.amount);
    msg!("Platform fee: {}", platform_fee);
    msg!("Net amount: {}", net_amount);
    msg!("Pool: {}", pool.name);

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdatePoolConfigParams {
    pub is_active: Option<bool>,
    pub eligibility_criteria: Option<String>,
    pub target_amount: Option<u64>,
    pub description: Option<String>,
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String)]
pub struct UpdatePoolConfig<'info> {
    #[account(
        mut,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ ErrorCode::UnauthorizedModification
    )]
    pub pool: Account<'info, FundPool>,

    pub authority: Signer<'info>,
}

pub fn update_pool_config_handler(
    ctx: Context<UpdatePoolConfig>,
    _disaster_id: String,
    _pool_id: String,
    params: UpdatePoolConfigParams,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    require!(
        !pool.is_distributed,
        ErrorCode::DistributionAlreadyCompleted
    );

    if let Some(is_active) = params.is_active {
        pool.is_active = is_active;
        msg!("Pool active status updated to: {}", is_active);
    }

    if let Some(criteria) = params.eligibility_criteria {
        require!(
            criteria.len() <= FundPool::MAX_ELIGIBILITY_LEN,
            ErrorCode::StringTooLong
        );
        pool.eligibility_criteria = criteria;
        msg!("Pool eligibility criteria updated");
    }

    if let Some(target) = params.target_amount {
        pool.target_amount = Some(target);
        msg!("Pool target amount updated to: {}", target);
    }

    if let Some(description) = params.description {
        require!(
            description.len() <= FundPool::MAX_DESCRIPTION_LEN,
            ErrorCode::StringTooLong
        );
        pool.description = description;
        msg!("Pool description updated");
    }

    msg!("Pool configuration updated successfully");

    Ok(())
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String, timestamp: i64)]
pub struct ClosePool<'info> {
    #[account(
        mut,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ ErrorCode::UnauthorizedModification
    )]
    pub pool: Account<'info, FundPool>,

    #[account(
        init,
        payer = authority,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            authority.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn close_pool_handler(
    ctx: Context<ClosePool>,
    _disaster_id: String,
    _pool_id: String,
    _timestamp: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;

    require!(pool.is_active, ErrorCode::PoolClosed);

    pool.is_active = false;
    pool.closed_at = Some(clock.unix_timestamp);

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::FundPoolClosed;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = pool.key();
    activity_log.amount = Some(pool.total_deposited);
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Pool: {} | Deposited: {} | Distributed: {}",
        pool.name, pool.total_deposited, pool.total_distributed
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Pool closed successfully");
    msg!("Pool: {}", pool.name);
    msg!("Total deposited: {}", pool.total_deposited);
    msg!("Total distributed: {}", pool.total_distributed);
    msg!("Total claimed: {}", pool.total_claimed);
    msg!("Unclaimed: {}", pool.total_distributed - pool.total_claimed);

    Ok(())
}
