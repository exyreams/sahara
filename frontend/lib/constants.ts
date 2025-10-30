import { PublicKey } from "@solana/web3.js";

// Program ID
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "EuN6BXkDt6jqRfDBQ2ePW8PyvjvkDNyuGmAh5qrXHNFe",
);

// RPC Configuration
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || "https://api.devnet.solana.com";

export const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

// Solana Explorer URLs
export const EXPLORER_URL = {
  devnet: "https://explorer.solana.com",
  testnet: "https://explorer.solana.com",
  mainnet: "https://explorer.solana.com",
};

// Transaction Confirmation
export const COMMITMENT = "confirmed" as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Validation Constants
export const MIN_SEVERITY = 1;
export const MAX_SEVERITY = 10;
export const MIN_FAMILY_SIZE = 1;
export const MAX_FAMILY_SIZE = 50;
export const MIN_AGE = 0;
export const MAX_AGE = 150;
export const MAX_STRING_LENGTH = 200;
export const MAX_NAME_LENGTH = 100;
export const MAX_PHONE_LENGTH = 15;
export const MAX_EMAIL_LENGTH = 100;

// Disaster Types
export const DISASTER_TYPES = [
  { value: "Earthquake", label: "Earthquake" },
  { value: "Flood", label: "Flood" },
  { value: "Landslide", label: "Landslide" },
  { value: "Other", label: "Other" },
] as const;

// Distribution Types
export const DISTRIBUTION_TYPES = [
  { value: "Equal", label: "Equal Distribution" },
  { value: "WeightedFamily", label: "Weighted by Family Size" },
  { value: "WeightedDamage", label: "Weighted by Damage Severity" },
  { value: "Milestone", label: "Milestone-based" },
] as const;

// Verification Status
export const VERIFICATION_STATUSES = [
  { value: "Pending", label: "Pending", color: "yellow" },
  { value: "Verified", label: "Verified", color: "green" },
  { value: "Flagged", label: "Flagged", color: "red" },
  { value: "Rejected", label: "Rejected", color: "gray" },
] as const;

// Nepal Districts (sample - add more as needed)
export const NEPAL_DISTRICTS = [
  "Achham",
  "Arghakhanchi",
  "Baglung",
  "Baitadi",
  "Bajhang",
  "Bajura",
  "Banke",
  "Bara",
  "Bardiya",
  "Bhaktapur",
  "Bhojpur",
  "Chitwan",
  "Dadeldhura",
  "Dailekh",
  "Dang",
  "Darchula",
  "Dhading",
  "Dhankuta",
  "Dhanusha",
  "Doti",
  "Dolakha",
  "Dolpa",
  "Eastern Rukum",
  "Gorkha",
  "Gulmi",
  "Humla",
  "Ilam",
  "Jajarkot",
  "Jhapa",
  "Jumla",
  "Kailali",
  "Kalikot",
  "Kanchanpur",
  "Kapilvastu",
  "Kaski",
  "Kathmandu",
  "Kavrepalanchok",
  "Khotang",
  "Lalitpur",
  "Lamjung",
  "Mahottari",
  "Makwanpur",
  "Manang",
  "Morang",
  "Mugu",
  "Mustang",
  "Myagdi",
  "Nawalpur",
  "Nuwakot",
  "Okhaldhunga",
  "Palpa",
  "Panchthar",
  "Parasi",
  "Parbat",
  "Parsa",
  "Pyuthan",
  "Ramechhap",
  "Rasuwa",
  "Rautahat",
  "Rolpa",
  "Rupandehi",
  "Salyan",
  "Sankhuwasabha",
  "Saptari",
  "Sarlahi",
  "Sindhuli",
  "Sindhupalchok",
  "Siraha",
  "Solukhumbu",
  "Sunsari",
  "Surkhet",
  "Syangja",
  "Tanahun",
  "Taplejung",
  "Tehrathum",
  "Udayapur",
  "Western Rukum",
] as const;

// Focus Areas for NGOs
export const NGO_FOCUS_AREAS = [
  "Emergency Relief",
  "Food Distribution",
  "Shelter",
  "Medical Aid",
  "Education",
  "Livelihood",
  "Water & Sanitation",
  "Child Protection",
  "Women Empowerment",
  "Elderly Care",
  "Disability Support",
  "Mental Health",
  "Reconstruction",
  "Community Development",
] as const;

// NGO Validation Limits (from smart contract)
export const NGO_LIMITS = {
  MAX_NAME_LENGTH: 150,
  MAX_REGISTRATION_NUMBER_LENGTH: 50,
  MAX_EMAIL_LENGTH: 100,
  MAX_PHONE_LENGTH: 20,
  MAX_WEBSITE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_ADDRESS_LENGTH: 300,
  MAX_DISTRICTS: 20,
  MAX_FOCUS_AREAS: 10,
  MAX_CONTACT_NAME_LENGTH: 100,
  MAX_CONTACT_ROLE_LENGTH: 100,
} as const;

// Token Decimals
export const USDC_DECIMALS = 6;
export const SOL_DECIMALS = 9;

// Minimum Donation (in lamports/smallest unit)
export const MIN_DONATION_USDC = 1_000_000; // 1 USDC
export const MIN_DONATION_SOL = 10_000_000; // 0.01 SOL

// Date Formats
export const DATE_FORMAT = "MMM DD, YYYY";
export const DATETIME_FORMAT = "MMM DD, YYYY HH:mm";
export const TIME_FORMAT = "HH:mm";

// Toast Duration
export const TOAST_DURATION = 5000; // 5 seconds

// Debounce Delay
export const SEARCH_DEBOUNCE_DELAY = 300; // 300ms

// Map Configuration
export const DEFAULT_MAP_CENTER = {
  lat: 27.7172, // Kathmandu
  lng: 85.324,
};

export const DEFAULT_MAP_ZOOM = 7;

// Multi-sig Verification
export const VERIFICATION_THRESHOLD = 3;
export const MAX_VERIFIERS = 5;
