import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";

/**
 * Airdrop SOL to an account
 */
export async function airdropSOL(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 5 * LAMPORTS_PER_SOL
): Promise<void> {
  const signature = await connection.requestAirdrop(publicKey, amount);
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });
}

/**
 * Derive PlatformConfig PDA
 */
export function derivePlatformConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

/**
 * Derive NGO PDA
 */
export function deriveNGOPDA(authority: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("ngo"), authority.toBuffer()],
    programId
  );
}

/**
 * Derive FieldWorker PDA
 */
export function deriveFieldWorkerPDA(authority: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("field-worker"), authority.toBuffer()],
    programId
  );
}

/**
 * Create a new SPL token mint
 */
export async function createTokenMint(
  connection: Connection,
  payer: Keypair,
  decimals: number = 6
): Promise<PublicKey> {
  return await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    decimals,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );
}

let timestampCounter = 0;

/**
 * Get unique timestamp for each call to avoid PDA collisions
 */
export function getCurrentTimestamp(): number {
  const base = Math.floor(Date.now() / 1000);
  return base + timestampCounter++;
}

/**
 * Derive Disaster PDA
 */
export function deriveDisasterPDA(eventId: string, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("disaster"), Buffer.from(eventId)],
    programId
  );
}

/**
 * Derive Beneficiary PDA
 */
export function deriveBeneficiaryPDA(
  authority: PublicKey,
  disasterId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("beneficiary"), authority.toBuffer(), Buffer.from(disasterId)],
    programId
  );
}

/**
 * Derive Phone Registry PDA
 */
export function derivePhoneRegistryPDA(
  disasterId: string,
  phoneNumber: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("phone-registry"), Buffer.from(disasterId), Buffer.from(phoneNumber)],
    programId
  );
}

/**
 * Derive National ID Registry PDA
 */
export function deriveNationalIdRegistryPDA(
  disasterId: string,
  nationalId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("national-id-registry"), Buffer.from(disasterId), Buffer.from(nationalId)],
    programId
  );
}

/**
 * Derive Fund Pool PDA
 */
export function deriveFundPoolPDA(
  disasterId: string,
  poolId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), Buffer.from(disasterId), Buffer.from(poolId)],
    programId
  );
}

/**
 * Derive Pool Token Account PDA
 */
export function derivePoolTokenAccountPDA(
  disasterId: string,
  poolId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool-token"), Buffer.from(disasterId), Buffer.from(poolId)],
    programId
  );
}

/**
 * Derive Pool Registration PDA
 */
export function derivePoolRegistrationPDA(
  poolKey: PublicKey,
  beneficiaryAuthority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool-registration"), poolKey.toBuffer(), beneficiaryAuthority.toBuffer()],
    programId
  );
}

/**
 * Derive Distribution PDA
 */
export function deriveDistributionPDA(
  beneficiaryAuthority: PublicKey,
  poolKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("distribution"), beneficiaryAuthority.toBuffer(), poolKey.toBuffer()],
    programId
  );
}
