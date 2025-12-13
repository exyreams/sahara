import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

// Disaster Form Schema - Global Support (matches contract constraints exactly)
export const disasterFormSchema = z.object({
  eventId: z
    .string()
    .min(1, "Event ID is required")
    .max(50, "Event ID must be 50 characters or less") // Contract: MAX_EVENT_ID_LEN = 50
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      "Event ID can only contain letters, numbers, hyphens, and underscores",
    ),
  name: z
    .string()
    .min(1, "Disaster name is required")
    .max(100, "Name must be 100 characters or less"), // Contract: MAX_NAME_LEN = 100
  eventType: z
    .string()
    .min(1, "Please select a disaster type")
    .refine(
      (val) =>
        [
          // Natural Disasters - Geological
          "Earthquake",
          "Volcano",
          "Landslide",
          "Avalanche",
          "Sinkhole",
          // Natural Disasters - Weather/Climate
          "Flood",
          "Hurricane",
          "Tornado",
          "Drought",
          "Wildfire",
          "Blizzard",
          "Heatwave",
          "Tsunami",
          // Human-Made Disasters
          "IndustrialAccident",
          "ChemicalSpill",
          "NuclearAccident",
          "OilSpill",
          "BuildingCollapse",
          "Transportation",
          // Conflict & Security
          "Conflict",
          "Terrorism",
          "CivilUnrest",
          // Health & Biological
          "Pandemic",
          "FoodPoisoning",
          "AnimalAttack",
          // Other
          "Other",
        ].includes(val),
      { message: "Please select a valid disaster type" },
    ),
  severity: z
    .number()
    .min(1, "Severity must be at least 1")
    .max(10, "Severity cannot exceed 10")
    .int("Severity must be a whole number"),
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  country: z
    .string()
    .min(1, "Country is required")
    .length(2, "Country must be a valid 2-letter ISO code"), // Contract: MAX_COUNTRY_LEN = 2
  region: z
    .string()
    .min(1, "Region/State is required")
    .max(100, "Region must be 100 characters or less"), // Contract: MAX_REGION_LEN = 100
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be 100 characters or less"), // Contract: MAX_CITY_LEN = 100
  area: z
    .string()
    .max(200, "Area must be 200 characters or less") // Contract: MAX_AREA_LEN = 200
    .optional()
    .default(""),
  affectedAreas: z
    .array(
      z
        .string()
        .min(1, "Area name cannot be empty")
        .max(50, "Area name must be 50 characters or less"), // Contract: MAX_AREA_NAME_LEN = 50
    )
    .max(20, "Maximum 20 affected areas allowed") // Contract: MAX_AFFECTED_AREAS = 20
    .default([]),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less") // Contract: MAX_DESCRIPTION_LEN = 500
    .optional()
    .default(""),
  estimatedAffectedPopulation: z
    .number()
    .min(1, "Estimated affected population must be at least 1")
    .max(4294967295, "Population number too large (maximum: 4,294,967,295)") // u32 max value
    .int("Population must be a whole number"),
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
  country: z
    .string()
    .min(1, "Country is required")
    .length(2, "Country must be a valid 2-letter ISO code"),
  region: z.string().min(1, "Region is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  area: z.string().max(200).default(""),
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
