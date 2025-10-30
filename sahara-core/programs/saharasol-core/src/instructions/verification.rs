use crate::errors::ErrorCode;
use crate::state::{
    ActivityLog, ActivityType, Beneficiary, DisasterEvent, FieldWorker, PlatformConfig,
    VerificationStatus,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(beneficiary_authority: Pubkey, disaster_id: String, timestamp: i64)]
pub struct VerifyBeneficiary<'info> {
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary_authority.as_ref(),
            disaster_id.as_bytes()
        ],
        bump = beneficiary.bump,
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
        seeds = [b"field-worker", field_worker_authority.key().as_ref()],
        bump = field_worker.bump,
        constraint = field_worker.is_active @ ErrorCode::FieldWorkerNotActive
    )]
    pub field_worker: Account<'info, FieldWorker>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = field_worker_authority,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            field_worker_authority.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    #[account(mut)]
    pub field_worker_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<VerifyBeneficiary>,
    _beneficiary_authority: Pubkey,
    _disaster_id: String,
    _timestamp: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    let beneficiary = &mut ctx.accounts.beneficiary;
    let disaster = &mut ctx.accounts.disaster;
    let field_worker = &mut ctx.accounts.field_worker;
    let config = &mut ctx.accounts.config;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    require!(
        beneficiary.verification_status != VerificationStatus::Verified,
        ErrorCode::AlreadyVerified
    );

    require!(
        beneficiary.verification_status != VerificationStatus::Rejected,
        ErrorCode::CannotVerifyRejected
    );

    require!(
        beneficiary.verification_status != VerificationStatus::Flagged,
        ErrorCode::BeneficiaryFlagged
    );

    let field_worker_key = ctx.accounts.field_worker_authority.key();
    require!(
        !beneficiary.verifier_approvals.contains(&field_worker_key),
        ErrorCode::DuplicateApproval
    );

    require!(
        beneficiary.verifier_approvals.len() < config.max_verifiers as usize,
        ErrorCode::MaxVerifiersReached
    );

    beneficiary.verifier_approvals.push(field_worker_key);

    let approval_count = beneficiary.verifier_approvals.len() as u8;

    msg!("Approval added from field worker: {}", field_worker.name);
    msg!(
        "Total approvals: {}/{}",
        approval_count,
        config.verification_threshold
    );

    if approval_count >= config.verification_threshold {
        beneficiary.verification_status = VerificationStatus::Verified;
        beneficiary.verified_at = Some(clock.unix_timestamp);

        disaster.verified_beneficiaries = disaster
            .verified_beneficiaries
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        disaster.updated_at = clock.unix_timestamp;

        config.total_verified_beneficiaries = config
            .total_verified_beneficiaries
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        config.updated_at = clock.unix_timestamp;

        msg!("✓ Beneficiary VERIFIED!");
        msg!("Name: {}", beneficiary.name);
        msg!("Verified at: {}", clock.unix_timestamp);
    } else {
        msg!(
            "Approval recorded. {} more approval(s) needed.",
            config.verification_threshold - approval_count
        );
    }

    field_worker.verifications_count = field_worker
        .verifications_count
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    field_worker.last_activity_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::BeneficiaryVerified;
    activity_log.actor = ctx.accounts.field_worker_authority.key();
    activity_log.target = beneficiary.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Beneficiary: {} | Approvals: {}/{}",
        beneficiary.name, approval_count, config.verification_threshold
    );
    activity_log.bump = ctx.bumps.activity_log;

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct FlagBeneficiaryParams {
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(beneficiary_authority: Pubkey, disaster_id: String)]
pub struct FlagBeneficiary<'info> {
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary_authority.as_ref(),
            disaster_id.as_bytes()
        ],
        bump = beneficiary.bump,
    )]
    pub beneficiary: Account<'info, Beneficiary>,

    #[account(
        mut,
        seeds = [b"field-worker", field_worker_authority.key().as_ref()],
        bump = field_worker.bump,
        constraint = field_worker.is_active @ ErrorCode::FieldWorkerNotActive
    )]
    pub field_worker: Account<'info, FieldWorker>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

    pub field_worker_authority: Signer<'info>,
}

pub fn flag_beneficiary_handler(
    ctx: Context<FlagBeneficiary>,
    _beneficiary_authority: Pubkey,
    _disaster_id: String,
    params: FlagBeneficiaryParams,
) -> Result<()> {
    let clock = Clock::get()?;

    let beneficiary = &mut ctx.accounts.beneficiary;
    let field_worker = &mut ctx.accounts.field_worker;
    let config = &ctx.accounts.config;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    require!(
        beneficiary.verification_status != VerificationStatus::Verified,
        ErrorCode::AlreadyVerified
    );

    require!(!params.reason.is_empty(), ErrorCode::FlaggedReasonRequired);

    require!(
        params.reason.len() <= Beneficiary::MAX_FLAGGED_REASON_LEN,
        ErrorCode::StringTooLong
    );

    beneficiary.verification_status = VerificationStatus::Flagged;
    beneficiary.flagged_reason = Some(params.reason.clone());
    beneficiary.flagged_by = Some(ctx.accounts.field_worker_authority.key());
    beneficiary.flagged_at = Some(clock.unix_timestamp);

    field_worker.flags_raised = field_worker
        .flags_raised
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    field_worker.last_activity_at = clock.unix_timestamp;

    msg!("⚠ Beneficiary FLAGGED for review");
    msg!("Name: {}", beneficiary.name);
    msg!("Flagged by: {}", field_worker.name);
    msg!("Reason: {}", params.reason);
    msg!("Requires admin review");

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ReviewFlaggedBeneficiaryParams {
    pub approve: bool,
    pub notes: Option<String>,
}

#[derive(Accounts)]
#[instruction(beneficiary_authority: Pubkey, disaster_id: String)]
pub struct ReviewFlaggedBeneficiary<'info> {
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary_authority.as_ref(),
            disaster_id.as_bytes()
        ],
        bump = beneficiary.bump,
        constraint = beneficiary.verification_status == VerificationStatus::Flagged @ ErrorCode::InvalidStatusTransition
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
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::UnauthorizedAdmin
    )]
    pub config: Account<'info, PlatformConfig>,

    pub admin: Signer<'info>,
}

pub fn review_flagged_beneficiary_handler(
    ctx: Context<ReviewFlaggedBeneficiary>,
    _beneficiary_authority: Pubkey,
    _disaster_id: String,
    params: ReviewFlaggedBeneficiaryParams,
) -> Result<()> {
    let clock = Clock::get()?;

    let beneficiary = &mut ctx.accounts.beneficiary;
    let disaster = &mut ctx.accounts.disaster;

    if params.approve {
        beneficiary.verification_status = VerificationStatus::Pending;
        beneficiary.flagged_reason = None;
        beneficiary.flagged_by = None;
        beneficiary.flagged_at = None;

        msg!("✓ Flagged beneficiary APPROVED by admin");
        msg!("Status returned to: Pending");
        msg!("Beneficiary can now be verified by field workers");
    } else {
        beneficiary.verification_status = VerificationStatus::Rejected;

        msg!("✗ Flagged beneficiary REJECTED by admin");
        msg!("Beneficiary cannot receive aid");
    }

    if let Some(notes) = params.notes {
        beneficiary.admin_notes = Some(notes);
    }

    disaster.updated_at = clock.unix_timestamp;

    msg!("Name: {}", beneficiary.name);
    msg!("Reviewed at: {}", clock.unix_timestamp);

    Ok(())
}
