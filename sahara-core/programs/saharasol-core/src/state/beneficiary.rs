use crate::state::{Location, VerificationStatus};
use anchor_lang::prelude::*;

#[account]
pub struct Beneficiary {
    pub authority: Pubkey,
    pub disaster_id: String,
    pub name: String,
    pub phone_number: String,
    pub location: Location,
    pub family_size: u8,
    pub damage_severity: u8,
    pub verification_status: VerificationStatus,
    pub verifier_approvals: Vec<Pubkey>,
    pub ipfs_document_hash: String,
    pub household_id: Option<String>,
    pub registered_at: i64,
    pub verified_at: Option<i64>,
    pub nft_mint: Option<Pubkey>,
    pub total_received: u64,
    pub national_id: String,
    pub age: u8,
    pub gender: String,
    pub occupation: String,
    pub damage_description: String,
    pub special_needs: String,
    pub registered_by: Pubkey,
    pub flagged_reason: Option<String>,
    pub flagged_by: Option<Pubkey>,
    pub flagged_at: Option<i64>,
    pub admin_notes: Option<String>,
    pub bump: u8,
}

impl Beneficiary {
    pub const MAX_DISASTER_ID_LEN: usize = 50;
    pub const MAX_NAME_LEN: usize = 100;
    pub const MAX_PHONE_LEN: usize = 20;
    pub const MAX_IPFS_HASH_LEN: usize = 100;
    pub const MAX_HOUSEHOLD_ID_LEN: usize = 50;
    pub const MAX_NATIONAL_ID_LEN: usize = 30;
    pub const MAX_GENDER_LEN: usize = 20;
    pub const MAX_OCCUPATION_LEN: usize = 100;
    pub const MAX_DAMAGE_DESC_LEN: usize = 500;
    pub const MAX_SPECIAL_NEEDS_LEN: usize = 300;
    pub const MAX_FLAGGED_REASON_LEN: usize = 500;
    pub const MAX_ADMIN_NOTES_LEN: usize = 500;
    pub const MAX_VERIFIER_APPROVALS: usize = 5;

    pub const SPACE: usize = 8
        + 32
        + 4
        + Self::MAX_DISASTER_ID_LEN
        + 4
        + Self::MAX_NAME_LEN
        + 4
        + Self::MAX_PHONE_LEN
        + (4 + 50 + 1 + 8 + 8)
        + 1
        + 1
        + 1
        + 4
        + (Self::MAX_VERIFIER_APPROVALS * 32)
        + 4
        + Self::MAX_IPFS_HASH_LEN
        + 1
        + 4
        + Self::MAX_HOUSEHOLD_ID_LEN
        + 8
        + 1
        + 8
        + 1
        + 32
        + 8
        + 4
        + Self::MAX_NATIONAL_ID_LEN
        + 1
        + 4
        + Self::MAX_GENDER_LEN
        + 4
        + Self::MAX_OCCUPATION_LEN
        + 4
        + Self::MAX_DAMAGE_DESC_LEN
        + 4
        + Self::MAX_SPECIAL_NEEDS_LEN
        + 32
        + 1
        + 4
        + Self::MAX_FLAGGED_REASON_LEN
        + 1
        + 32
        + 1
        + 8
        + 1
        + 4
        + Self::MAX_ADMIN_NOTES_LEN
        + 1;
}
