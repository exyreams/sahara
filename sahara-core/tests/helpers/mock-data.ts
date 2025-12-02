import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

/**
 * Create mock params for platform initialization
 */
export function createMockPlatformParams(usdcMint: PublicKey, overrides?: Partial<any>): any {
  return {
    platformFeePercentage: overrides?.platformFeePercentage ?? 100, // 1%
    verificationThreshold: overrides?.verificationThreshold ?? 3,
    maxVerifiers: overrides?.maxVerifiers ?? 5,
    minDonationAmount: overrides?.minDonationAmount ?? new anchor.BN(1000000), // 1 USDC
    maxDonationAmount: overrides?.maxDonationAmount ?? new anchor.BN(1000000000000), // 1M USDC
    usdcMint: usdcMint,
    platformName: overrides?.platformName ?? "SaharaSol Test",
    platformVersion: overrides?.platformVersion ?? "1.0.0",
  };
}

/**
 * Create mock params for NGO registration
 */
export function createMockNGOParams(overrides?: Partial<any>): any {
  return {
    name: overrides?.name ?? "Test NGO Organization",
    registrationNumber: overrides?.registrationNumber ?? "REG-12345678",
    email: overrides?.email ?? "test@ngo.org",
    phoneNumber: overrides?.phoneNumber ?? "+000-12345678",
    website: overrides?.website ?? "https://testngo.org",
    description: overrides?.description ?? "A test NGO for disaster relief operations",
    address: overrides?.address ?? "123 Test Street, McMurdo Station, Antarctica",
    verificationDocuments: overrides?.verificationDocuments ?? "QmTestIPFSHash123456789",
    operatingDistricts: overrides?.operatingDistricts ?? ["McMurdo", "Palmer"],
    focusAreas: overrides?.focusAreas ?? ["Food", "Shelter", "Medical"],
    contactPersonName: overrides?.contactPersonName ?? "John Doe",
    contactPersonRole: overrides?.contactPersonRole ?? "Director",
    bankAccountInfo: overrides?.bankAccountInfo ?? "Bank: Test Bank, Account: 12345678",
    taxId: overrides?.taxId ?? "TAX-12345678",
  };
}

/**
 * Create mock params for field worker registration
 */
export function createMockFieldWorkerParams(overrides?: Partial<any>): any {
  return {
    name: overrides?.name ?? "Test Field Worker",
    organization: overrides?.organization ?? "Test Organization",
    phoneNumber: overrides?.phoneNumber ?? "+977-9851234567",
    email: overrides?.email ?? "fieldworker@test.org",
    assignedDistricts: overrides?.assignedDistricts ?? ["Kathmandu"],
    credentials: overrides?.credentials ?? "Field Worker Certification #12345",
  };
}

/**
 * Create mock params for disaster initialization
 */
export function createMockDisasterParams(overrides?: Partial<any>): any {
  return {
    eventId: overrides?.eventId ?? `DISASTER-${Date.now()}`,
    name: overrides?.name ?? "Test Disaster Event",
    eventType: overrides?.eventType ?? { earthquake: {} },
    location: overrides?.location ?? {
      district: "Kathmandu",
      ward: 1,
      latitude: 27.7172,
      longitude: 85.3240,
    },
    severity: overrides?.severity ?? 7,
    affectedAreas: overrides?.affectedAreas ?? ["Kathmandu", "Bhaktapur"],
    description: overrides?.description ?? "A test disaster event for testing purposes",
    estimatedAffectedPopulation: overrides?.estimatedAffectedPopulation ?? 10000,
  };
}

/**
 * Create mock params for beneficiary registration
 */
export function createMockBeneficiaryParams(overrides?: Partial<any>): any {
  return {
    disasterId: overrides?.disasterId ?? "TEST-DISASTER",
    name: overrides?.name ?? "Test Beneficiary",
    phoneNumber: overrides?.phoneNumber ?? "+977-9800000000",
    location: overrides?.location ?? {
      district: "Kathmandu",
      ward: 5,
      latitude: 27.7172,
      longitude: 85.3240,
    },
    familySize: overrides?.familySize ?? 4,
    damageSeverity: overrides?.damageSeverity ?? 7,
    ipfsDocumentHash: overrides?.ipfsDocumentHash ?? "QmTestHash123456789",
    householdId: overrides?.householdId ?? null,
    nationalId: overrides?.nationalId ?? "1234567890",
    age: overrides?.age ?? 35,
    gender: overrides?.gender ?? "Male",
    occupation: overrides?.occupation ?? "Farmer",
    damageDescription: overrides?.damageDescription ?? "House partially damaged",
    specialNeeds: overrides?.specialNeeds ?? "None",
  };
}
