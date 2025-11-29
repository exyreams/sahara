use crate::errors::ErrorCode;
use crate::state::{
    ActivityLog, ActivityType, Beneficiary, DisasterEvent, DistributionType, FundPool,
    PoolRegistration, VerificationStatus,
};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterBeneficiaryForPoolParams {
    pub beneficiary_authority: Pubkey,
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String, params: RegisterBeneficiaryForPoolParams, timestamp: i64)]
pub struct RegisterBeneficiaryForPool<'info> {
    #[account(
        mut,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump = pool.bump,
        constraint = pool.is_active @ ErrorCode::PoolNotActive,
        constraint = !pool.registration_locked @ ErrorCode::RegistrationPhaseLocked
    )]
    pub pool: Account<'info, FundPool>,

    #[account(
        init,
        payer = payer,
        space = PoolRegistration::SPACE,
        seeds = [
            b"pool-registration",
            pool.key().as_ref(),
            params.beneficiary_authority.as_ref()
        ],
        bump
    )]
    pub pool_registration: Account<'info, PoolRegistration>,

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
        init,
        payer = payer,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            pool.key().as_ref(),
            params.beneficiary_authority.as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(
        mut,
        constraint = pool.authority == authority.key() @ ErrorCode::UnauthorizedModification
    )]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_beneficiary_for_pool_handler(
    ctx: Context<RegisterBeneficiaryForPool>,
    _disaster_id: String,
    _pool_id: String,
    _params: RegisterBeneficiaryForPoolParams,
    _timestamp: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    let pool = &mut ctx.accounts.pool;
    let beneficiary = &ctx.accounts.beneficiary;
    let pool_registration = &mut ctx.accounts.pool_registration;
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

    pool_registration.pool = pool.key();
    pool_registration.beneficiary = beneficiary.key();
    pool_registration.allocation_weight = allocation_weight;
    pool_registration.registered_at = clock.unix_timestamp;
    pool_registration.is_distributed = false;
    pool_registration.bump = ctx.bumps.pool_registration;

    pool.total_allocation_weight = pool
        .total_allocation_weight
        .checked_add(allocation_weight)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    pool.registered_beneficiary_count = pool
        .registered_beneficiary_count
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    disaster.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::BeneficiaryRegistered;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = beneficiary.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Registered for pool: {} | Weight: {} | Type: {:?}",
        pool.name, allocation_weight, pool.distribution_type
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Beneficiary registered for pool successfully");
    msg!("Beneficiary: {}", beneficiary.name);
    msg!("Allocation weight: {}", allocation_weight);
    msg!("Pool total weight: {}", pool.total_allocation_weight);
    msg!("Registered count: {}", pool.registered_beneficiary_count);

    Ok(())
}

#[derive(Accounts)]
#[instruction(disaster_id: String, pool_id: String, timestamp: i64)]
pub struct LockPoolRegistration<'info> {
    #[account(
        mut,
        seeds = [
            b"pool",
            disaster_id.as_bytes(),
            pool_id.as_bytes()
        ],
        bump = pool.bump,
        constraint = pool.is_active @ ErrorCode::PoolNotActive,
        constraint = !pool.registration_locked @ ErrorCode::RegistrationPhaseLocked,
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
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn lock_pool_registration_handler(
    ctx: Context<LockPoolRegistration>,
    _disaster_id: String,
    _pool_id: String,
    _timestamp: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;

    require!(
        pool.registered_beneficiary_count > 0,
        ErrorCode::NoBeneficiariesForDistribution
    );

    pool.registration_locked = true;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::FundPoolClosed;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = pool.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Registration locked for pool: {} | Total weight: {} | Registered: {}",
        pool.name, pool.total_allocation_weight, pool.registered_beneficiary_count
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Pool registration locked successfully");
    msg!("Pool: {}", pool.name);
    msg!("Total allocation weight: {}", pool.total_allocation_weight);
    msg!(
        "Registered beneficiaries: {}",
        pool.registered_beneficiary_count
    );
    msg!("Ready for distribution");

    Ok(())
}
