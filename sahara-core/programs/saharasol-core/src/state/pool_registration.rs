use anchor_lang::prelude::*;

#[account]
pub struct PoolRegistration {
    pub pool: Pubkey,
    pub beneficiary: Pubkey,
    pub allocation_weight: u64,
    pub registered_at: i64,
    pub is_distributed: bool,
    pub bump: u8,
}

impl PoolRegistration {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
}
