use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Location {
    pub country: String, // ISO country code (e.g., "US", "IN", "NP")
    pub region: String,  // State/Province/District
    pub city: String,    // City/Municipality
    pub area: String,    // Specific area/neighborhood (optional)
    pub latitude: f64,
    pub longitude: f64,
}

impl Location {
    pub const MAX_COUNTRY_LEN: usize = 2; // ISO country codes are 2 characters
    pub const MAX_REGION_LEN: usize = 100; // State/Province/District
    pub const MAX_CITY_LEN: usize = 100; // City/Municipality
    pub const MAX_AREA_LEN: usize = 200; // Specific area/neighborhood
}
