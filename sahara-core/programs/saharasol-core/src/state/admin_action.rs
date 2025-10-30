use anchor_lang::prelude::*;

#[account]
pub struct AdminAction {
    pub action_type: AdminActionType,
    pub target: Pubkey,
    pub admin: Pubkey,
    pub reason: String,
    pub timestamp: i64,
    pub metadata: String,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum AdminActionType {
    VerifyNGO,
    RevokeVerification,
    ActivateNGO,
    DeactivateNGO,
    BlacklistNGO,
    RemoveBlacklist,

    InitiateAdminTransfer,
    AcceptAdminTransfer,
    CancelAdminTransfer,

    UpdatePlatformConfig,
    PausePlatform,
    UnpausePlatform,

    CreateDisaster,
    UpdateDisaster,
    CloseDisaster,

    CreateFundPool,
    CloseFundPool,

    RegisterBeneficiary,
    VerifyBeneficiary,
    RejectBeneficiary,

    DistributeFunds,
    ClaimFunds,

    DonateToPool,
    DirectDonation,
}

impl AdminAction {
    pub const MAX_REASON_LEN: usize = 500;
    pub const MAX_METADATA_LEN: usize = 1000;

    pub const SPACE: usize =
        8 + 1 + 32 + 32 + 4 + Self::MAX_REASON_LEN + 8 + 4 + Self::MAX_METADATA_LEN + 1;
}
