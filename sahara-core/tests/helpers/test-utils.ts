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
