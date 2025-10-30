use anchor_lang::prelude::*;

#[account]
pub struct Distribution {
    pub beneficiary: Pubkey,
    pub pool: Pubkey,
    pub amount_allocated: u64,
    pub amount_immediate: u64,
    pub amount_locked: u64,
    pub amount_claimed: u64,
    pub unlock_time: Option<i64>,
    pub created_at: i64,
    pub claimed_at: Option<i64>,
    pub locked_claimed_at: Option<i64>,
    pub is_fully_claimed: bool,
    pub allocation_weight: u16,
    pub notes: String,
    pub bump: u8,
}

impl Distribution {
    pub const MAX_NOTES_LEN: usize = 200;

    pub const SPACE: usize = 8
        + 32
        + 32
        + 8
        + 8
        + 8
        + 8
        + 1
        + 8
        + 8
        + 1
        + 8
        + 1
        + 8
        + 1
        + 2
        + 4
        + Self::MAX_NOTES_LEN
        + 1;
}
