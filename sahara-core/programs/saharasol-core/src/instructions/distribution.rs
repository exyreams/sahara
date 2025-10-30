use crate::errors::ErrorCode;
use crate::state::{
    ActivityLog, ActivityType, Beneficiary, DisasterEvent, Distribution, DistributionType,
    FundPool, VerificationStatus,
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DistributeFromPoolParams {
    pub beneficiary_authority: Pubkey,
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String, params: DistributeFromPoolParams)]
pub struct DistributeFromPool<'info> {
    #[account(
        mut,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump = pool.bump,
        constraint = pool.is_active @ ErrorCode::PoolNotActive,
        constraint = !pool.is_distributed @ ErrorCode::DistributionAlreadyCompleted
    )]
    pub pool: Account<'info, FundPool>,

    #[account(
        init,
        payer = authority,
        space = Distribution::SPACE,
        seeds = [
            b"distribution",
            params.beneficiary_authority.as_ref(),
            pool.key().as_ref()
        ],
        bump
    )]
    pub distribution: Account<'info, Distribution>,

    #[account(
        init,
        payer = authority,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            pool.key().as_ref(),
            beneficiary.key().as_ref()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(
        seeds = [
            b"beneficiary",
            params.beneficiary_authority.as_ref(),
            disaster_id.as_bytes()
        ],
        bump = beneficiary.bump,
        constraint = beneficiary.verification_status == VerificationStatus::Verified @ ErrorCode::BeneficiaryNotVerified
    )]
    pub beneficiary: Account<'info, Beneficiary>,

    #[account(
        mut,
        seeds = [b"disaster", disaster_id.as_bytes()],
        bump = disaster.bump,
    )]
    pub disaster: Account<'info, DisasterEvent>,

    #[account(
        mut,
        constraint = pool.authority == authority.key() @ ErrorCode::UnauthorizedModification
    )]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<DistributeFromPool>,
    _disaster_id: String,
    _pool_id: String,
    _params: DistributeFromPoolParams,
) -> Result<()> {
    let clock = Clock::get()?;

    let pool = &mut ctx.accounts.pool;
    let distribution = &mut ctx.accounts.distribution;
    let beneficiary = &ctx.accounts.beneficiary;
    let disaster = &mut ctx.accounts.disaster;

    if let Some(min_family_size) = pool.minimum_family_size {
        require!(
            beneficiary.family_size >= min_family_size,
            ErrorCode::InvalidEligibilityCriteria
        );
    }

    if let Some(min_damage) = pool.minimum_damage_severity {
        require!(
            beneficiary.damage_severity >= min_damage,
            ErrorCode::InvalidEligibilityCriteria
        );
    }

    let allocation_weight: u64 = match pool.distribution_type {
        DistributionType::Equal => 1,
        DistributionType::WeightedFamily => beneficiary.family_size as u64,
        DistributionType::WeightedDamage => beneficiary.damage_severity as u64,
        DistributionType::Milestone => 1,
    };

    let total_allocation = if pool.total_allocation_weight > 0 {
        let numerator = (pool.total_deposited as u128)
            .checked_mul(allocation_weight as u128)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        let allocation = numerator
            .checked_div(pool.total_allocation_weight as u128)
            .ok_or(ErrorCode::DivisionByZero)? as u64;

        allocation
    } else {
        pool.total_deposited
            .checked_div(pool.beneficiary_count.max(1) as u64)
            .ok_or(ErrorCode::DivisionByZero)?
    };

    let amount_immediate = (total_allocation as u128)
        .checked_mul(pool.distribution_percentage_immediate as u128)
        .ok_or(ErrorCode::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::DivisionByZero)? as u64;

    let amount_locked = total_allocation
        .checked_sub(amount_immediate)
        .ok_or(ErrorCode::ArithmeticUnderflow)?;

    let unlock_time = if amount_locked > 0 {
        pool.time_lock_duration
            .map(|duration| clock.unix_timestamp + duration)
    } else {
        None
    };

    distribution.beneficiary = beneficiary.key();
    distribution.pool = pool.key();
    distribution.amount_allocated = total_allocation;
    distribution.amount_immediate = amount_immediate;
    distribution.amount_locked = amount_locked;
    distribution.amount_claimed = 0;
    distribution.unlock_time = unlock_time;
    distribution.created_at = clock.unix_timestamp;
    distribution.claimed_at = None;
    distribution.locked_claimed_at = None;
    distribution.is_fully_claimed = false;
    distribution.allocation_weight = allocation_weight as u16;
    distribution.notes = String::new();
    distribution.bump = ctx.bumps.distribution;

    pool.total_distributed = pool
        .total_distributed
        .checked_add(total_allocation)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    pool.total_allocation_weight = pool
        .total_allocation_weight
        .checked_add(allocation_weight)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    pool.beneficiary_count = pool
        .beneficiary_count
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    disaster.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::FundsDistributed;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = beneficiary.key();
    activity_log.amount = Some(total_allocation);
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Pool: {} | Beneficiary: {} | Amount: {} | Immediate: {} | Locked: {}",
        pool.name, beneficiary.name, total_allocation, amount_immediate, amount_locked
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Distribution created successfully");
    msg!("Beneficiary: {}", beneficiary.name);
    msg!("Total allocated: {}", total_allocation);
    msg!("Immediate: {}", amount_immediate);
    msg!("Locked: {}", amount_locked);
    if let Some(unlock) = unlock_time {
        msg!("Unlock time: {}", unlock);
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String)]
pub struct ClaimDistribution<'info> {
    #[account(
        mut,
        seeds = [
            b"distribution",
            beneficiary_authority.key().as_ref(),
            pool.key().as_ref()
        ],
        bump = distribution.bump,
        constraint = distribution.beneficiary == beneficiary.key() @ ErrorCode::UnauthorizedBeneficiary
    )]
    pub distribution: Account<'info, Distribution>,

    #[account(
        init,
        payer = beneficiary_authority,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            pool.key().as_ref(),
            beneficiary.key().as_ref(),
            b"claim"
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(
        mut,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump = pool.bump,
    )]
    pub pool: Account<'info, FundPool>,

    #[account(
        mut,
        constraint = pool_token_account.key() == pool.token_account @ ErrorCode::TokenAccountMismatch
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary_authority.key().as_ref(),
            disaster_id.as_bytes()
        ],
        bump = beneficiary.bump,
    )]
    pub beneficiary: Account<'info, Beneficiary>,

    #[account(
        mut,
        constraint = beneficiary_token_account.owner == beneficiary_authority.key() @ ErrorCode::InvalidAccountOwner,
        constraint = beneficiary_token_account.mint == pool.token_mint @ ErrorCode::InvalidTokenMint
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub beneficiary_authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn claim_distribution_handler(
    ctx: Context<ClaimDistribution>,
    _disaster_id: String,
    _pool_id: String,
) -> Result<()> {
    let clock = Clock::get()?;

    let distribution = &mut ctx.accounts.distribution;
    let pool = &mut ctx.accounts.pool;
    let beneficiary = &mut ctx.accounts.beneficiary;

    require!(
        !distribution.is_fully_claimed,
        ErrorCode::DistributionAlreadyClaimed
    );

    let mut amount_to_claim = 0u64;

    if distribution.claimed_at.is_none() && distribution.amount_immediate > 0 {
        amount_to_claim = amount_to_claim
            .checked_add(distribution.amount_immediate)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        distribution.claimed_at = Some(clock.unix_timestamp);
        msg!(
            "Claiming immediate amount: {}",
            distribution.amount_immediate
        );
    }

    if distribution.locked_claimed_at.is_none() && distribution.amount_locked > 0 {
        if let Some(unlock_time) = distribution.unlock_time {
            require!(
                clock.unix_timestamp >= unlock_time,
                ErrorCode::TimeLockNotExpired
            );
        }
        amount_to_claim = amount_to_claim
            .checked_add(distribution.amount_locked)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        distribution.locked_claimed_at = Some(clock.unix_timestamp);
        msg!("Claiming locked amount: {}", distribution.amount_locked);
    }

    require!(amount_to_claim > 0, ErrorCode::DistributionAlreadyClaimed);

    let disaster_id_bytes = pool.disaster_id.as_bytes();
    let pool_id_bytes = pool.pool_id.as_bytes();
    let seeds = &[b"pool", disaster_id_bytes, pool_id_bytes, &[pool.bump]];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.pool_token_account.to_account_info(),
            to: ctx.accounts.beneficiary_token_account.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, amount_to_claim)?;

    distribution.amount_claimed = distribution
        .amount_claimed
        .checked_add(amount_to_claim)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    if distribution.amount_claimed >= distribution.amount_allocated {
        distribution.is_fully_claimed = true;
    }

    pool.total_claimed = pool
        .total_claimed
        .checked_add(amount_to_claim)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    beneficiary.total_received = beneficiary
        .total_received
        .checked_add(amount_to_claim)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::FundsClaimed;
    activity_log.actor = ctx.accounts.beneficiary_authority.key();
    activity_log.target = beneficiary.key();
    activity_log.amount = Some(amount_to_claim);
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Pool: {} | Beneficiary: {} | Amount: {} | Total Claimed: {} | Fully Claimed: {}",
        pool.name,
        beneficiary.name,
        amount_to_claim,
        distribution.amount_claimed,
        distribution.is_fully_claimed
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Distribution claimed successfully");
    msg!("Amount claimed: {}", amount_to_claim);
    msg!("Total claimed: {}", distribution.amount_claimed);
    msg!("Fully claimed: {}", distribution.is_fully_claimed);

    Ok(())
}

pub fn batch_claim_distributions_handler() -> Result<()> {
    msg!("Batch claims should be implemented by calling claim_distribution multiple times");
    Err(ErrorCode::NotImplemented.into())
}
