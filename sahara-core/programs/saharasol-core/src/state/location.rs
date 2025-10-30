use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Location {
    pub district: String,
    pub ward: u8,
    pub latitude: f64,
    pub longitude: f64,
}
