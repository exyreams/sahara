import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

export function generateDisasterId(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000);
    return `${year}-disaster-${random}`;
}

export function generatePoolId(): string {
    const random = Math.floor(Math.random() * 10000);
    return `pool-${random}`;
}

export function generatePhoneNumber(): string {
    const random = Math.floor(Math.random() * 900000000) + 100000000;
    return `+977-${random}`;
}

export function generateIPFSHash(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let hash = "Qm";
    for (let i = 0; i < 44; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

export function generateNationalId(): string {
    const random = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `NID-${random}`;
}

export function createMockLocation(overrides?: Partial<Location>): Location {
    return {
        district: overrides?.district || "Kathmandu",
        ward: overrides?.ward || 5,
        latitude: overrides?.latitude || 27.7172,
        longitude: overrides?.longitude || 85.324,
    };
}

export function createMockDisasterParams(overrides?: Partial<any>): any {
    return {
        eventId: overrides?.eventId || generateDisasterId(),
        name: overrides?.name || "Test Disaster Event",
        eventType: overrides?.eventType || { earthquake: {} },
        location: overrides?.location || createMockLocation(),
        severity: overrides?.severity || 7,
        affectedAreas: overrides?.affectedAreas || ["Area1", "Area2"],
        description: overrides?.description || "Test disaster description",
        estimatedAffectedPopulation: overrides?.estimatedAffectedPopulation || 1000,
    };
}

export function createMockNGOParams(overrides?: Partial<any>): any {
    return {
        name: overrides?.name || "Test NGO Organization",
        registrationNumber: overrides?.registrationNumber || "REG-12345",
        email: overrides?.email || "test@ngo.org",
        phoneNumber: overrides?.phoneNumber || generatePhoneNumber(),
        website: overrides?.website || "https://testngo.org",
        description: overrides?.description || "A test NGO for disaster relief",
        address: overrides?.address || "123 Test Street, Kathmandu",
        verificationDocuments: overrides?.verificationDocuments || generateIPFSHash(),
        operatingDistricts: overrides?.operatingDistricts || ["Kathmandu", "Lalitpur"],
        focusAreas: overrides?.focusAreas || ["Food", "Shelter", "Medical"],
        contactPersonName: overrides?.contactPersonName || "John Doe",
        contactPersonRole: overrides?.contactPersonRole || "Director",
        bankAccountInfo: overrides?.bankAccountInfo || "Bank: Test Bank, Account: 123456",
        taxId: overrides?.taxId || "TAX-123456",
    };
}

export function createMockFieldWorkerParams(overrides?: Partial<any>): any {
    return {
        name: overrides?.name || "Test Field Worker",
        organization: overrides?.organization || "Test Organization",
        phoneNumber: overrides?.phoneNumber || generatePhoneNumber(),
        email: overrides?.email || "fieldworker@test.org",
        assignedDistricts: overrides?.assignedDistricts || ["Kathmandu"],
        credentials: overrides?.credentials || "Field Worker Credentials",
    };
}

export function createMockBeneficiaryParams(overrides?: Partial<any>): any {
    return {
        disasterId: overrides?.disasterId || generateDisasterId(),
        name: overrides?.name || "Test Beneficiary",
        phoneNumber: overrides?.phoneNumber || generatePhoneNumber(),
        location: overrides?.location || createMockLocation(),
        familySize: overrides?.familySize || 4,
        damageSeverity: overrides?.damageSeverity || 6,
        ipfsDocumentHash: overrides?.ipfsDocumentHash || generateIPFSHash(),
        householdId: overrides?.householdId || null,
        nationalId: overrides?.nationalId || generateNationalId(),
        age: overrides?.age || 30,
        gender: overrides?.gender || "Male",
        occupation: overrides?.occupation || "Farmer",
        damageDescription: overrides?.damageDescription || "House damaged",
        specialNeeds: overrides?.specialNeeds || "None",
    };
}

export function createMockUpdateBeneficiaryParams(overrides?: Partial<any>): any {
    return {
        name: overrides?.name || null,
        phoneNumber: overrides?.phoneNumber || null,
        location: overrides?.location || null,
        familySize: overrides?.familySize !== undefined ? overrides.familySize : null,
        damageSeverity: overrides?.damageSeverity !== undefined ? overrides.damageSeverity : null,
        ipfsDocumentHash: overrides?.ipfsDocumentHash || null,
        damageDescription: overrides?.damageDescription || null,
        specialNeeds: overrides?.specialNeeds || null,
    };
}

export function createMockFundPoolParams(tokenMint: PublicKey, overrides?: Partial<any>): any {
    return {
        poolId: overrides?.poolId || generatePoolId(),
        disasterId: overrides?.disasterId || generateDisasterId(),
        name: overrides?.name || "Test Fund Pool",
        tokenMint: tokenMint,
        distributionType: overrides?.distributionType || { equal: {} },
        timeLockDuration: overrides?.timeLockDuration || null,
        distributionPercentageImmediate: overrides?.distributionPercentageImmediate || 100,
        distributionPercentageLocked: overrides?.distributionPercentageLocked || 0,
        eligibilityCriteria: overrides?.eligibilityCriteria || "{}",
        minimumFamilySize: overrides?.minimumFamilySize || null,
        minimumDamageSeverity: overrides?.minimumDamageSeverity || null,
        targetAmount: overrides?.targetAmount || null,
        description: overrides?.description || "Test fund pool description",
    };
}

export function createMockPlatformParams(usdcMint: PublicKey, overrides?: Partial<any>): any {
    return {
        platformFeePercentage: overrides?.platformFeePercentage || 100,
        verificationThreshold: overrides?.verificationThreshold || 3,
        maxVerifiers: overrides?.maxVerifiers || 5,
        minDonationAmount: overrides?.minDonationAmount || new anchor.BN(1000000),
        maxDonationAmount: overrides?.maxDonationAmount || new anchor.BN(1000000000000),
        usdcMint: usdcMint,
        platformName: overrides?.platformName || "SaharaSol Test",
        platformVersion: overrides?.platformVersion || "1.0.0",
    };
}

export interface Location {
    district: string;
    ward: number;
    latitude: number;
    longitude: number;
}
