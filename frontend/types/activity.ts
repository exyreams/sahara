export enum ActivityType {
  // NGO Actions
  NGORegistered = "NGORegistered",
  NGOVerified = "NGOVerified",
  NGOUpdated = "NGOUpdated",
  NGODeactivated = "NGODeactivated",
  NGOBlacklisted = "NGOBlacklisted",

  // Field Worker Actions
  FieldWorkerRegistered = "FieldWorkerRegistered",
  FieldWorkerVerified = "FieldWorkerVerified",
  FieldWorkerUpdated = "FieldWorkerUpdated",
  FieldWorkerDeactivated = "FieldWorkerDeactivated",

  // Disaster Actions
  DisasterCreated = "DisasterCreated",
  DisasterUpdated = "DisasterUpdated",
  DisasterClosed = "DisasterClosed",

  // Fund Pool Actions
  FundPoolCreated = "FundPoolCreated",
  FundPoolClosed = "FundPoolClosed",

  // Beneficiary Actions
  BeneficiaryRegistered = "BeneficiaryRegistered",
  BeneficiaryVerified = "BeneficiaryVerified",
  BeneficiaryRejected = "BeneficiaryRejected",
  BeneficiaryUpdated = "BeneficiaryUpdated",

  // Donation Actions
  DonationToPool = "DonationToPool",
  DirectDonation = "DirectDonation",

  // Distribution Actions
  FundsDistributed = "FundsDistributed",
  FundsClaimed = "FundsClaimed",

  // Platform Actions
  PlatformConfigUpdated = "PlatformConfigUpdated",
  PlatformPaused = "PlatformPaused",
  PlatformUnpaused = "PlatformUnpaused",
  AdminTransferInitiated = "AdminTransferInitiated",
  AdminTransferAccepted = "AdminTransferAccepted",
  AdminTransferCancelled = "AdminTransferCancelled",
}

export const ActivityTypeLabels: Record<ActivityType, string> = {
  [ActivityType.NGORegistered]: "NGO Registered",
  [ActivityType.NGOVerified]: "NGO Verified",
  [ActivityType.NGOUpdated]: "NGO Updated",
  [ActivityType.NGODeactivated]: "NGO Deactivated",
  [ActivityType.NGOBlacklisted]: "NGO Blacklisted",
  [ActivityType.FieldWorkerRegistered]: "Field Worker Registered",
  [ActivityType.FieldWorkerVerified]: "Field Worker Verified",
  [ActivityType.FieldWorkerUpdated]: "Field Worker Updated",
  [ActivityType.FieldWorkerDeactivated]: "Field Worker Deactivated",
  [ActivityType.DisasterCreated]: "Disaster Created",
  [ActivityType.DisasterUpdated]: "Disaster Updated",
  [ActivityType.DisasterClosed]: "Disaster Closed",
  [ActivityType.FundPoolCreated]: "Fund Pool Created",
  [ActivityType.FundPoolClosed]: "Fund Pool Closed",
  [ActivityType.BeneficiaryRegistered]: "Beneficiary Registered",
  [ActivityType.BeneficiaryVerified]: "Beneficiary Verified",
  [ActivityType.BeneficiaryRejected]: "Beneficiary Rejected",
  [ActivityType.BeneficiaryUpdated]: "Beneficiary Updated",
  [ActivityType.DonationToPool]: "Donation to Pool",
  [ActivityType.DirectDonation]: "Direct Donation",
  [ActivityType.FundsDistributed]: "Funds Distributed",
  [ActivityType.FundsClaimed]: "Funds Claimed",
  [ActivityType.PlatformConfigUpdated]: "Platform Config Updated",
  [ActivityType.PlatformPaused]: "Platform Paused",
  [ActivityType.PlatformUnpaused]: "Platform Unpaused",
  [ActivityType.AdminTransferInitiated]: "Admin Transfer Initiated",
  [ActivityType.AdminTransferAccepted]: "Admin Transfer Accepted",
  [ActivityType.AdminTransferCancelled]: "Admin Transfer Cancelled",
};

export const ActivityTypeCategories = {
  ngo: [
    ActivityType.NGORegistered,
    ActivityType.NGOVerified,
    ActivityType.NGOUpdated,
    ActivityType.NGODeactivated,
    ActivityType.NGOBlacklisted,
  ],
  fieldWorker: [
    ActivityType.FieldWorkerRegistered,
    ActivityType.FieldWorkerVerified,
    ActivityType.FieldWorkerUpdated,
    ActivityType.FieldWorkerDeactivated,
  ],
  disaster: [
    ActivityType.DisasterCreated,
    ActivityType.DisasterUpdated,
    ActivityType.DisasterClosed,
  ],
  fundPool: [ActivityType.FundPoolCreated, ActivityType.FundPoolClosed],
  beneficiary: [
    ActivityType.BeneficiaryRegistered,
    ActivityType.BeneficiaryVerified,
    ActivityType.BeneficiaryRejected,
    ActivityType.BeneficiaryUpdated,
  ],
  donation: [ActivityType.DonationToPool, ActivityType.DirectDonation],
  distribution: [ActivityType.FundsDistributed, ActivityType.FundsClaimed],
  platform: [
    ActivityType.PlatformConfigUpdated,
    ActivityType.PlatformPaused,
    ActivityType.PlatformUnpaused,
    ActivityType.AdminTransferInitiated,
    ActivityType.AdminTransferAccepted,
    ActivityType.AdminTransferCancelled,
  ],
};
