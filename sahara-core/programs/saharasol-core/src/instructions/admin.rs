use crate::errors::ErrorCode;
use crate::state::{AdminAction, AdminActionType, PlatformConfig, NGO};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct VerifyNGOParams {
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(ngo_authority: Pubkey, params: VerifyNGOParams, action_id: u64)]
pub struct VerifyNGO<'info> {
    #[account(
        mut,
        seeds = [b"ngo", ngo_authority.as_ref()],
        bump = ngo.bump,
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
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
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn verify_ngo_handler(
    ctx: Context<VerifyNGO>,
    _ngo_authority: Pubkey,
    params: VerifyNGOParams,
    _action_id: u64,
) -> Result<()> {
    let ngo = &mut ctx.accounts.ngo;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    require!(!ngo.is_blacklisted, ErrorCode::NGOBlacklisted);

    ngo.is_verified = true;
    ngo.verified_at = Some(clock.unix_timestamp);
    ngo.verified_by = Some(ctx.accounts.admin.key());
    ngo.last_activity_at = clock.unix_timestamp;

    admin_action.action_type = AdminActionType::VerifyNGO;
    admin_action.target = ngo.key();
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = String::new();
    admin_action.bump = ctx.bumps.admin_action;

    msg!("NGO verified successfully");
    msg!("NGO: {}", ngo.name);
    msg!("Admin: {}", ctx.accounts.admin.key());

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RevokeVerificationParams {
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(ngo_authority: Pubkey, params: RevokeVerificationParams, action_id: u64)]
pub struct RevokeVerification<'info> {
    #[account(
        mut,
        seeds = [b"ngo", ngo_authority.as_ref()],
        bump = ngo.bump,
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
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
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn revoke_verification_handler(
    ctx: Context<RevokeVerification>,
    _ngo_authority: Pubkey,
    params: RevokeVerificationParams,
    _action_id: u64,
) -> Result<()> {
    let ngo = &mut ctx.accounts.ngo;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    ngo.is_verified = false;
    ngo.verified_at = None;
    ngo.verified_by = None;
    ngo.last_activity_at = clock.unix_timestamp;

    admin_action.action_type = AdminActionType::RevokeVerification;
    admin_action.target = ngo.key();
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = String::new();
    admin_action.bump = ctx.bumps.admin_action;

    msg!("NGO verification revoked");
    msg!("NGO: {}", ngo.name);
    msg!("Admin: {}", ctx.accounts.admin.key());

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateNGOStatusParams {
    pub is_active: bool,
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(ngo_authority: Pubkey, params: UpdateNGOStatusParams, action_id: u64)]
pub struct UpdateNGOStatus<'info> {
    #[account(
        mut,
        seeds = [b"ngo", ngo_authority.as_ref()],
        bump = ngo.bump,
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
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
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn update_ngo_status_handler(
    ctx: Context<UpdateNGOStatus>,
    _ngo_authority: Pubkey,
    params: UpdateNGOStatusParams,
    _action_id: u64,
) -> Result<()> {
    let ngo = &mut ctx.accounts.ngo;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    ngo.is_active = params.is_active;
    ngo.last_activity_at = clock.unix_timestamp;

    admin_action.action_type = if params.is_active {
        AdminActionType::ActivateNGO
    } else {
        AdminActionType::DeactivateNGO
    };
    admin_action.target = ngo.key();
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = String::new();
    admin_action.bump = ctx.bumps.admin_action;

    msg!(
        "NGO status updated to: {}",
        if params.is_active {
            "active"
        } else {
            "inactive"
        }
    );
    msg!("NGO: {}", ngo.name);

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct BlacklistNGOParams {
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(ngo_authority: Pubkey, params: BlacklistNGOParams, action_id: u64)]
pub struct BlacklistNGO<'info> {
    #[account(
        mut,
        seeds = [b"ngo", ngo_authority.as_ref()],
        bump = ngo.bump,
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
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
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn blacklist_ngo_handler(
    ctx: Context<BlacklistNGO>,
    _ngo_authority: Pubkey,
    params: BlacklistNGOParams,
    _action_id: u64,
) -> Result<()> {
    let ngo = &mut ctx.accounts.ngo;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    require!(!params.reason.is_empty(), ErrorCode::InvalidInput);

    ngo.is_blacklisted = true;
    ngo.blacklist_reason = params.reason.clone();
    ngo.blacklisted_at = Some(clock.unix_timestamp);
    ngo.blacklisted_by = Some(ctx.accounts.admin.key());
    ngo.is_active = false;
    ngo.last_activity_at = clock.unix_timestamp;

    admin_action.action_type = AdminActionType::BlacklistNGO;
    admin_action.target = ngo.key();
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = String::new();
    admin_action.bump = ctx.bumps.admin_action;

    msg!("NGO blacklisted");
    msg!("NGO: {}", ngo.name);

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RemoveBlacklistParams {
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(ngo_authority: Pubkey, params: RemoveBlacklistParams, action_id: u64)]
pub struct RemoveBlacklist<'info> {
    #[account(
        mut,
        seeds = [b"ngo", ngo_authority.as_ref()],
        bump = ngo.bump,
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
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
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn remove_blacklist_handler(
    ctx: Context<RemoveBlacklist>,
    _ngo_authority: Pubkey,
    params: RemoveBlacklistParams,
    _action_id: u64,
) -> Result<()> {
    let ngo = &mut ctx.accounts.ngo;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    ngo.is_blacklisted = false;
    ngo.blacklist_reason = String::new();
    ngo.blacklisted_at = None;
    ngo.blacklisted_by = None;
    ngo.last_activity_at = clock.unix_timestamp;

    admin_action.action_type = AdminActionType::RemoveBlacklist;
    admin_action.target = ngo.key();
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = String::new();
    admin_action.bump = ctx.bumps.admin_action;

    msg!("NGO blacklist removed");
    msg!("NGO: {}", ngo.name);

    Ok(())
}

// NOTE: Batch functions removed - use bundled transactions on frontend instead
// Frontend should bundle up to 5 verifyNgo/updateNgoStatus instructions per transaction
// This preserves AdminAction audit trail while reducing wallet popups

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitiateAdminTransferParams {
    pub new_admin: Pubkey,
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(params: InitiateAdminTransferParams, action_id: u64)]
pub struct InitiateAdminTransfer<'info> {
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
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initiate_admin_transfer_handler(
    ctx: Context<InitiateAdminTransfer>,
    params: InitiateAdminTransferParams,
    _action_id: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        config.pending_admin.is_none(),
        ErrorCode::TransferAlreadyPending
    );

    require!(
        params.new_admin != ctx.accounts.admin.key(),
        ErrorCode::InvalidInput
    );

    config.pending_admin = Some(params.new_admin);
    config.admin_transfer_initiated_at = Some(clock.unix_timestamp);
    config.updated_at = clock.unix_timestamp;

    admin_action.action_type = AdminActionType::InitiateAdminTransfer;
    admin_action.target = params.new_admin;
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = String::new();
    admin_action.bump = ctx.bumps.admin_action;

    msg!("Admin transfer initiated");
    msg!("Current admin: {}", ctx.accounts.admin.key());
    msg!("Pending admin: {}", params.new_admin);
    msg!("Expires in: {} seconds", config.admin_transfer_timeout);

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AcceptAdminTransferParams {
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(params: AcceptAdminTransferParams, action_id: u64)]
pub struct AcceptAdminTransfer<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = new_admin,
        space = AdminAction::SPACE,
        seeds = [
            b"admin-action",
            new_admin.key().as_ref(),
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub new_admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn accept_admin_transfer_handler(
    ctx: Context<AcceptAdminTransfer>,
    params: AcceptAdminTransferParams,
    _action_id: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    require!(config.pending_admin.is_some(), ErrorCode::NoTransferPending);

    require!(
        config.pending_admin.unwrap() == ctx.accounts.new_admin.key(),
        ErrorCode::NotPendingAdmin
    );

    let initiated_at = config.admin_transfer_initiated_at.unwrap();
    let elapsed = clock.unix_timestamp - initiated_at;
    require!(
        elapsed <= config.admin_transfer_timeout,
        ErrorCode::TransferExpired
    );

    let old_admin = config.admin;

    config.admin = ctx.accounts.new_admin.key();
    config.pending_admin = None;
    config.admin_transfer_initiated_at = None;
    config.updated_at = clock.unix_timestamp;

    admin_action.action_type = AdminActionType::AcceptAdminTransfer;
    admin_action.target = old_admin;
    admin_action.admin = ctx.accounts.new_admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = format!("Previous admin: {}", old_admin);
    admin_action.bump = ctx.bumps.admin_action;

    msg!("Admin transfer completed");
    msg!("Previous admin: {}", old_admin);
    msg!("New admin: {}", ctx.accounts.new_admin.key());

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CancelAdminTransferParams {
    pub reason: String,
}

#[derive(Accounts)]
#[instruction(params: CancelAdminTransferParams, action_id: u64)]
pub struct CancelAdminTransfer<'info> {
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
            &action_id.to_le_bytes()
        ],
        bump
    )]
    pub admin_action: Account<'info, AdminAction>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn cancel_admin_transfer_handler(
    ctx: Context<CancelAdminTransfer>,
    params: CancelAdminTransferParams,
    _action_id: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let admin_action = &mut ctx.accounts.admin_action;
    let clock = Clock::get()?;

    require!(
        params.reason.len() <= AdminAction::MAX_REASON_LEN,
        ErrorCode::StringTooLong
    );

    require!(config.pending_admin.is_some(), ErrorCode::NoTransferPending);

    let pending_admin = config.pending_admin.unwrap();

    config.pending_admin = None;
    config.admin_transfer_initiated_at = None;
    config.updated_at = clock.unix_timestamp;

    admin_action.action_type = AdminActionType::CancelAdminTransfer;
    admin_action.target = pending_admin;
    admin_action.admin = ctx.accounts.admin.key();
    admin_action.reason = params.reason;
    admin_action.timestamp = clock.unix_timestamp;
    admin_action.metadata = String::new();
    admin_action.bump = ctx.bumps.admin_action;

    msg!("Admin transfer cancelled");
    msg!("Pending admin was: {}", pending_admin);

    Ok(())
}
