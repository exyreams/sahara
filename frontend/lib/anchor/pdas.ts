import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./idl";

/**
 * Derive Platform Config PDA
 * Seeds: ["config"]
 */
export function derivePlatformConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}

/**
 * Derive Disaster Event PDA
 * Seeds: ["disaster", event_id]
 */
export function deriveDisasterPDA(eventId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("disaster"), Buffer.from(eventId)],
    PROGRAM_ID,
  );
}

/**
 * Derive NGO PDA
 * Seeds: ["ngo", authority]
 */
export function deriveNGOPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("ngo"), authority.toBuffer()],
    PROGRAM_ID,
  );
}

/**
 * Derive Field Worker PDA
 * Seeds: ["field-worker", authority]
 */
export function deriveFieldWorkerPDA(
  authority: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("field-worker"), authority.toBuffer()],
    PROGRAM_ID,
  );
}

/**
 * Derive Beneficiary PDA
 * Seeds: ["beneficiary", authority, disaster_id]
 */
export function deriveBeneficiaryPDA(
  authority: PublicKey,
  disasterId: string,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("beneficiary"), authority.toBuffer(), Buffer.from(disasterId)],
    PROGRAM_ID,
  );
}

/**
 * Derive Fund Pool PDA
 * Seeds: ["pool", disaster_id, pool_id]
 */
export function deriveFundPoolPDA(
  disasterId: string,
  poolId: string,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), Buffer.from(disasterId), Buffer.from(poolId)],
    PROGRAM_ID,
  );
}

/**
 * Derive Pool Token Account PDA
 * Seeds: ["pool-token", disaster_id, pool_id]
 */
export function derivePoolTokenAccountPDA(
  disasterId: string,
  poolId: string,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool-token"), Buffer.from(disasterId), Buffer.from(poolId)],
    PROGRAM_ID,
  );
}

/**
 * Derive Distribution PDA
 * Seeds: ["distribution", beneficiary, pool]
 */
export function deriveDistributionPDA(
  beneficiary: PublicKey,
  pool: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("distribution"), beneficiary.toBuffer(), pool.toBuffer()],
    PROGRAM_ID,
  );
}

/**
 * Derive Donation Record PDA
 * Seeds: ["donation", donor, recipient, timestamp]
 */
export function deriveDonationRecordPDA(
  donor: PublicKey,
  recipient: PublicKey,
  timestamp: number,
): [PublicKey, number] {
  const timestampBuffer = new Uint8Array(8);
  const view = new DataView(timestampBuffer.buffer);
  view.setBigInt64(0, BigInt(timestamp), true); // true = little-endian

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("donation"),
      donor.toBuffer(),
      recipient.toBuffer(),
      Buffer.from(timestampBuffer),
    ],
    PROGRAM_ID,
  );
}

/**
 * Derive Admin Action PDA
 * Seeds: ["admin-action", admin, timestamp]
 */
export function deriveAdminActionPDA(
  admin: PublicKey,
  timestamp: number,
): [PublicKey, number] {
  const timestampBuffer = new Uint8Array(8);
  const view = new DataView(timestampBuffer.buffer);
  view.setBigInt64(0, BigInt(timestamp), true); // true = little-endian

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("admin-action"),
      admin.toBuffer(),
      Buffer.from(timestampBuffer),
    ],
    PROGRAM_ID,
  );
}
/**
 * Derive Activity Log PDA
 * Seeds: ["activity", actor, timestamp]
 */
export function deriveActivityLogPDA(
  actor: PublicKey,
  timestamp: number,
): [PublicKey, number] {
  const timestampBuffer = new Uint8Array(8);
  const view = new DataView(timestampBuffer.buffer);
  view.setBigInt64(0, BigInt(timestamp), true); // true = little-endian

  return PublicKey.findProgramAddressSync(
    [Buffer.from("activity"), actor.toBuffer(), Buffer.from(timestampBuffer)],
    PROGRAM_ID,
  );
}

/**
 * Derive Phone Registry PDA
 * Seeds: ["phone-registry", disaster_id, phone_number]
 */
export function derivePhoneRegistryPDA(
  disasterId: string,
  phoneNumber: string,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("phone-registry"),
      Buffer.from(disasterId),
      Buffer.from(phoneNumber),
    ],
    PROGRAM_ID,
  );
}

/**
 * Derive National ID Registry PDA
 * Seeds: ["national-id-registry", disaster_id, national_id]
 */
export function deriveNationalIdRegistryPDA(
  disasterId: string,
  nationalId: string,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("national-id-registry"),
      Buffer.from(disasterId),
      Buffer.from(nationalId),
    ],
    PROGRAM_ID,
  );
}

/**
 * Derive Pool Registration PDA
 * Seeds: ["pool_registration", pool, beneficiary]
 */
export function derivePoolRegistrationPDA(
  pool: PublicKey,
  beneficiary: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool-registration"), pool.toBuffer(), beneficiary.toBuffer()],
    PROGRAM_ID,
  );
}

/**
 * Derive Pool Registration Activity Log PDA
 * Seeds: ["activity", pool, beneficiary, timestamp]
 */
export function derivePoolRegistrationActivityLogPDA(
  pool: PublicKey,
  beneficiary: PublicKey,
  timestamp: number,
): [PublicKey, number] {
  const timestampBuffer = new Uint8Array(8);
  const view = new DataView(timestampBuffer.buffer);
  view.setBigInt64(0, BigInt(timestamp), true); // true = little-endian

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("activity"),
      pool.toBuffer(),
      beneficiary.toBuffer(),
      Buffer.from(timestampBuffer),
    ],
    PROGRAM_ID,
  );
}

/**
 * Derive Pool Activity Log PDA (for lock registration, etc.)
 * Seeds: ["activity", pool, timestamp]
 */
export function derivePoolActivityLogPDA(
  pool: PublicKey,
  timestamp: number,
): [PublicKey, number] {
  const timestampBuffer = new Uint8Array(8);
  const view = new DataView(timestampBuffer.buffer);
  view.setBigInt64(0, BigInt(timestamp), true); // true = little-endian

  return PublicKey.findProgramAddressSync(
    [Buffer.from("activity"), pool.toBuffer(), Buffer.from(timestampBuffer)],
    PROGRAM_ID,
  );
}
