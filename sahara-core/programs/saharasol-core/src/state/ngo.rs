use anchor_lang::prelude::*;

#[account]
pub struct NGO {
    pub authority: Pubkey,
    pub name: String,
    pub registration_number: String,
    pub email: String,
    pub phone_number: String,
    pub website: String,
    pub description: String,
    pub address: String,
    pub is_verified: bool,
    pub is_active: bool,
    pub field_workers_count: u32,
    pub beneficiaries_registered: u32,
    pub pools_created: u32,
    pub total_aid_distributed: u64,
    pub verification_documents: String,
    pub operating_districts: Vec<String>,
    pub focus_areas: Vec<String>,
    pub registered_at: i64,
    pub verified_at: Option<i64>,
    pub verified_by: Option<Pubkey>,
    pub last_activity_at: i64,
    pub contact_person_name: String,
    pub contact_person_role: String,
    pub bank_account_info: String,
    pub tax_id: String,
    pub notes: String,
    pub is_blacklisted: bool,
    pub blacklist_reason: String,
    pub blacklisted_at: Option<i64>,
    pub blacklisted_by: Option<Pubkey>,
    pub bump: u8,
}

impl NGO {
    pub const MAX_NAME_LEN: usize = 150;
    pub const MAX_REGISTRATION_NUMBER_LEN: usize = 50;
    pub const MAX_EMAIL_LEN: usize = 100;
    pub const MAX_PHONE_LEN: usize = 20;
    pub const MAX_WEBSITE_LEN: usize = 100;
    pub const MAX_DESCRIPTION_LEN: usize = 1000;
    pub const MAX_ADDRESS_LEN: usize = 300;
    pub const MAX_VERIFICATION_DOCS_LEN: usize = 100;
    pub const MAX_DISTRICTS: usize = 20;
    pub const MAX_DISTRICT_NAME_LEN: usize = 50;
    pub const MAX_FOCUS_AREAS: usize = 10;
    pub const MAX_FOCUS_AREA_LEN: usize = 50;
    pub const MAX_CONTACT_NAME_LEN: usize = 100;
    pub const MAX_CONTACT_ROLE_LEN: usize = 100;
    pub const MAX_BANK_INFO_LEN: usize = 500;
    pub const MAX_TAX_ID_LEN: usize = 50;
    pub const MAX_NOTES_LEN: usize = 500;
    pub const MAX_BLACKLIST_REASON_LEN: usize = 500;

    pub const SPACE: usize = 8
        + 32
        + 4
        + Self::MAX_NAME_LEN
        + 4
        + Self::MAX_REGISTRATION_NUMBER_LEN
        + 4
        + Self::MAX_EMAIL_LEN
        + 4
        + Self::MAX_PHONE_LEN
        + 4
        + Self::MAX_WEBSITE_LEN
        + 4
        + Self::MAX_DESCRIPTION_LEN
        + 4
        + Self::MAX_ADDRESS_LEN
        + 1
        + 1
        + 4
        + 4
        + 4
        + 8
        + 4
        + Self::MAX_VERIFICATION_DOCS_LEN
        + 4
        + (Self::MAX_DISTRICTS * (4 + Self::MAX_DISTRICT_NAME_LEN))
        + 4
        + (Self::MAX_FOCUS_AREAS * (4 + Self::MAX_FOCUS_AREA_LEN))
        + 8
        + 1
        + 8
        + 1
        + 32
        + 8
        + 4
        + Self::MAX_CONTACT_NAME_LEN
        + 4
        + Self::MAX_CONTACT_ROLE_LEN
        + 4
        + Self::MAX_BANK_INFO_LEN
        + 4
        + Self::MAX_TAX_ID_LEN
        + 4
        + Self::MAX_NOTES_LEN
        + 1
        + 4
        + Self::MAX_BLACKLIST_REASON_LEN
        + 1
        + 8
        + 1
        + 32
        + 1;
}
