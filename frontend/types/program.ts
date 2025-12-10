import type { PublicKey } from "@solana/web3.js";

// Enums
export enum DisasterType {
  Earthquake = "Earthquake",
  Flood = "Flood",
  Landslide = "Landslide",
  Other = "Other",
}

export enum DisasterStatus {
  Active = "Active",
  Closed = "Closed",
}

export enum VerificationStatus {
  Pending = "Pending",
  Verified = "Verified",
  Flagged = "Flagged",
  Rejected = "Rejected",
}

export enum PoolStatus {
  Active = "Active",
  Closed = "Closed",
}

export enum DistributionType {
  Equal = "Equal",
  WeightedFamily = "WeightedFamily",
  WeightedDamage = "WeightedDamage",
  Milestone = "Milestone",
}

export enum DonationType {
  Direct = "Direct",
  Pool = "Pool",
  Anonymous = "Anonymous",
}

// Location
export interface Location {
  district: string;
  ward: number;
  latitude: number;
  longitude: number;
}

// Platform Config
export interface PlatformConfig {
  publicKey: PublicKey;
  admin: PublicKey;
  managers: PublicKey[];
  platformFeePercentage: number; // Deprecated, kept for backward compatibility
  unverifiedNgoFeePercentage: number;
  verifiedNgoFeePercentage: number;
  platformFeeRecipient: PublicKey;
  verificationThreshold: number;
  maxVerifiers: number;
  minDonationAmount: number;
  maxDonationAmount: number;
  isPaused: boolean;
  totalDisasters: number;
  totalBeneficiaries: number;
  totalVerifiedBeneficiaries: number;
  totalFieldWorkers: number;
  totalNgos: number;
  totalDonations: number;
  totalAidDistributed: number;
  totalPools: number;
  totalFeesCollected: number;
  usdcMint: PublicKey;
  solUsdOracle: PublicKey | null;
  allowedTokens: PublicKey[];
  emergencyContacts: PublicKey[];
  platformName: string;
  platformVersion: string;
  createdAt: number;
  updatedAt: number;
  bump: number;
  // Admin transfer fields
  pendingAdmin: PublicKey | null;
  adminTransferInitiatedAt: number | null;
  adminTransferTimeout: number;
  // Usage limits fields
  verifiedNgoMaxDonation: number;
  verifiedNgoPoolLimit: number;
  unverifiedNgoPoolLimit: number;
  verifiedNgoBeneficiaryLimit: number;
  unverifiedNgoBeneficiaryLimit: number;
}

// Disaster Event
export interface DisasterEvent {
  publicKey: PublicKey;
  eventId: string;
  name: string;
  eventType: DisasterType;
  declaredAt: number;
  location: Location;
  severity: number;
  isActive: boolean;
  authority: PublicKey;
  affectedAreas: string[];
  description: string;
  estimatedAffectedPopulation: number;
  totalBeneficiaries: number;
  verifiedBeneficiaries: number;
  totalAidDistributed: number;
  createdAt: number;
  updatedAt: number;
  bump: number;
}

// Beneficiary
export interface Beneficiary {
  publicKey: PublicKey;
  authority: PublicKey;
  disasterId: string;
  name: string;
  phoneNumber: string;
  location: Location;
  familySize: number;
  damageSeverity: number;
  verificationStatus: VerificationStatus;
  verifierApprovals: PublicKey[];
  ipfsDocumentHash: string;
  householdId: string | null;
  registeredAt: number;
  verifiedAt: number | null;
  nftMint: PublicKey | null;
  totalReceived: number;
  nationalId: string;
  age: number;
  gender: string;
  occupation: string;
  damageDescription: string;
  specialNeeds: string;
  registeredBy: PublicKey;
  flaggedReason: string | null;
  flaggedBy: PublicKey | null;
  flaggedAt: number | null;
  bump: number;
}

// NGO
export interface NGO {
  publicKey: PublicKey;
  authority: PublicKey;
  name: string;
  registrationNumber: string;
  email: string;
  phoneNumber: string;
  website: string;
  description: string;
  address: string;
  isVerified: boolean;
  isActive: boolean;
  fieldWorkersCount: number;
  beneficiariesRegistered: number;
  poolsCreated: number;
  totalAidDistributed: number;
  verificationDocuments: string;
  operatingDistricts: string[];
  focusAreas: string[];
  registeredAt: number;
  verifiedAt: number | null;
  verifiedBy: PublicKey | null;
  lastActivityAt: number;
  contactPersonName: string;
  contactPersonRole: string;
  bankAccountInfo: string;
  taxId: string;
  notes: string;
  bump: number;
  // Blacklist fields
  isBlacklisted: boolean;
  blacklistReason: string;
  blacklistedAt: number | null;
  blacklistedBy: PublicKey | null;
}

// Field Worker
export interface FieldWorker {
  publicKey: PublicKey;
  authority: PublicKey;
  name: string;
  organization: string;
  ngo: PublicKey | null;
  phoneNumber: string;
  email: string;
  isActive: boolean;
  verificationsCount: number;
  registrationsCount: number;
  flagsRaised: number;
  assignedDistricts: string[];
  credentials: string;
  registeredAt: number;
  activatedAt: number | null;
  deactivatedAt: number | null;
  lastActivityAt: number;
  registeredBy: PublicKey;
  notes: string;
  bump: number;
}

// Fund Pool
export interface FundPool {
  publicKey: PublicKey;
  poolId: string;
  disasterId: string;
  name: string;
  authority: PublicKey;
  tokenMint: PublicKey;
  tokenAccount: PublicKey;
  distributionType: DistributionType;
  totalDeposited: number;
  totalDistributed: number;
  totalClaimed: number;
  beneficiaryCount: number;
  donorCount: number;
  timeLockDuration: number | null;
  distributionPercentageImmediate: number;
  distributionPercentageLocked: number;
  eligibilityCriteria: string;
  isActive: boolean;
  isDistributed: boolean;
  createdAt: number;
  distributedAt: number | null;
  closedAt: number | null;
  minimumFamilySize: number | null;
  minimumDamageSeverity: number | null;
  targetAmount: number | null;
  description: string;
  registrationLocked: boolean;
  expectedBeneficiaryCount: number | null;
  registeredBeneficiaryCount: number;
  bump: number;
}

// Distribution
export interface Distribution {
  publicKey: PublicKey;
  beneficiary: PublicKey;
  pool: PublicKey;
  amountAllocated: number;
  amountImmediate: number;
  amountLocked: number;
  amountClaimed: number;
  unlockTime: number | null;
  createdAt: number;
  claimedAt: number | null;
  lockedClaimedAt: number | null;
  isFullyClaimed: boolean;
  allocationWeight: number;
  notes: string;
  bump: number;
  // Expiration fields
  claimDeadline: number | null;
  isExpired: boolean;
  expiredAt: number | null;
}

// Donation Record
export interface DonationRecord {
  publicKey: PublicKey;
  donor: PublicKey;
  recipient: PublicKey;
  donationType: DonationType;
  amount: number;
  tokenMint: PublicKey;
  disasterId: string;
  pool: PublicKey | null;
  transactionSignature: string;
  timestamp: number;
  isAnonymous: boolean;
  message: string;
  platformFee: number;
  netAmount: number;
  donorName: string | null;
  donorEmail: string | null;
  receiptSent: boolean;
  bump: number;
}

// Pool Registration
export interface PoolRegistration {
  publicKey: PublicKey;
  pool: PublicKey;
  beneficiary: PublicKey;
  allocationWeight: number;
  registeredAt: number;
  isDistributed: boolean;
  bump: number;
}
