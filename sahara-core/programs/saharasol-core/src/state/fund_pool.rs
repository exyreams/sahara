use crate::state::DistributionType;
use anchor_lang::prelude::*;

#[account]
pub struct FundPool {
    pub pool_id: String,
    pub disaster_id: String,
    pub name: String,
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub token_account: Pubkey,
    pub distribution_type: DistributionType,
    pub total_deposited: u64,
    pub total_distributed: u64,
    pub total_claimed: u64,
    pub beneficiary_count: u32,
    pub total_allocation_weight: u64,
    pub donor_count: u32,
    pub time_lock_duration: Option<i64>,
    pub distribution_percentage_immediate: u8,
    pub distribution_percentage_locked: u8,
    pub eligibility_criteria: String,
    pub is_active: bool,
    pub is_distributed: bool,
    pub created_at: i64,
    pub distributed_at: Option<i64>,
    pub closed_at: Option<i64>,
    pub minimum_family_size: Option<u8>,
    pub minimum_damage_severity: Option<u8>,
    pub target_amount: Option<u64>,
    pub description: String,
    pub bump: u8,
}

impl FundPool {
    pub const MAX_POOL_ID_LEN: usize = 50;
    pub const MAX_DISASTER_ID_LEN: usize = 50;
    pub const MAX_NAME_LEN: usize = 100;
    pub const MAX_ELIGIBILITY_LEN: usize = 500;
    pub const MAX_DESCRIPTION_LEN: usize = 500;

    pub const SPACE: usize = 8
        + 4
        + Self::MAX_POOL_ID_LEN
        + 4
        + Self::MAX_DISASTER_ID_LEN
        + 4
        + Self::MAX_NAME_LEN
        + 32
        + 32
        + 32
        + 1
        + 8
        + 8
        + 8
        + 4
        + 8
        + 4
        + 1
        + 8
        + 1
        + 1
        + 4
        + Self::MAX_ELIGIBILITY_LEN
        + 1
        + 1
        + 8
        + 1
        + 8
        + 1
        + 8
        + 1
        + 1
        + 1
        + 1
        + 1
        + 8
        + 4
        + Self::MAX_DESCRIPTION_LEN
        + 1;
}
