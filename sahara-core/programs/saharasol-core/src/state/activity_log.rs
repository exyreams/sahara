use anchor_lang::prelude::*;

#[account]
pub struct ActivityLog {
    pub action_type: ActivityType,
    pub actor: Pubkey,
    pub target: Pubkey,
    pub amount: Option<u64>,
    pub timestamp: i64,
    pub metadata: String,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ActivityType {
    NGORegistered,
    NGOVerified,
    NGOUpdated,
    NGODeactivated,
    NGOBlacklisted,

    FieldWorkerRegistered,
    FieldWorkerVerified,
    FieldWorkerUpdated,
    FieldWorkerDeactivated,

    DisasterCreated,
    DisasterUpdated,
    DisasterClosed,

    FundPoolCreated,
    FundPoolClosed,

    BeneficiaryRegistered,
    BeneficiaryVerified,
    BeneficiaryRejected,
    BeneficiaryUpdated,

    DonationToPool,
    DirectDonation,

    FundsDistributed,
    FundsClaimed,

    PlatformConfigUpdated,
    PlatformPaused,
    PlatformUnpaused,
    AdminTransferInitiated,
    AdminTransferAccepted,
    AdminTransferCancelled,
}

impl ActivityLog {
    pub const MAX_METADATA_LEN: usize = 500;

    pub const SPACE: usize = 8 + 1 + 32 + 32 + 1 + 8 + 8 + 4 + Self::MAX_METADATA_LEN + 1;
}
