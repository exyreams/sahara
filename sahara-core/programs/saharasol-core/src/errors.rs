use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Beneficiary is not verified")]
    BeneficiaryNotVerified,

    #[msg("Insufficient approvals for verification (requires 3/5)")]
    InsufficientApprovals,

    #[msg("Beneficiary already verified for this disaster")]
    AlreadyVerified,

    #[msg("Field worker has already approved this beneficiary")]
    DuplicateApproval,

    #[msg("Maximum number of verifier approvals reached")]
    MaxVerifiersReached,

    #[msg("Verification threshold not met")]
    VerificationThresholdNotMet,

    #[msg("Invalid verification status transition")]
    InvalidStatusTransition,

    #[msg("Beneficiary is flagged and requires admin review")]
    BeneficiaryFlagged,

    #[msg("Cannot verify rejected beneficiary")]
    CannotVerifyRejected,

    #[msg("Verification period expired")]
    VerificationExpired,

    #[msg("Field worker is not authorized")]
    UnauthorizedFieldWorker,

    #[msg("Field worker is not active")]
    FieldWorkerNotActive,

    #[msg("Only platform admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Only NGO authority can perform this action")]
    UnauthorizedNGO,

    #[msg("NGO is not verified")]
    NGONotVerified,

    #[msg("NGO is not active")]
    NGONotActive,

    #[msg("NGO is blacklisted")]
    NGOBlacklisted,

    #[msg("Unauthorized to modify this resource")]
    UnauthorizedModification,

    #[msg("Only beneficiary can perform this action")]
    UnauthorizedBeneficiary,

    #[msg("Field worker not assigned to this district")]
    FieldWorkerNotAssignedToDistrict,

    #[msg("Fund pool has insufficient balance")]
    InsufficientPoolBalance,

    #[msg("Insufficient funds in wallet")]
    InsufficientFunds,

    #[msg("Distribution is time-locked")]
    DistributionLocked,

    #[msg("Pool distribution already completed")]
    DistributionAlreadyCompleted,

    #[msg("Distribution not found for beneficiary")]
    DistributionNotFound,

    #[msg("Distribution already claimed")]
    DistributionAlreadyClaimed,

    #[msg("Pool registration phase is locked, cannot register more beneficiaries")]
    RegistrationPhaseLocked,

    #[msg("Distribution phase not active, pool registration must be locked first")]
    DistributionPhaseNotActive,

    #[msg("Beneficiary already registered for this pool")]
    BeneficiaryAlreadyRegisteredForPool,

    #[msg("Pool registration is not locked, must lock before distribution")]
    PoolRegistrationNotLocked,

    #[msg("Beneficiary not registered for this pool")]
    BeneficiaryNotRegisteredForPool,

    #[msg("Token is already in the allowed tokens list")]
    TokenAlreadyAllowed,

    #[msg("Maximum number of allowed tokens reached")]
    MaxAllowedTokensReached,

    #[msg("Cannot remove the primary token (USDC)")]
    CannotRemovePrimaryToken,

    #[msg("Token is not in the allowed tokens list")]
    TokenNotInAllowedList,

    #[msg("Pool is not active")]
    PoolNotActive,

    #[msg("Pool is closed")]
    PoolClosed,

    #[msg("Invalid distribution type")]
    InvalidDistributionType,

    #[msg("Donation amount below minimum")]
    DonationBelowMinimum,

    #[msg("Donation amount exceeds maximum")]
    DonationExceedsMaximum,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Token account mismatch")]
    TokenAccountMismatch,

    #[msg("Platform fee calculation error")]
    PlatformFeeError,

    #[msg("Cannot distribute to zero beneficiaries")]
    NoBeneficiariesForDistribution,

    #[msg("Disaster event is not active")]
    DisasterNotActive,

    #[msg("Disaster event not found")]
    DisasterNotFound,

    #[msg("Disaster event already exists")]
    DisasterAlreadyExists,

    #[msg("Cannot modify closed disaster")]
    CannotModifyClosedDisaster,

    #[msg("Invalid disaster severity (must be 1-10)")]
    InvalidDisasterSeverity,

    #[msg("Disaster has active pools, cannot close")]
    DisasterHasActivePools,

    #[msg("Only admin or verified NGO can create disasters")]
    UnauthorizedDisasterCreation,

    #[msg("Duplicate beneficiary registration detected")]
    DuplicateRegistration,

    #[msg("Phone number already registered for this disaster")]
    DuplicatePhoneNumber,

    #[msg("National ID already registered for this disaster")]
    DuplicateNationalId,

    #[msg("Household ID already has maximum members")]
    HouseholdMaxMembersReached,

    #[msg("Beneficiary already registered for this disaster")]
    BeneficiaryAlreadyRegistered,

    #[msg("Similar address detected, manual review required")]
    SimilarAddressDetected,

    #[msg("Invalid family size (must be 1-50)")]
    InvalidFamilySize,

    #[msg("Invalid damage severity (must be 1-10)")]
    InvalidDamageSeverity,

    #[msg("Invalid phone number format")]
    InvalidPhoneNumber,

    #[msg("Invalid national ID format")]
    InvalidNationalId,

    #[msg("Invalid location coordinates")]
    InvalidLocationCoordinates,

    #[msg("Invalid IPFS hash format")]
    InvalidIpfsHash,

    #[msg("Invalid time lock duration")]
    InvalidTimeLockDuration,

    #[msg("Invalid distribution percentages (must sum to 100)")]
    InvalidDistributionPercentages,

    #[msg("Invalid pool configuration")]
    InvalidPoolConfiguration,

    #[msg("Invalid eligibility criteria")]
    InvalidEligibilityCriteria,

    #[msg("String exceeds maximum length")]
    StringTooLong,

    #[msg("Vector exceeds maximum capacity")]
    VectorTooLong,

    #[msg("Invalid age (must be 0-150)")]
    InvalidAge,

    #[msg("Invalid email format")]
    InvalidEmail,

    #[msg("Account already initialized")]
    AccountAlreadyInitialized,

    #[msg("Account not initialized")]
    AccountNotInitialized,

    #[msg("Invalid account owner")]
    InvalidAccountOwner,

    #[msg("Account data mismatch")]
    AccountDataMismatch,

    #[msg("PDA derivation failed")]
    PDADerivationFailed,

    #[msg("Invalid bump seed")]
    InvalidBumpSeed,

    #[msg("Platform is paused")]
    PlatformPaused,

    #[msg("Platform configuration not initialized")]
    PlatformNotInitialized,

    #[msg("Invalid platform fee percentage")]
    InvalidPlatformFee,

    #[msg("Platform fee recipient not set")]
    PlatformFeeRecipientNotSet,

    #[msg("Admin transfer already pending")]
    TransferAlreadyPending,

    #[msg("No admin transfer pending")]
    NoTransferPending,

    #[msg("Admin transfer has expired")]
    TransferExpired,

    #[msg("Only pending admin can accept transfer")]
    NotPendingAdmin,

    #[msg("Batch size exceeds maximum of 20")]
    BatchSizeTooLarge,

    #[msg("Beneficiary flagged for suspicious activity")]
    SuspiciousActivity,

    #[msg("Too many registrations from same location")]
    TooManyRegistrationsFromLocation,

    #[msg("Registration velocity exceeded")]
    RegistrationVelocityExceeded,

    #[msg("Biometric hash mismatch")]
    BiometricMismatch,

    #[msg("Document verification failed")]
    DocumentVerificationFailed,

    #[msg("Flagged reason required")]
    FlaggedReasonRequired,

    #[msg("Cannot unflag without admin review")]
    CannotUnflagWithoutReview,

    #[msg("Action not allowed yet (time-locked)")]
    ActionTimeLocked,

    #[msg("Action deadline passed")]
    ActionDeadlinePassed,

    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    #[msg("Time lock not expired")]
    TimeLockNotExpired,

    #[msg("Distribution window closed")]
    DistributionWindowClosed,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Arithmetic underflow")]
    ArithmeticUnderflow,

    #[msg("Division by zero")]
    DivisionByZero,

    #[msg("Invalid calculation result")]
    InvalidCalculation,

    #[msg("Operation not allowed")]
    OperationNotAllowed,

    #[msg("Invalid operation for current state")]
    InvalidOperation,

    #[msg("Feature not implemented")]
    NotImplemented,

    #[msg("Invalid input parameter")]
    InvalidInput,

    #[msg("Resource not found")]
    ResourceNotFound,

    #[msg("Operation failed")]
    OperationFailed,

    #[msg("Unexpected error occurred")]
    UnexpectedError,

    #[msg("Distribution has not expired yet")]
    DistributionNotExpired,

    #[msg("Distribution already expired/reclaimed")]
    DistributionAlreadyExpired,

    #[msg("Distribution has been partially claimed, cannot reclaim")]
    DistributionPartiallyClaimed,

    #[msg("Manager already exists in the list")]
    ManagerAlreadyExists,

    #[msg("Manager not found in the list")]
    ManagerNotFound,

    #[msg("Maximum number of managers reached")]
    MaxManagersReached,

    #[msg("Cannot add admin as manager")]
    CannotAddAdminAsManager,

    #[msg("Only admin or manager can perform this action")]
    UnauthorizedAdminOrManager,

    #[msg("Only admin can perform this action (managers not allowed)")]
    AdminOnlyAction,

    #[msg("NGO has reached pool creation limit")]
    PoolLimitReached,

    #[msg("NGO has reached beneficiary registration limit")]
    BeneficiaryLimitReached,
}
