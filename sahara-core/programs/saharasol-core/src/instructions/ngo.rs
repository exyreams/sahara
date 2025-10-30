use crate::errors::ErrorCode;
use crate::state::{ActivityLog, ActivityType, FieldWorker, PlatformConfig, NGO};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterNGOParams {
    pub name: String,
    pub registration_number: String,
    pub email: String,
    pub phone_number: String,
    pub website: String,
    pub description: String,
    pub address: String,
    pub verification_documents: String,
    pub operating_districts: Vec<String>,
    pub focus_areas: Vec<String>,
    pub contact_person_name: String,
    pub contact_person_role: String,
    pub bank_account_info: String,
    pub tax_id: String,
}

#[derive(Accounts)]
pub struct RegisterNGO<'info> {
    #[account(
        init,
        payer = authority,
        space = NGO::SPACE,
        seeds = [b"ngo", authority.key().as_ref()],
        bump
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterNGO>, params: RegisterNGOParams) -> Result<()> {
    let ngo = &mut ctx.accounts.ngo;
    let config = &mut ctx.accounts.config;
    let clock = Clock::get()?;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    require!(
        params.name.len() <= NGO::MAX_NAME_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.registration_number.len() <= NGO::MAX_REGISTRATION_NUMBER_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.email.len() <= NGO::MAX_EMAIL_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.phone_number.len() <= NGO::MAX_PHONE_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.website.len() <= NGO::MAX_WEBSITE_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.description.len() <= NGO::MAX_DESCRIPTION_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.address.len() <= NGO::MAX_ADDRESS_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.verification_documents.len() <= NGO::MAX_VERIFICATION_DOCS_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.operating_districts.len() <= NGO::MAX_DISTRICTS,
        ErrorCode::VectorTooLong
    );

    require!(
        params.focus_areas.len() <= NGO::MAX_FOCUS_AREAS,
        ErrorCode::VectorTooLong
    );

    require!(
        params.contact_person_name.len() <= NGO::MAX_CONTACT_NAME_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.contact_person_role.len() <= NGO::MAX_CONTACT_ROLE_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.bank_account_info.len() <= NGO::MAX_BANK_INFO_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.tax_id.len() <= NGO::MAX_TAX_ID_LEN,
        ErrorCode::StringTooLong
    );

    for district in &params.operating_districts {
        require!(
            district.len() <= NGO::MAX_DISTRICT_NAME_LEN,
            ErrorCode::StringTooLong
        );
    }

    for area in &params.focus_areas {
        require!(
            area.len() <= NGO::MAX_FOCUS_AREA_LEN,
            ErrorCode::StringTooLong
        );
    }

    ngo.authority = ctx.accounts.authority.key();
    ngo.name = params.name;
    ngo.registration_number = params.registration_number;
    ngo.email = params.email;
    ngo.phone_number = params.phone_number;
    ngo.website = params.website;
    ngo.description = params.description;
    ngo.address = params.address;
    ngo.is_verified = false;
    ngo.is_active = true;
    ngo.verification_documents = params.verification_documents;
    ngo.operating_districts = params.operating_districts;
    ngo.focus_areas = params.focus_areas;
    ngo.contact_person_name = params.contact_person_name;
    ngo.contact_person_role = params.contact_person_role;
    ngo.bank_account_info = params.bank_account_info;
    ngo.tax_id = params.tax_id;

    ngo.field_workers_count = 0;
    ngo.beneficiaries_registered = 0;
    ngo.pools_created = 0;
    ngo.total_aid_distributed = 0;

    ngo.registered_at = clock.unix_timestamp;
    ngo.verified_at = None;
    ngo.verified_by = None;
    ngo.last_activity_at = clock.unix_timestamp;
    ngo.notes = String::new();
    ngo.bump = ctx.bumps.ngo;

    config.total_ngos = config
        .total_ngos
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    msg!("NGO registered successfully");
    msg!("Name: {}", ngo.name);
    msg!("Registration number: {}", ngo.registration_number);
    msg!("Awaiting admin verification");

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterFieldWorkerParams {
    pub name: String,
    pub organization: String,
    pub phone_number: String,
    pub email: String,
    pub assigned_districts: Vec<String>,
    pub credentials: String,
}

#[derive(Accounts)]
pub struct RegisterFieldWorker<'info> {
    #[account(
        init,
        payer = payer,
        space = FieldWorker::SPACE,
        seeds = [b"field-worker", authority.key().as_ref()],
        bump
    )]
    pub field_worker: Account<'info, FieldWorker>,

    #[account(
        mut,
        seeds = [b"ngo", ngo_authority.key().as_ref()],
        bump = ngo.bump,
        constraint = ngo.is_active @ ErrorCode::NGONotActive,
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

    pub authority: SystemAccount<'info>,

    pub ngo_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_field_worker_handler(
    ctx: Context<RegisterFieldWorker>,
    params: RegisterFieldWorkerParams,
) -> Result<()> {
    let clock = Clock::get()?;

    let ngo_key = ctx.accounts.ngo.key();
    let ngo_name = ctx.accounts.ngo.name.clone();

    let field_worker = &mut ctx.accounts.field_worker;
    let ngo = &mut ctx.accounts.ngo;
    let config = &mut ctx.accounts.config;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    require!(ngo.is_active, ErrorCode::NGONotActive);
    require!(!ngo.is_blacklisted, ErrorCode::NGOBlacklisted);

    require!(
        params.name.len() <= FieldWorker::MAX_NAME_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.organization.len() <= FieldWorker::MAX_ORGANIZATION_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.phone_number.len() <= FieldWorker::MAX_PHONE_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.email.len() <= FieldWorker::MAX_EMAIL_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.assigned_districts.len() <= FieldWorker::MAX_DISTRICTS,
        ErrorCode::VectorTooLong
    );

    require!(
        params.credentials.len() <= FieldWorker::MAX_CREDENTIALS_LEN,
        ErrorCode::StringTooLong
    );

    for district in &params.assigned_districts {
        require!(
            district.len() <= FieldWorker::MAX_DISTRICT_NAME_LEN,
            ErrorCode::StringTooLong
        );
    }

    field_worker.authority = ctx.accounts.authority.key();
    field_worker.name = params.name;
    field_worker.organization = params.organization;
    field_worker.ngo = Some(ngo_key);
    field_worker.phone_number = params.phone_number;
    field_worker.email = params.email;
    field_worker.is_active = true;
    field_worker.assigned_districts = params.assigned_districts;
    field_worker.credentials = params.credentials;

    field_worker.verifications_count = 0;
    field_worker.registrations_count = 0;
    field_worker.flags_raised = 0;

    field_worker.registered_at = clock.unix_timestamp;
    field_worker.activated_at = Some(clock.unix_timestamp);
    field_worker.deactivated_at = None;
    field_worker.last_activity_at = clock.unix_timestamp;
    field_worker.registered_by = ctx.accounts.ngo_authority.key();
    field_worker.notes = String::new();
    field_worker.bump = ctx.bumps.field_worker;

    ngo.field_workers_count = ngo
        .field_workers_count
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    ngo.last_activity_at = clock.unix_timestamp;

    config.total_field_workers = config
        .total_field_workers
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    msg!("Field worker registered successfully");
    msg!("Name: {}", field_worker.name);
    msg!("Organization: {}", field_worker.organization);
    msg!("Registered by NGO: {}", ngo_name);

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateFieldWorkerStatusParams {
    pub is_active: bool,
    pub notes: Option<String>,
}

#[derive(Accounts)]
pub struct UpdateFieldWorkerStatus<'info> {
    #[account(
        mut,
        seeds = [b"field-worker", field_worker.authority.as_ref()],
        bump = field_worker.bump,
    )]
    pub field_worker: Account<'info, FieldWorker>,

    #[account(
        seeds = [b"ngo", ngo_authority.key().as_ref()],
        bump = ngo.bump,
        constraint = Some(ngo.key()) == field_worker.ngo @ ErrorCode::UnauthorizedNGO
    )]
    pub ngo: Account<'info, NGO>,

    pub ngo_authority: Signer<'info>,
}

pub fn update_field_worker_status_handler(
    ctx: Context<UpdateFieldWorkerStatus>,
    params: UpdateFieldWorkerStatusParams,
) -> Result<()> {
    let field_worker = &mut ctx.accounts.field_worker;
    let clock = Clock::get()?;

    if let Some(ref notes) = params.notes {
        require!(
            notes.len() <= FieldWorker::MAX_NOTES_LEN,
            ErrorCode::StringTooLong
        );
        field_worker.notes = notes.clone();
    }

    if params.is_active != field_worker.is_active {
        field_worker.is_active = params.is_active;

        if params.is_active {
            field_worker.activated_at = Some(clock.unix_timestamp);
            field_worker.deactivated_at = None;
            msg!("Field worker activated");
        } else {
            field_worker.deactivated_at = Some(clock.unix_timestamp);
            msg!("Field worker deactivated");
        }
    }

    field_worker.last_activity_at = clock.unix_timestamp;

    msg!("Field worker status updated successfully");
    msg!("Name: {}", field_worker.name);
    msg!("Active: {}", field_worker.is_active);

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateNGOParams {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone_number: Option<String>,
    pub website: Option<String>,
    pub description: Option<String>,
    pub address: Option<String>,
    pub verification_documents: Option<String>,
    pub operating_districts: Option<Vec<String>>,
    pub focus_areas: Option<Vec<String>>,
    pub contact_person_name: Option<String>,
    pub contact_person_role: Option<String>,
    pub bank_account_info: Option<String>,
    pub tax_id: Option<String>,
}

#[derive(Accounts)]
#[instruction(params: UpdateNGOParams, timestamp: i64)]
pub struct UpdateNGO<'info> {
    #[account(
        mut,
        seeds = [b"ngo", authority.key().as_ref()],
        bump = ngo.bump,
        has_one = authority @ ErrorCode::UnauthorizedNGO,
    )]
    pub ngo: Account<'info, NGO>,

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

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn update_ngo_handler(
    ctx: Context<UpdateNGO>,
    params: UpdateNGOParams,
    _timestamp: i64,
) -> Result<()> {
    let ngo = &mut ctx.accounts.ngo;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    let was_verified = ngo.is_verified;
    let mut changes_made = false;

    if let Some(name) = params.name {
        require!(name.len() <= NGO::MAX_NAME_LEN, ErrorCode::StringTooLong);
        ngo.name = name;
        changes_made = true;
    }

    if let Some(email) = params.email {
        require!(email.len() <= NGO::MAX_EMAIL_LEN, ErrorCode::StringTooLong);
        ngo.email = email;
        changes_made = true;
    }

    if let Some(phone_number) = params.phone_number {
        require!(
            phone_number.len() <= NGO::MAX_PHONE_LEN,
            ErrorCode::StringTooLong
        );
        ngo.phone_number = phone_number;
        changes_made = true;
    }

    if let Some(website) = params.website {
        require!(
            website.len() <= NGO::MAX_WEBSITE_LEN,
            ErrorCode::StringTooLong
        );
        ngo.website = website;
        changes_made = true;
    }

    if let Some(description) = params.description {
        require!(
            description.len() <= NGO::MAX_DESCRIPTION_LEN,
            ErrorCode::StringTooLong
        );
        ngo.description = description;
        changes_made = true;
    }

    if let Some(address) = params.address {
        require!(
            address.len() <= NGO::MAX_ADDRESS_LEN,
            ErrorCode::StringTooLong
        );
        ngo.address = address;
        changes_made = true;
    }

    if let Some(verification_documents) = params.verification_documents {
        require!(
            verification_documents.len() <= NGO::MAX_VERIFICATION_DOCS_LEN,
            ErrorCode::StringTooLong
        );
        ngo.verification_documents = verification_documents;
        changes_made = true;
    }

    if let Some(operating_districts) = params.operating_districts {
        require!(
            operating_districts.len() <= NGO::MAX_DISTRICTS,
            ErrorCode::VectorTooLong
        );
        ngo.operating_districts = operating_districts;
        changes_made = true;
    }

    if let Some(focus_areas) = params.focus_areas {
        require!(
            focus_areas.len() <= NGO::MAX_FOCUS_AREAS,
            ErrorCode::VectorTooLong
        );
        ngo.focus_areas = focus_areas;
        changes_made = true;
    }

    if let Some(contact_person_name) = params.contact_person_name {
        require!(
            contact_person_name.len() <= NGO::MAX_CONTACT_NAME_LEN,
            ErrorCode::StringTooLong
        );
        ngo.contact_person_name = contact_person_name;
        changes_made = true;
    }

    if let Some(contact_person_role) = params.contact_person_role {
        require!(
            contact_person_role.len() <= NGO::MAX_CONTACT_ROLE_LEN,
            ErrorCode::StringTooLong
        );
        ngo.contact_person_role = contact_person_role;
        changes_made = true;
    }

    if let Some(bank_account_info) = params.bank_account_info {
        require!(
            bank_account_info.len() <= NGO::MAX_BANK_INFO_LEN,
            ErrorCode::StringTooLong
        );
        ngo.bank_account_info = bank_account_info;
        changes_made = true;
    }

    if let Some(tax_id) = params.tax_id {
        require!(
            tax_id.len() <= NGO::MAX_TAX_ID_LEN,
            ErrorCode::StringTooLong
        );
        ngo.tax_id = tax_id;
        changes_made = true;
    }

    if changes_made && was_verified {
        ngo.is_verified = false;
        ngo.verified_at = None;
        msg!("NGO verification removed due to profile update. Admin must re-verify.");
    }

    ngo.last_activity_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::NGOUpdated;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = ngo.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = if was_verified && !ngo.is_verified {
        format!(
            "NGO: {} | Verification removed - requires admin re-verification",
            ngo.name
        )
    } else {
        format!("NGO: {} | Profile updated", ngo.name)
    };
    activity_log.bump = ctx.bumps.activity_log;

    msg!("NGO profile updated successfully");
    msg!("NGO: {}", ngo.name);
    if was_verified && !ngo.is_verified {
        msg!("Verification status: Removed (requires admin re-verification)");
    }

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateFieldWorkerParams {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone_number: Option<String>,
    pub organization: Option<String>,
    pub notes: Option<String>,
}

#[derive(Accounts)]
#[instruction(params: UpdateFieldWorkerParams, timestamp: i64)]
pub struct UpdateFieldWorker<'info> {
    #[account(
        mut,
        constraint = field_worker.ngo == Some(ngo.key()) @ ErrorCode::UnauthorizedFieldWorker,
    )]
    pub field_worker: Account<'info, FieldWorker>,

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

    #[account(
        seeds = [b"ngo", ngo_authority.key().as_ref()],
        bump = ngo.bump,
        has_one = authority @ ErrorCode::UnauthorizedNGO,
    )]
    pub ngo: Account<'info, NGO>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

    /// CHECK: This is the NGO authority pubkey, validated through the ngo account's seeds (Don't Remove this comment)
    pub ngo_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn update_field_worker_handler(
    ctx: Context<UpdateFieldWorker>,
    params: UpdateFieldWorkerParams,
    _timestamp: i64,
) -> Result<()> {
    let field_worker = &mut ctx.accounts.field_worker;
    let config = &ctx.accounts.config;
    let clock = Clock::get()?;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    if let Some(name) = params.name {
        require!(
            name.len() <= FieldWorker::MAX_NAME_LEN,
            ErrorCode::StringTooLong
        );
        field_worker.name = name;
    }

    if let Some(email) = params.email {
        require!(
            email.len() <= FieldWorker::MAX_EMAIL_LEN,
            ErrorCode::StringTooLong
        );
        field_worker.email = email;
    }

    if let Some(phone_number) = params.phone_number {
        require!(
            phone_number.len() <= FieldWorker::MAX_PHONE_LEN,
            ErrorCode::StringTooLong
        );
        field_worker.phone_number = phone_number;
    }

    if let Some(organization) = params.organization {
        require!(
            organization.len() <= FieldWorker::MAX_ORGANIZATION_LEN,
            ErrorCode::StringTooLong
        );
        field_worker.organization = organization;
    }

    if let Some(notes) = params.notes {
        require!(
            notes.len() <= FieldWorker::MAX_NOTES_LEN,
            ErrorCode::StringTooLong
        );
        field_worker.notes = notes;
    }

    field_worker.last_activity_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::FieldWorkerUpdated;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = field_worker.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Field Worker: {} | NGO: {} | Profile updated",
        field_worker.name, ctx.accounts.ngo.name
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Field worker profile updated successfully");
    msg!("Field worker: {}", field_worker.name);
    msg!("NGO: {}", ctx.accounts.ngo.name);

    Ok(())
}
