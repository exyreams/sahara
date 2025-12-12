use crate::errors::ErrorCode;
use crate::state::{
    ActivityLog, ActivityType, DisasterEvent, DisasterType, Location, PlatformConfig, NGO,
};
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeDisasterParams {
    pub event_id: String,
    pub name: String,
    pub event_type: DisasterType,
    pub location: Location,
    pub severity: u8,
    pub affected_areas: Vec<String>,
    pub description: String,
    pub estimated_affected_population: u32,
}

#[derive(Accounts)]
#[instruction(params: InitializeDisasterParams, timestamp: i64)]
pub struct InitializeDisaster<'info> {
    #[account(
        init,
        payer = authority,
        space = DisasterEvent::SPACE,
        seeds = [b"disaster", params.event_id.as_bytes()],
        bump
    )]
    pub disaster: Account<'info, DisasterEvent>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PlatformConfig>,

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

pub fn handler(
    ctx: Context<InitializeDisaster>,
    params: InitializeDisasterParams,
    _timestamp: i64,
) -> Result<()> {
    let disaster = &mut ctx.accounts.disaster;
    let config = &mut ctx.accounts.config;
    let clock = Clock::get()?;

    require!(!config.is_paused, ErrorCode::PlatformPaused);

    let is_admin = ctx.accounts.authority.key() == config.admin;
    let mut is_verified_ngo = false;

    if !is_admin {
        let (ngo_pda, _) = Pubkey::find_program_address(
            &[b"ngo", ctx.accounts.authority.key().as_ref()],
            ctx.program_id,
        );

        if !ctx.remaining_accounts.is_empty() {
            let ngo_account_info = &ctx.remaining_accounts[0];
            if ngo_account_info.key() == ngo_pda {
                require!(
                    ngo_account_info.owner == ctx.program_id,
                    ErrorCode::UnauthorizedDisasterCreation
                );

                let ngo_data = ngo_account_info.try_borrow_data()?;

                let ngo = NGO::try_deserialize(&mut &ngo_data[..])?;
                is_verified_ngo = ngo.is_verified && ngo.is_active && !ngo.is_blacklisted;
            }
        }
    }

    require!(
        is_admin || is_verified_ngo,
        ErrorCode::UnauthorizedDisasterCreation
    );

    require!(
        params.event_id.len() <= DisasterEvent::MAX_EVENT_ID_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.name.len() <= DisasterEvent::MAX_NAME_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.description.len() <= DisasterEvent::MAX_DESCRIPTION_LEN,
        ErrorCode::StringTooLong
    );

    require!(
        params.severity >= 1 && params.severity <= 10,
        ErrorCode::InvalidDisasterSeverity
    );

    require!(
        params.affected_areas.len() <= DisasterEvent::MAX_AFFECTED_AREAS,
        ErrorCode::VectorTooLong
    );

    for area in &params.affected_areas {
        require!(
            area.len() <= DisasterEvent::MAX_AREA_NAME_LEN,
            ErrorCode::StringTooLong
        );
    }

    // Validate location fields
    require!(
        params.location.country.len() <= Location::MAX_COUNTRY_LEN
            && !params.location.country.is_empty(),
        ErrorCode::InvalidLocationData
    );

    require!(
        params.location.region.len() <= Location::MAX_REGION_LEN
            && !params.location.region.is_empty(),
        ErrorCode::InvalidLocationData
    );

    require!(
        params.location.city.len() <= Location::MAX_CITY_LEN && !params.location.city.is_empty(),
        ErrorCode::InvalidLocationData
    );

    require!(
        params.location.area.len() <= Location::MAX_AREA_LEN,
        ErrorCode::InvalidLocationData
    );

    require!(
        params.location.latitude >= -90.0 && params.location.latitude <= 90.0,
        ErrorCode::InvalidLocationCoordinates
    );

    require!(
        params.location.longitude >= -180.0 && params.location.longitude <= 180.0,
        ErrorCode::InvalidLocationCoordinates
    );

    disaster.event_id = params.event_id.clone();
    disaster.name = params.name;
    disaster.event_type = params.event_type;
    disaster.declared_at = clock.unix_timestamp;
    disaster.location = params.location;
    disaster.severity = params.severity;
    disaster.is_active = true;
    disaster.authority = ctx.accounts.authority.key();
    disaster.affected_areas = params.affected_areas;
    disaster.description = params.description;
    disaster.estimated_affected_population = params.estimated_affected_population;

    disaster.total_beneficiaries = 0;
    disaster.verified_beneficiaries = 0;
    disaster.total_aid_distributed = 0;

    disaster.created_at = clock.unix_timestamp;
    disaster.updated_at = clock.unix_timestamp;
    disaster.bump = ctx.bumps.disaster;

    config.total_disasters = config
        .total_disasters
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    config.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::DisasterCreated;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = disaster.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Disaster: {} | Severity: {} | Affected: {}",
        disaster.name, disaster.severity, disaster.estimated_affected_population
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Disaster event initialized successfully");
    msg!("Event ID: {}", disaster.event_id);
    msg!("Name: {}", disaster.name);
    msg!("Severity: {}/10", disaster.severity);
    msg!(
        "Estimated affected: {}",
        disaster.estimated_affected_population
    );

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateDisasterParams {
    pub name: Option<String>,
    pub severity: Option<u8>,
    pub is_active: Option<bool>,
    pub affected_areas: Option<Vec<String>>,
    pub description: Option<String>,
    pub estimated_affected_population: Option<u32>,
}

#[derive(Accounts)]
#[instruction(event_id: String, timestamp: i64)]
pub struct UpdateDisaster<'info> {
    #[account(
        mut,
        seeds = [b"disaster", event_id.as_bytes()],
        bump = disaster.bump,
        constraint = disaster.authority == authority.key() @ ErrorCode::UnauthorizedModification
    )]
    pub disaster: Account<'info, DisasterEvent>,

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

pub fn update_disaster_handler(
    ctx: Context<UpdateDisaster>,
    _event_id: String,
    _timestamp: i64,
    params: UpdateDisasterParams,
) -> Result<()> {
    let disaster = &mut ctx.accounts.disaster;
    let clock = Clock::get()?;

    if let Some(name) = params.name {
        require!(
            name.len() <= DisasterEvent::MAX_NAME_LEN,
            ErrorCode::StringTooLong
        );
        disaster.name = name;
        msg!("Disaster name updated");
    }

    if let Some(severity) = params.severity {
        require!(
            severity >= 1 && severity <= 10,
            ErrorCode::InvalidDisasterSeverity
        );
        disaster.severity = severity;
        msg!("Disaster severity updated to: {}/10", severity);
    }

    if let Some(is_active) = params.is_active {
        disaster.is_active = is_active;
        msg!("Disaster active status updated to: {}", is_active);
    }

    if let Some(affected_areas) = params.affected_areas {
        require!(
            affected_areas.len() <= DisasterEvent::MAX_AFFECTED_AREAS,
            ErrorCode::VectorTooLong
        );

        for area in &affected_areas {
            require!(
                area.len() <= DisasterEvent::MAX_AREA_NAME_LEN,
                ErrorCode::StringTooLong
            );
        }

        disaster.affected_areas = affected_areas;
        msg!("Disaster affected areas updated");
    }

    if let Some(description) = params.description {
        require!(
            description.len() <= DisasterEvent::MAX_DESCRIPTION_LEN,
            ErrorCode::StringTooLong
        );
        disaster.description = description;
        msg!("Disaster description updated");
    }

    if let Some(population) = params.estimated_affected_population {
        disaster.estimated_affected_population = population;
        msg!("Estimated affected population updated to: {}", population);
    }

    disaster.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::DisasterUpdated;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = disaster.key();
    activity_log.amount = None;
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!("Disaster: {} | Updated", disaster.name);
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Disaster event updated successfully");

    Ok(())
}

#[derive(Accounts)]
#[instruction(event_id: String, timestamp: i64)]
pub struct CloseDisaster<'info> {
    #[account(
        mut,
        seeds = [b"disaster", event_id.as_bytes()],
        bump = disaster.bump,
        constraint = disaster.authority == authority.key() @ ErrorCode::UnauthorizedModification
    )]
    pub disaster: Account<'info, DisasterEvent>,

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

pub fn close_disaster_handler(
    ctx: Context<CloseDisaster>,
    _event_id: String,
    _timestamp: i64,
) -> Result<()> {
    let disaster = &mut ctx.accounts.disaster;
    let clock = Clock::get()?;

    require!(disaster.is_active, ErrorCode::DisasterNotActive);

    disaster.is_active = false;
    disaster.updated_at = clock.unix_timestamp;

    let activity_log = &mut ctx.accounts.activity_log;
    activity_log.action_type = ActivityType::DisasterClosed;
    activity_log.actor = ctx.accounts.authority.key();
    activity_log.target = disaster.key();
    activity_log.amount = Some(disaster.total_aid_distributed);
    activity_log.timestamp = clock.unix_timestamp;
    activity_log.metadata = format!(
        "Disaster: {} | Beneficiaries: {} | Aid: {}",
        disaster.name, disaster.total_beneficiaries, disaster.total_aid_distributed
    );
    activity_log.bump = ctx.bumps.activity_log;

    msg!("Disaster event closed successfully");
    msg!("Event ID: {}", disaster.event_id);
    msg!("Total beneficiaries: {}", disaster.total_beneficiaries);
    msg!(
        "Verified beneficiaries: {}",
        disaster.verified_beneficiaries
    );
    msg!("Total aid distributed: {}", disaster.total_aid_distributed);

    Ok(())
}
