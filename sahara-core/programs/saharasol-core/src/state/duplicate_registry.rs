use anchor_lang::prelude::*;

#[account]
pub struct PhoneRegistry {
    pub disaster_id: String,
    pub phone_number: String,
    pub beneficiary: Pubkey,
    pub registered_at: i64,
    pub bump: u8,
}

impl PhoneRegistry {
    pub const MAX_DISASTER_ID_LEN: usize = 50;
    pub const MAX_PHONE_LEN: usize = 20;

    pub const SPACE: usize =
        8 + 4 + Self::MAX_DISASTER_ID_LEN + 4 + Self::MAX_PHONE_LEN + 32 + 8 + 1;
}

#[account]
pub struct NationalIdRegistry {
    pub disaster_id: String,
    pub national_id: String,
    pub beneficiary: Pubkey,
    pub registered_at: i64,
    pub bump: u8,
}

impl NationalIdRegistry {
    pub const MAX_DISASTER_ID_LEN: usize = 50;
    pub const MAX_NATIONAL_ID_LEN: usize = 50;

    pub const SPACE: usize =
        8 + 4 + Self::MAX_DISASTER_ID_LEN + 4 + Self::MAX_NATIONAL_ID_LEN + 32 + 8 + 1;
}
