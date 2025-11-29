import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

// Disaster Form Schema
export const disasterFormSchema = z.object({
  eventId: z
    .string()
    .min(1, "Event ID is required")
    .max(32, "Event ID too long"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  eventType: z.enum(["Earthquake", "Flood", "Landslide", "Other"]),
  severity: z
    .number()
    .min(1, "Severity must be at least 1")
    .max(10, "Severity cannot exceed 10"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  district: z.string().min(1, "District is required").max(50),
  ward: z.number().min(1).max(50),
  address: z.string().min(1, "Address is required").max(200),
  affectedAreas: z.array(z.string()).default([]),
  description: z.string().max(500).default(""),
  estimatedAffectedPopulation: z.number().min(0).default(0),
});

export type DisasterFormData = z.infer<typeof disasterFormSchema>;

// Beneficiary Form Schema
export const beneficiaryFormSchema = z.object({
  walletAddress: z.string().refine(
    (val) => {
      try {
        new PublicKey(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid Solana address" },
  ),
  disasterId: z.string().min(1, "Disaster ID is required").max(32),
  name: z.string().min(1, "Name is required").max(100),
  phone: z
    .string()
    .regex(
      /^\+?[0-9\s\-()]{10,20}$/,
      "Invalid phone number (10-15 digits, spaces and dashes allowed)",
    ),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  district: z.string().min(1, "District is required").max(50),
  ward: z.number().min(1).max(50),
  address: z.string().min(1, "Address is required").max(200),
  familySize: z.number().min(1, "Family size must be at least 1").max(50),
  damageSeverity: z
    .number()
    .min(1, "Damage severity must be at least 1")
    .max(10),
  householdId: z.string().max(32).optional(),
  nationalId: z.string().min(1, "National ID is required"),
  age: z.number().min(0).max(150),
  gender: z.string().min(1, "Gender is required"),
  occupation: z.string().max(100).default(""),
  damageDescription: z.string().max(500).default(""),
  specialNeeds: z.string().max(500).default(""),
  ipfsDocumentHash: z.string().default(""),
});

export type BeneficiaryFormData = z.infer<typeof beneficiaryFormSchema>;

// NGO Form Schema
export const ngoFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(150, "Name too long (max 150 characters)"),
  registrationNumber: z
    .string()
    .min(1, "Registration number is required")
    .max(50, "Registration number too long"),
  email: z.string().email("Invalid email address").max(100, "Email too long"),
  phoneNumber: z
    .string()
    .regex(
      /^\+?[0-9\s\-()]{10,20}$/,
      "Invalid phone number (10-15 digits, spaces and dashes allowed)",
    ),
  website: z
    .string()
    .url("Invalid URL")
    .or(z.literal(""))
    .refine((val) => val.length <= 100, "URL too long"),
  description: z
    .string()
    .max(1000, "Description too long (max 1000 characters)")
    .default(""),
  address: z
    .string()
    .min(1, "Address is required")
    .max(300, "Address too long"),
  verificationDocuments: z
    .string()
    .max(100, "Document hash too long")
    .default(""),
  operatingDistricts: z
    .array(z.string())
    .min(1, "Select at least one district")
    .max(20, "Maximum 20 districts allowed"),
  focusAreas: z
    .array(z.string())
    .min(1, "Select at least one focus area")
    .max(10, "Maximum 10 focus areas allowed"),
  contactPersonName: z
    .string()
    .min(1, "Contact person name is required")
    .max(100, "Name too long"),
  contactPersonRole: z
    .string()
    .min(1, "Contact person role is required")
    .max(100, "Role too long"),
  bankAccountInfo: z.string().max(500, "Bank info too long").default(""),
  taxId: z.string().max(50, "Tax ID too long").default(""),
});

export type NGOFormData = z.infer<typeof ngoFormSchema>;

// Field Worker Form Schema
export const fieldWorkerFormSchema = z.object({
  walletAddress: z.string().refine(
    (val) => {
      try {
        new PublicKey(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid Solana address" },
  ),
  name: z.string().min(1, "Name is required").max(100),
  organization: z.string().min(1, "Organization is required").max(100),
  phoneNumber: z
    .string()
    .regex(
      /^\+?[0-9\s\-()]{10,20}$/,
      "Invalid phone number (10-15 digits, spaces and dashes allowed)",
    ),
  email: z.string().email("Invalid email address"),
  assignedDistricts: z.array(z.string()).min(1, "Select at least one district"),
  credentials: z.string().max(500).default(""),
});

export type FieldWorkerFormData = z.infer<typeof fieldWorkerFormSchema>;

// Donation Form Schema
export const donationFormSchema = z.object({
  amount: z.number().min(0.01, "Minimum donation is 0.01"),
  token: z.string().min(1, "Token is required"),
  message: z.string().max(200).default(""),
  isAnonymous: z.boolean().default(false),
});

export type DonationFormData = z.infer<typeof donationFormSchema>;

// Fund Pool Form Schema
export const fundPoolFormSchema = z
  .object({
    poolId: z
      .string()
      .min(1, "Pool ID is required")
      .max(32, "Pool ID must be 32 characters or less")
      .regex(
        /^[a-z0-9-]+$/,
        "Pool ID can only contain lowercase letters, numbers, and hyphens",
      ),
    disasterId: z
      .string()
      .min(1, "Please select a disaster event")
      .max(32, "Disaster ID must be 32 characters or less"),
    name: z
      .string()
      .min(1, "Pool name is required")
      .max(100, "Pool name must be 100 characters or less"),
    description: z
      .string()
      .max(500, "Description must be 500 characters or less")
      .default(""),
    distributionType: z.enum(["Equal", "WeightedFamily", "WeightedDamage"], {
      message: "Please select a distribution type",
    }),
    tokenMint: z.string().min(1, "Please select a token"),
    eligibilityCriteria: z
      .string()
      .max(500, "Eligibility criteria must be 500 characters or less")
      .default(""),
    minimumFamilySize: z
      .number()
      .min(1, "Minimum family size must be at least 1")
      .optional(),
    minimumDamageSeverity: z
      .number()
      .min(1, "Minimum damage severity must be at least 1")
      .max(10, "Maximum damage severity is 10")
      .optional(),
    targetAmount: z
      .number()
      .min(0, "Target amount cannot be negative")
      .optional(),
    timeLockDuration: z
      .number()
      .min(0, "Time lock duration cannot be negative")
      .optional(),
    distributionPercentageImmediate: z
      .number()
      .min(0, "Immediate distribution must be between 0-100%")
      .max(100, "Immediate distribution must be between 0-100%")
      .default(100),
    distributionPercentageLocked: z
      .number()
      .min(0, "Locked distribution must be between 0-100%")
      .max(100, "Locked distribution must be between 0-100%")
      .default(0),
  })
  .refine(
    (data) =>
      data.distributionPercentageImmediate +
        data.distributionPercentageLocked ===
      100,
    {
      message: "Immediate and locked distribution must add up to 100%",
      path: ["distributionPercentageLocked"],
    },
  );

export type FundPoolFormData = z.infer<typeof fundPoolFormSchema>;
