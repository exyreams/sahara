use anchor_lang::prelude::*;

#[account]
pub struct FieldWorker {
    pub authority: Pubkey,
    pub name: String,
    pub organization: String,
    pub ngo: Option<Pubkey>,
    pub phone_number: String,
    pub email: String,
    pub is_active: bool,
    pub verifications_count: u32,
    pub registrations_count: u32,
    pub flags_raised: u32,
    pub assigned_districts: Vec<String>,
    pub credentials: String,
    pub registered_at: i64,
    pub activated_at: Option<i64>,
    pub deactivated_at: Option<i64>,
    pub last_activity_at: i64,
    pub registered_by: Pubkey,
    pub notes: String,
    pub bump: u8,
}

impl FieldWorker {
    pub const MAX_NAME_LEN: usize = 100;
    pub const MAX_ORGANIZATION_LEN: usize = 100;
    pub const MAX_PHONE_LEN: usize = 20;
    pub const MAX_EMAIL_LEN: usize = 100;
    pub const MAX_DISTRICTS: usize = 10;
    pub const MAX_DISTRICT_NAME_LEN: usize = 50;
    pub const MAX_CREDENTIALS_LEN: usize = 500;
    pub const MAX_NOTES_LEN: usize = 500;

    pub const SPACE: usize = 8
        + 32
        + 4
        + Self::MAX_NAME_LEN
        + 4
        + Self::MAX_ORGANIZATION_LEN
        + 1
        + 32
        + 4
        + Self::MAX_PHONE_LEN
        + 4
        + Self::MAX_EMAIL_LEN
        + 1
        + 4
        + 4
        + 4
        + 4
        + (Self::MAX_DISTRICTS * (4 + Self::MAX_DISTRICT_NAME_LEN))
        + 4
        + Self::MAX_CREDENTIALS_LEN
        + 8
        + 1
        + 8
        + 1
        + 8
        + 8
        + 32
        + 4
        + Self::MAX_NOTES_LEN
        + 1;
}
