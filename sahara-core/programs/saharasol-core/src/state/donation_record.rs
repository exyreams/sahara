use crate::state::DonationType;
use anchor_lang::prelude::*;

#[account]
pub struct DonationRecord {
    pub donor: Pubkey,
    pub recipient: Pubkey,
    pub donation_type: DonationType,
    pub amount: u64,
    pub token_mint: Pubkey,
    pub disaster_id: String,
    pub pool: Option<Pubkey>,
    pub transaction_signature: String,
    pub timestamp: i64,
    pub is_anonymous: bool,
    pub message: String,
    pub platform_fee: u64,
    pub net_amount: u64,
    pub donor_name: Option<String>,
    pub donor_email: Option<String>,
    pub receipt_sent: bool,
    pub bump: u8,
}

impl DonationRecord {
    pub const MAX_DISASTER_ID_LEN: usize = 50;
    pub const MAX_SIGNATURE_LEN: usize = 100;
    pub const MAX_MESSAGE_LEN: usize = 500;
    pub const MAX_DONOR_NAME_LEN: usize = 100;
    pub const MAX_DONOR_EMAIL_LEN: usize = 100;

    pub const SPACE: usize = 8
        + 32
        + 32
        + 1
        + 8
        + 32
        + 4
        + Self::MAX_DISASTER_ID_LEN
        + 1
        + 32
        + 4
        + Self::MAX_SIGNATURE_LEN
        + 8
        + 1
        + 4
        + Self::MAX_MESSAGE_LEN
        + 8
        + 8
        + 1
        + 4
        + Self::MAX_DONOR_NAME_LEN
        + 1
        + 4
        + Self::MAX_DONOR_EMAIL_LEN
        + 1
        + 1;
}
