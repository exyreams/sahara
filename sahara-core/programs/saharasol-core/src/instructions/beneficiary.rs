use crate::errors::ErrorCode;
use crate::state::{
    ActivityLog, ActivityType, Beneficiary, DisasterEvent, FieldWorker, Location,
    NationalIdRegistry, PhoneRegistry, PlatformConfig, VerificationStatus,
};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RegisterBeneficiaryParams {
    pub disaster_id: String,
    pub name: String,
    pub phone_number: String,
    pub location: Location,
    pub family_size: u8,
    pub damage_severity: u8,
    pub ipfs_document_hash: String,
    pub household_id: Option<String>,
    pub national_id: String,
    pub age: u8,
    pub gender: String,
    pub occupation: String,
    pub damage_description: String,
    pub special_needs: String,
}

#[derive(Accounts)]
#[instruction(params: RegisterBeneficiaryParams, timestamp: i64)]
pub struct RegisterBeneficiary<'info> {
    #[account(
        init,
        payer = payer,
        space = Beneficiary::SPACE,
        seeds = [
            b"beneficiary",
            authority.key().as_ref(),
            params.disaster_id.as_bytes()
        ],
        bump
    )]
    pub beneficiary: Box<Account<'info, Beneficiary>>,

    #[account(
        mut,
        seeds = [b"disaster", params.disaster_id.as_bytes()],
        bump = disaster.bump,
        constraint = disaster.is_active @ ErrorCode::DisasterNotActive
    )]
    pub disaster: Box<Account<'info, DisasterEvent>>,

    #[account(
        mut,
        seeds = [b"field-worker", field_worker_authority.key().as_ref()],
        bump = field_worker.bump,
        constraint = field_worker.is_active @ ErrorCode::FieldWorkerNotActive
    )]
    pub field_worker: Box<Account<'info, FieldWorker>>,

    #[account(
        init,
        payer = payer,
        space = PhoneRegistry::SPACE,
        seeds = [
            b"phone-registry",
            params.disaster_id.as_bytes(),
            params.phone_number.as_bytes()
        ],
        bump
    )]
    pub phone_registry: Box<Account<'info, PhoneRegistry>>,

    #[account(
        init,
        payer = payer,
        space = NationalIdRegistry::SPACE,
        seeds = [
            b"national-id-registry",
            params.disaster_id.as_bytes(),
            params.national_id.as_bytes()
        ],
        bump
    )]
    pub national_id_registry: Box<Account<'info, NationalIdRegistry>>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, PlatformConfig>>,

    #[account(
        init,
        payer = payer,
        space = ActivityLog::SPACE,
        seeds = [
            b"activity",
            field_worker_authority.key().as_ref(),
            &timestamp.to_le_bytes()
        ],
        bump
    )]
    pub activity_log: Account<'info, ActivityLog>,

    pub authority: SystemAccount<'info>,

    pub field_worker_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, RegisterBeneficiary<'info>>,
    params: RegisterBeneficiaryParams,
    _timestamp: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    let beneficiary = &mut ctx.accounts.beneficiary;
    let disaster = &mut ctx.accounts.disaster;
    let field_worker = &mut ctx.accounts.field_worker;
    let phone_registry = &mut ctx.accounts.phone_registry;
    let national_id_registry = &mut ctx.accounts.national_id_registry;
    let config = &mut ctx.accounts.config;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    phone_registry.disaster_id = params.disaster_id.clone();
    phone_registry.phone_number = params.phone_number.clone();
    phone_registry.beneficiary = ctx.accounts.authority.key();
    phone_registry.registered_at = clock.unix_timestamp;
    phone_registry.bump = ctx.bumps.phone_registry;

    national_id_registry.disaster_id = params.disaster_id.clone();
    national_id_registry.national_id = params.national_id.clone();
    national_id_registry.beneficiary = ctx.accounts.authority.key();
    national_id_registry.registered_at = clock.unix_timestamp;
    national_id_registry.bump = ctx.bumps.national_id_registry;

    if let Some(ngo_key) = field_worker.ngo {
        let ngo_account = ctx
            .remaining_accounts
            .get(0)
            .ok_or(ErrorCode::ResourceNotFound)?;

        require!(ngo_account.key() == ngo_key, ErrorCode::InvalidAccountOwner);

        let ngo: Account<crate::state::NGO> = Account::try_from(ngo_account)?;

        require!(ngo.is_active, ErrorCode::NGONotActive);
        require!(!ngo.is_blacklisted, ErrorCode::NGOBlacklisted);
    }

    require!(
        params.disaster_id.len() <= Beneficiary::MAX_DISASTER_ID_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.name.len() <= Beneficiary::MAX_NAME_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.phone_number.len() <= Beneficiary::MAX_PHONE_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.ipfs_document_hash.len() <= Beneficiary::MAX_IPFS_HASH_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.national_id.len() <= Beneficiary::MAX_NATIONAL_ID_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.gender.len() <= Beneficiary::MAX_GENDER_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.occupation.len() <= Beneficiary::MAX_OCCUPATION_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.damage_description.len() <= Beneficiary::MAX_DAMAGE_DESC_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.special_needs.len() <= Beneficiary::MAX_SPECIAL_NEEDS_LEN,
        ErrorCode::StringTooLong
    );

    if let Some(ref household_id) = params.household_id {
        require!(
            household_id.len() <= Beneficiary::MAX_HOUSEHOLD_ID_LEN,
            ErrorCode::StringTooLong
        );
    }

    require!(
        params.family_size >= 1 && params.family_size <= 50,
        ErrorCode::InvalidFamilySize
    );

    require!(
        params.damage_severity >= 1 && params.damage_severity <= 10,
        ErrorCode::InvalidDamageSeverity
    );

    require!(params.age <= 150, ErrorCode::InvalidAge);

    require!(
        params.location.latitude >= -90.0 && params.location.latitude <= 90.0,
        ErrorCode::InvalidLocationCoordinates
    );

    require!(
        params.location.longitude >= -180.0 && params.location.longitude <= 180.0,
        ErrorCode::InvalidLocationCoordinates
    );

    beneficiary.authority = ctx.accounts.authority.key();
    beneficiary.disaster_id = params.disaster_id;
    beneficiary.name = params.name;
    beneficiary.phone_number = params.phone_number;
    beneficiary.location = params.location;
    beneficiary.family_size = params.family_size;
    beneficiary.damage_severity = params.damage_severity;
    beneficiary.verification_status = VerificationStatus::Pending;
    beneficiary.verifier_approvals = Vec::new();
    beneficiary.ipfs_document_hash = params.ipfs_document_hash;
    beneficiary.household_id = params.household_id;
    beneficiary.national_id = params.national_id;
    beneficiary.age = params.age;
    beneficiary.gender = params.gender;
    beneficiary.occupation = params.occupation;
    beneficiary.damage_description = params.damage_description;
    beneficiary.special_needs = params.special_needs;
    beneficiary.registered_by = ctx.accounts.field_worker_authority.key();

    beneficiary.registered_at = clock.unix_timestamp;
    beneficiary.verified_at = None;
    beneficiary.nft_mint = None;
    beneficiary.total_received = 0;

    beneficiary.flagged_reason = None;
    beneficiary.flagged_by = None;
    beneficiary.flagged_at = None;
    beneficiary.admin_notes = None;

    beneficiary.bump = ctx.bumps.beneficiary;

    disaster.total_beneficiaries = disaster
        .total_beneficiaries
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    disaster.updated_at = clock.unix_timestamp;

    field_worker.registrations_count = field_worker
        .registrations_count
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    field_worker.last_activity_at = clock.unix_timestamp;

    config.total_beneficiaries = config
        .total_beneficiaries
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::BeneficiaryRegistered;
    activity_log.actor = ctx.accounts.field_worker_authority.key();
    activity_log.target = beneficiary.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Beneficiary: {} | Disaster: {} | Family: {}",
        beneficiary.name, beneficiary.disaster_id, beneficiary.family_size
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Beneficiary registered successfully");
    msg!("Name: {}", beneficiary.name);
    msg!("Disaster: {}", beneficiary.disaster_id);
    msg!("Family size: {}", beneficiary.family_size);
    msg!("Damage severity: {}/10", beneficiary.damage_severity);
    msg!("Status: Pending verification");

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateBeneficiaryParams {
    pub name: Option<String>,
    pub phone_number: Option<String>,
    pub location: Option<Location>,
    pub family_size: Option<u8>,
    pub damage_severity: Option<u8>,
    pub age: Option<u8>,
    pub gender: Option<String>,
    pub occupation: Option<String>,
    pub ipfs_document_hash: Option<String>,
    pub damage_description: Option<String>,
    pub special_needs: Option<String>,
}

#[derive(Accounts)]
#[instruction(beneficiary_authority: Pubkey, disaster_id: String)]
pub struct UpdateBeneficiary<'info> {
    #[account(
        mut,
        seeds = [
            b"beneficiary",
            beneficiary_authority.as_ref(),
            disaster_id.as_bytes()
        ],
        bump = beneficiary.bump,
        constraint = beneficiary.registered_by == field_worker_authority.key() @ ErrorCode::UnauthorizedFieldWorker
    )]
    pub beneficiary: Account<'info, Beneficiary>,

    #[account(
        seeds = [b"field-worker", field_worker_authority.key().as_ref()],
        bump = field_worker.bump,
        constraint = field_worker.is_active @ ErrorCode::FieldWorkerNotActive
    )]
    pub field_worker: Account<'info, FieldWorker>,

    pub field_worker_authority: Signer<'info>,
}

pub fn update_beneficiary_handler(
    ctx: Context<UpdateBeneficiary>,
    _beneficiary_authority: Pubkey,
    _disaster_id: String,
    params: UpdateBeneficiaryParams,
) -> Result<()> {
    let beneficiary = &mut ctx.accounts.beneficiary;

    require!(
        beneficiary.verification_status != VerificationStatus::Flagged,
        ErrorCode::BeneficiaryFlagged
    );

    if let Some(name) = params.name {
        require!(
            name.len() <= Beneficiary::MAX_NAME_LEN,
            ErrorCode::StringTooLong
        );
        beneficiary.name = name;
        msg!("Beneficiary name updated");
    }

    if let Some(phone_number) = params.phone_number {
        require!(
            phone_number.len() <= Beneficiary::MAX_PHONE_LEN,
            ErrorCode::StringTooLong
        );
        beneficiary.phone_number = phone_number;
        msg!("Beneficiary phone number updated");
    }

    if let Some(location) = params.location {
        require!(
            location.latitude >= -90.0 && location.latitude <= 90.0,
            ErrorCode::InvalidLocationCoordinates
        );
        require!(
            location.longitude >= -180.0 && location.longitude <= 180.0,
            ErrorCode::InvalidLocationCoordinates
        );
        beneficiary.location = location;
        msg!("Beneficiary location updated");
    }

    if let Some(family_size) = params.family_size {
        require!(
            family_size >= 1 && family_size <= 50,
            ErrorCode::InvalidFamilySize
        );
        beneficiary.family_size = family_size;
        msg!("Beneficiary family size updated to: {}", family_size);
    }

    if let Some(damage_severity) = params.damage_severity {
        require!(
            damage_severity >= 1 && damage_severity <= 10,
            ErrorCode::InvalidDamageSeverity
        );
        beneficiary.damage_severity = damage_severity;
        msg!(
            "Beneficiary damage severity updated to: {}/10",
            damage_severity
        );
    }

    if let Some(age) = params.age {
        require!(age <= 150, ErrorCode::InvalidAge);
        beneficiary.age = age;
        msg!("Beneficiary age updated to: {}", age);
    }

    if let Some(gender) = params.gender {
        require!(
            gender.len() <= Beneficiary::MAX_GENDER_LEN,
            ErrorCode::StringTooLong
        );
        beneficiary.gender = gender;
        msg!("Beneficiary gender updated");
    }

    if let Some(occupation) = params.occupation {
        require!(
            occupation.len() <= Beneficiary::MAX_OCCUPATION_LEN,
            ErrorCode::StringTooLong
        );
        beneficiary.occupation = occupation;
        msg!("Beneficiary occupation updated");
    }

    if let Some(ipfs_hash) = params.ipfs_document_hash {
        require!(
            ipfs_hash.len() <= Beneficiary::MAX_IPFS_HASH_LEN,
            ErrorCode::StringTooLong
        );
        beneficiary.ipfs_document_hash = ipfs_hash;
        msg!("Beneficiary documents updated");
    }

    if let Some(damage_description) = params.damage_description {
        require!(
            damage_description.len() <= Beneficiary::MAX_DAMAGE_DESC_LEN,
            ErrorCode::StringTooLong
        );
        beneficiary.damage_description = damage_description;
        msg!("Beneficiary damage description updated");
    }

    if let Some(special_needs) = params.special_needs {
        require!(
            special_needs.len() <= Beneficiary::MAX_SPECIAL_NEEDS_LEN,
            ErrorCode::StringTooLong
        );
        beneficiary.special_needs = special_needs;
        msg!("Beneficiary special needs updated");
    }

    msg!("Beneficiary profile updated successfully");

    Ok(())
}
