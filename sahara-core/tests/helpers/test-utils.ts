import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";

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

export function derivePlatformConfigPDA(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

export function deriveDisasterPDA(
    disasterId: string,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("disaster"), Buffer.from(disasterId)],
        programId
    );
}

export function deriveNGOPDA(
    authority: PublicKey,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("ngo"), authority.toBuffer()],
        programId
    );
}

export function deriveFieldWorkerPDA(
    authority: PublicKey,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("field-worker"), authority.toBuffer()],
        programId
    );
}

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

export function deriveDistributionPDA(
    beneficiary: PublicKey,
    pool: PublicKey,
    programId: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("distribution"), beneficiary.toBuffer(), pool.toBuffer()],
        programId
    );
}

export function deriveDonationRecordPDA(
    donor: PublicKey,
    recipient: PublicKey,
    timestamp: number,
    programId: PublicKey
): [PublicKey, number] {
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(timestamp));

    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("donation"),
            donor.toBuffer(),
            recipient.toBuffer(),
            timestampBuffer,
        ],
        programId
    );
}

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

export async function createTokenAccount(
    connection: Connection,
    payer: Keypair,
    mint: PublicKey,
    owner: PublicKey
): Promise<PublicKey> {
    return await createAccount(
        connection,
        payer,
        mint,
        owner,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
    );
}

export async function mintTokens(
    connection: Connection,
    payer: Keypair,
    mint: PublicKey,
    destination: PublicKey,
    amount: number
): Promise<void> {
    await mintTo(
        connection,
        payer,
        mint,
        destination,
        payer.publicKey,
        amount,
        [],
        undefined,
        TOKEN_PROGRAM_ID
    );
}

export function getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
}

export async function wait(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function deriveAdminActionPDA(
    admin: PublicKey,
    timestamp: number,
    programId: PublicKey
): [PublicKey, number] {
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(timestamp));

    return PublicKey.findProgramAddressSync(
        [Buffer.from("admin-action"), admin.toBuffer(), timestampBuffer],
        programId
    );
}

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
