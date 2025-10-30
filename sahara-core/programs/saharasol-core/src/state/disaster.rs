use crate::state::{DisasterType, Location};
use anchor_lang::prelude::*;

#[account]
pub struct DisasterEvent {
    pub event_id: String,
    pub name: String,
    pub event_type: DisasterType,
    pub declared_at: i64,
    pub location: Location,
    pub severity: u8,
    pub is_active: bool,
    pub authority: Pubkey,
    pub affected_areas: Vec<String>,
    pub description: String,
    pub estimated_affected_population: u32,
    pub total_beneficiaries: u32,
    pub verified_beneficiaries: u32,
    pub total_aid_distributed: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl DisasterEvent {
    pub const MAX_EVENT_ID_LEN: usize = 50;
    pub const MAX_NAME_LEN: usize = 100;
    pub const MAX_DESCRIPTION_LEN: usize = 500;
    pub const MAX_AFFECTED_AREAS: usize = 20;
    pub const MAX_AREA_NAME_LEN: usize = 50;

    pub const SPACE: usize = 8
        + 4
        + Self::MAX_EVENT_ID_LEN
        + 4
        + Self::MAX_NAME_LEN
        + 1
        + 8
        + (4 + 50 + 1 + 8 + 8)
        + 1
        + 1
        + 32
        + 4
        + (Self::MAX_AFFECTED_AREAS * (4 + Self::MAX_AREA_NAME_LEN))
        + 4
        + Self::MAX_DESCRIPTION_LEN
        + 4
        + 4
        + 4
        + 8
        + 8
        + 8
        + 1;
}
