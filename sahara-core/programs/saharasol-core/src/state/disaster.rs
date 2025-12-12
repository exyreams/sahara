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

    pub const SPACE: usize = 8                                                          // discriminator
        + 4 + Self::MAX_EVENT_ID_LEN                                                // event_id
        + 4 + Self::MAX_NAME_LEN                                                    // name
        + 1                                                                         // event_type (enum)
        + 8                                                                         // declared_at
        + (4 + Location::MAX_COUNTRY_LEN                                           // location.country
           + 4 + Location::MAX_REGION_LEN                                          // location.region
           + 4 + Location::MAX_CITY_LEN                                            // location.city
           + 4 + Location::MAX_AREA_LEN                                            // location.area
           + 8 + 8)                                                                // location.latitude + longitude
        + 1                                                                         // severity
        + 1                                                                         // is_active
        + 32                                                                        // authority
        + 4 + (Self::MAX_AFFECTED_AREAS * (4 + Self::MAX_AREA_NAME_LEN))          // affected_areas
        + 4 + Self::MAX_DESCRIPTION_LEN                                            // description
        + 4                                                                         // estimated_affected_population
        + 4                                                                         // total_beneficiaries
        + 4                                                                         // verified_beneficiaries
        + 8                                                                         // total_aid_distributed
        + 8                                                                         // created_at
        + 8                                                                         // updated_at
        + 1; // bump
}
