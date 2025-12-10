use anchor_lang::prelude::*;

#[account]
pub struct PlatformConfig {
    pub admin: Pubkey,
    pub managers: Vec<Pubkey>,
    pub platform_fee_percentage: u16,
    pub unverified_ngo_fee_percentage: u16,
    pub verified_ngo_fee_percentage: u16,
    pub platform_fee_recipient: Pubkey,
    pub verification_threshold: u8,
    pub max_verifiers: u8,
    pub min_donation_amount: u64,
    pub max_donation_amount: u64,
    pub verified_ngo_max_donation: u64,
    pub verified_ngo_pool_limit: u8,
    pub unverified_ngo_pool_limit: u8,
    pub verified_ngo_beneficiary_limit: u16,
    pub unverified_ngo_beneficiary_limit: u16,
    pub is_paused: bool,
    pub total_disasters: u32,
    pub total_beneficiaries: u32,
    pub total_verified_beneficiaries: u32,
    pub total_field_workers: u32,
    pub total_ngos: u32,
    pub total_donations: u64,
    pub total_aid_distributed: u64,
    pub total_pools: u32,
    pub total_fees_collected: u64,
    pub usdc_mint: Pubkey,
    pub sol_usd_oracle: Option<Pubkey>,
    pub allowed_tokens: Vec<Pubkey>,
    pub emergency_contacts: Vec<Pubkey>,
    pub platform_name: String,
    pub platform_version: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub pending_admin: Option<Pubkey>,
    pub admin_transfer_initiated_at: Option<i64>,
    pub admin_transfer_timeout: i64,
    pub bump: u8,
}

impl PlatformConfig {
    pub const MAX_MANAGERS: usize = 10;
    pub const MAX_ALLOWED_TOKENS: usize = 10;
    pub const MAX_EMERGENCY_CONTACTS: usize = 5;
    pub const MAX_PLATFORM_NAME_LEN: usize = 50;
    pub const MAX_VERSION_LEN: usize = 20;

    pub const SPACE: usize = 8
        + 32 // admin
        + 4 + (Self::MAX_MANAGERS * 32) // managers
        + 2 // platform_fee_percentage
        + 2 // unverified_ngo_fee_percentage
        + 2 // verified_ngo_fee_percentage
        + 32 // platform_fee_recipient
        + 1 // verification_threshold
        + 1 // max_verifiers
        + 8 // min_donation_amount
        + 8 // max_donation_amount
        + 8 // verified_ngo_max_donation
        + 1 // verified_ngo_pool_limit
        + 1 // unverified_ngo_pool_limit
        + 2 // verified_ngo_beneficiary_limit
        + 2 // unverified_ngo_beneficiary_limit
        + 1 // is_paused
        + 4 // total_disasters
        + 4 // total_beneficiaries
        + 4 // total_verified_beneficiaries
        + 4 // total_field_workers
        + 4 // total_ngos
        + 8 // total_donations
        + 8 // total_aid_distributed
        + 4 // total_pools
        + 8 // total_fees_collected
        + 32 // usdc_mint
        + 1 + 32 // sol_usd_oracle
        + 4 + (Self::MAX_ALLOWED_TOKENS * 32) // allowed_tokens
        + 4 + (Self::MAX_EMERGENCY_CONTACTS * 32) // emergency_contacts
        + 4 + Self::MAX_PLATFORM_NAME_LEN // platform_name
        + 4 + Self::MAX_VERSION_LEN // platform_version
        + 8 // created_at
        + 8 // updated_at
        + 1 + 32 // pending_admin
        + 1 + 8 // admin_transfer_initiated_at
        + 8 // admin_transfer_timeout
        + 1; // bump

    /// Check if a pubkey is admin or manager
    pub fn is_admin_or_manager(&self, pubkey: &Pubkey) -> bool {
        self.admin == *pubkey || self.managers.contains(pubkey)
    }

    /// Check if a pubkey is admin only
    pub fn is_admin(&self, pubkey: &Pubkey) -> bool {
        self.admin == *pubkey
    }

    /// Check if a pubkey is manager only
    pub fn is_manager(&self, pubkey: &Pubkey) -> bool {
        self.managers.contains(pubkey)
    }
}
