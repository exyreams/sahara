use crate::errors::ErrorCode;
use crate::state::{
    ActivityLog, ActivityType, Beneficiary, DisasterEvent, Distribution, FundPool,
    PoolRegistration, VerificationStatus,
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

    #[account(
        seeds = [
            b"pool-registration",
            pool.key().as_ref(),
            params.beneficiary_authority.as_ref()
        ],
        bump = pool_registration.bump,
        constraint = !pool_registration.is_distributed @ ErrorCode::DistributionAlreadyCompleted
    )]
    pub pool_registration: Account<'info, PoolRegistration>,

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
    let pool_registration = &ctx.accounts.pool_registration;

    require!(
        pool.registration_locked,
        ErrorCode::PoolRegistrationNotLocked
    );

    let allocation_weight = pool_registration.allocation_weight;

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
            .checked_div(pool.registered_beneficiary_count.max(1) as u64)
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

    distribution.claim_deadline = Some(clock.unix_timestamp + 90 * 24 * 60 * 60);
    distribution.is_expired = false;
    distribution.expired_at = None;

    pool.total_distributed = pool
        .total_distributed
        .checked_add(total_allocation)
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
#[instruction(disaster_id: String, pool_id: String, timestamp: i64)]
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
            &timestamp.to_le_bytes()
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
    _timestamp: i64,
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
        let can_claim_locked = match distribution.unlock_time {
            Some(unlock_time) => clock.unix_timestamp >= unlock_time,
            None => true,
        };

        if can_claim_locked {
            amount_to_claim = amount_to_claim
                .checked_add(distribution.amount_locked)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            distribution.locked_claimed_at = Some(clock.unix_timestamp);
            msg!("Claiming locked amount: {}", distribution.amount_locked);
        } else {
            msg!("Locked amount not yet available, skipping");
        }
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

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String, beneficiary_authority: Pubkey)]
pub struct ReclaimExpiredDistribution<'info> {
    #[account(
        mut,
        seeds = [
            b"distribution",
            beneficiary_authority.as_ref(),
            pool.key().as_ref()
        ],
        bump = distribution.bump,
        constraint = distribution.pool == pool.key() @ ErrorCode::AccountDataMismatch
    )]
    pub distribution: Account<'info, Distribution>,

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
            pool.key().as_ref(),
            distribution.key().as_ref(),
            b"reclaim"
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn reclaim_expired_distribution_handler(
    ctx: Context<ReclaimExpiredDistribution>,
    _disaster_id: String,
    _pool_id: String,
    _beneficiary_authority: Pubkey,
) -> Result<()> {
    let clock = Clock::get()?;
    let distribution = &mut ctx.accounts.distribution;
    let pool = &mut ctx.accounts.pool;

    require!(
        !distribution.is_expired,
        ErrorCode::DistributionAlreadyExpired
    );

    require!(
        distribution.amount_claimed == 0,
        ErrorCode::DistributionPartiallyClaimed
    );

    if let Some(deadline) = distribution.claim_deadline {
        require!(
            clock.unix_timestamp > deadline,
            ErrorCode::DistributionNotExpired
        );
    } else {
        return Err(ErrorCode::DistributionNotExpired.into());
    }

    let unclaimed_amount = distribution.amount_allocated;

    distribution.is_expired = true;
    distribution.expired_at = Some(clock.unix_timestamp);
    distribution.is_fully_claimed = true;

    pool.total_distributed = pool
        .total_distributed
        .checked_sub(unclaimed_amount)
        .ok_or(ErrorCode::ArithmeticUnderflow)?;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::FundsDistributed;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = distribution.beneficiary;
    activity_log.amount = Some(unclaimed_amount);
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Reclaimed expired distribution | Pool: {} | Amount: {} | Original deadline: {:?}",
        pool.name, unclaimed_amount, distribution.claim_deadline
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Expired distribution reclaimed successfully");
    msg!("Reclaimed amount: {}", unclaimed_amount);
    msg!("Funds returned to pool available balance");

    Ok(())
}
