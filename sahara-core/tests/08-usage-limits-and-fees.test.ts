import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SaharasolCore } from "../target/types/saharasol_core";
import {
  derivePlatformConfigPDA,
  deriveNGOPDA,
  deriveDisasterPDA,
  deriveFieldWorkerPDA,
  deriveBeneficiaryPDA,
  airdropSOL,
  getCurrentTimestamp,
  createTokenMint,
} from "./helpers/test-utils";
import {
  createMockNGOParams,
  createMockDisasterParams,
  createMockFieldWorkerParams,
  createMockBeneficiaryParams,
  createMockFundPoolParams,
} from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";
import {
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";

describe("08 - Usage Limits and Fee Rates", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
  const admin = provider.wallet as anchor.Wallet;

  let platformConfigPDA: PublicKey;
  let verifiedNgoAuthority: Keypair;
  let unverifiedNgoAuthority: Keypair;
  let verifiedNgoPDA: PublicKey;
  let unverifiedNgoPDA: PublicKey;
  let disasterPDA: PublicKey;
  let usdcMint: PublicKey;
  let donor: Keypair;

  const disasterId = "DISASTER-LIMITS-001";

  before(async () => {
    [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

    // Create keypairs
    verifiedNgoAuthority = Keypair.generate();
    unverifiedNgoAuthority = Keypair.generate();
    donor = Keypair.generate();

    // Airdrop SOL
    await airdropSOL(provider.connection, verifiedNgoAuthority.publicKey);
    await airdropSOL(provider.connection, unverifiedNgoAuthority.publicKey);
    await airdropSOL(provider.connection, donor.publicKey);

    [verifiedNgoPDA] = deriveNGOPDA(verifiedNgoAuthority.publicKey, program.programId);
    [unverifiedNgoPDA] = deriveNGOPDA(unverifiedNgoAuthority.publicKey, program.programId);
    [disasterPDA] = deriveDisasterPDA(disasterId, program.programId);

    // Get USDC mint from platform config
    const config = await program.account.platformConfig.fetch(platformConfigPDA);
    usdcMint = config.usdcMint;


    // Register verified NGO
    const verifiedNgoParams = createMockNGOParams({
      name: "Verified NGO for Limits Test",
      registrationNumber: "NGO-VER-LIMITS-001",
      email: "verified@limits.org",
    });

    await program.methods
      .registerNgo(verifiedNgoParams)
      .accountsPartial({
        authority: verifiedNgoAuthority.publicKey,
        config: platformConfigPDA,
      })
      .signers([verifiedNgoAuthority])
      .rpc();

    // Register unverified NGO
    const unverifiedNgoParams = createMockNGOParams({
      name: "Unverified NGO for Limits Test",
      registrationNumber: "NGO-UNVER-LIMITS-001",
      email: "unverified@limits.org",
      phoneNumber: "+000-87654321",
    });

    await program.methods
      .registerNgo(unverifiedNgoParams)
      .accountsPartial({
        authority: unverifiedNgoAuthority.publicKey,
        config: platformConfigPDA,
      })
      .signers([unverifiedNgoAuthority])
      .rpc();

    // Verify the first NGO
    const actionId = getCurrentTimestamp();
    const [adminActionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("admin-action"),
        admin.publicKey.toBuffer(),
        Buffer.from(new anchor.BN(actionId).toArray("le", 8)),
      ],
      program.programId
    );

    await program.methods
      .verifyNgo(
        verifiedNgoAuthority.publicKey,
        { reason: "Verified for testing" },
        new anchor.BN(actionId)
      )
      .accountsPartial({
        ngo: verifiedNgoPDA,
        config: platformConfigPDA,
        adminAction: adminActionPDA,
        admin: admin.publicKey,
      })
      .rpc();

    // Create disaster (need to pass NGO in remaining accounts for verification check)
    const disasterParams = createMockDisasterParams({
      eventId: disasterId,
      name: "Test Disaster for Limits",
    });

    const timestamp = getCurrentTimestamp();
    const [activityLogPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("activity"),
        verifiedNgoAuthority.publicKey.toBuffer(),
        Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
      ],
      program.programId
    );

    await program.methods
      .initializeDisaster(disasterParams, new anchor.BN(timestamp))
      .accountsPartial({
        authority: verifiedNgoAuthority.publicKey,
        config: platformConfigPDA,
      })
      .remainingAccounts([{ pubkey: verifiedNgoPDA, isWritable: false, isSigner: false }])
      .signers([verifiedNgoAuthority])
      .rpc();
  });


  describe("Pool Creation Limits", () => {
    it("unverified NGO should be limited to 5 pools", async () => {
      // Create 5 pools successfully
      for (let i = 0; i < 5; i++) {
        const poolId = `POOL-UNVER-${i}`;
        const timestamp = getCurrentTimestamp();

        const [poolPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("pool"), Buffer.from(disasterId), Buffer.from(poolId)],
          program.programId
        );

        const [poolTokenAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("pool-token"), Buffer.from(disasterId), Buffer.from(poolId)],
          program.programId
        );

        const [activityLogPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("activity"),
            unverifiedNgoAuthority.publicKey.toBuffer(),
            Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
          ],
          program.programId
        );

        const poolParams = createMockFundPoolParams({
          name: `Unverified Pool ${i}`,
        });

        await program.methods
          .createFundPool(disasterId, poolId, new anchor.BN(timestamp), poolParams)
          .accountsPartial({
            ngoAuthority: unverifiedNgoAuthority.publicKey,
            payer: unverifiedNgoAuthority.publicKey,
            tokenMint: usdcMint,
          })
          .signers([unverifiedNgoAuthority])
          .rpc();
      }

      const ngo = await program.account.ngo.fetch(unverifiedNgoPDA);
      expect(ngo.poolsCreated).to.equal(5);

      // Try to create 6th pool - should fail
      const poolId = "POOL-UNVER-6";
      const timestamp = getCurrentTimestamp();

      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(disasterId), Buffer.from(poolId)],
        program.programId
      );

      const [poolTokenAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-token"), Buffer.from(disasterId), Buffer.from(poolId)],
        program.programId
      );

      const [activityLogPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("activity"),
          unverifiedNgoAuthority.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      const poolParams = createMockFundPoolParams({
        name: "Should Fail Pool",
      });

      await expectError(
        program.methods
          .createFundPool(disasterId, poolId, new anchor.BN(timestamp), poolParams)
          .accountsPartial({
            ngoAuthority: unverifiedNgoAuthority.publicKey,
            payer: unverifiedNgoAuthority.publicKey,
            tokenMint: usdcMint,
          })
          .signers([unverifiedNgoAuthority])
          .rpc(),
        "PoolLimitReached"
      );
    });


    it("verified NGO should be able to create up to 10 pools", async () => {
      // Create 10 pools successfully
      for (let i = 0; i < 10; i++) {
        const poolId = `POOL-VER-${i}`;
        const timestamp = getCurrentTimestamp();

        const [poolPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("pool"), Buffer.from(disasterId), Buffer.from(poolId)],
          program.programId
        );

        const [poolTokenAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("pool-token"), Buffer.from(disasterId), Buffer.from(poolId)],
          program.programId
        );

        const [activityLogPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("activity"),
            verifiedNgoAuthority.publicKey.toBuffer(),
            Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
          ],
          program.programId
        );

        const poolParams = createMockFundPoolParams({
          name: `Verified Pool ${i}`,
        });

        await program.methods
          .createFundPool(disasterId, poolId, new anchor.BN(timestamp), poolParams)
          .accountsPartial({
            ngoAuthority: verifiedNgoAuthority.publicKey,
            payer: verifiedNgoAuthority.publicKey,
            tokenMint: usdcMint,
          })
          .signers([verifiedNgoAuthority])
          .rpc();
      }

      const ngo = await program.account.ngo.fetch(verifiedNgoPDA);
      expect(ngo.poolsCreated).to.equal(10);
    });
  });

  describe("Verification-Based Fee Rates", () => {
    let verifiedPoolPDA: PublicKey;
    let unverifiedPoolPDA: PublicKey;
    let donorTokenAccount: PublicKey;
    let verifiedPoolTokenAccount: PublicKey;
    let unverifiedPoolTokenAccount: PublicKey;
    let platformFeeRecipient: PublicKey;
    let initialFeesCollected: number;

    before(async () => {
      // Use first pool from each NGO
      [verifiedPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(disasterId), Buffer.from("POOL-VER-0")],
        program.programId
      );

      [unverifiedPoolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), Buffer.from(disasterId), Buffer.from("POOL-UNVER-0")],
        program.programId
      );

      [verifiedPoolTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-token"), Buffer.from(disasterId), Buffer.from("POOL-VER-0")],
        program.programId
      );

      [unverifiedPoolTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-token"), Buffer.from(disasterId), Buffer.from("POOL-UNVER-0")],
        program.programId
      );

      // Get platform fee recipient from config
      const platformConfig = await program.account.platformConfig.fetch(platformConfigPDA);
      const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
      platformFeeRecipient = getAssociatedTokenAddressSync(usdcMint, platformConfig.platformFeeRecipient);

      // Create platform fee recipient token account if it doesn't exist
      try {
        await createAssociatedTokenAccount(
          provider.connection,
          admin.payer,
          usdcMint,
          platformConfig.platformFeeRecipient
        );
      } catch (e) {
        // Account might already exist from previous tests
      }

      // Create donor token account
      donorTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        donor,
        usdcMint,
        donor.publicKey
      );

      // Mint tokens to donor
      await mintTo(
        provider.connection,
        admin.payer,
        usdcMint,
        donorTokenAccount,
        admin.payer,
        1_000_000_000_000 // 1M USDC
      );

      // Record initial fees collected for comparison
      initialFeesCollected = platformConfig.totalFeesCollected.toNumber();
    });


    it("should charge 3% fee for unverified NGO donations", async () => {
      const donationAmount = new anchor.BN(100_000_000); // 100 USDC
      const timestamp = getCurrentTimestamp();

      const [donationRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("donation"),
          donor.publicKey.toBuffer(),
          unverifiedPoolPDA.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      const [activityLogPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("activity"),
          donor.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      const feeRecipientBefore = await getAccount(provider.connection, platformFeeRecipient);
      const poolBefore = await getAccount(provider.connection, unverifiedPoolTokenAccount);

      await program.methods
        .donateToPool(
          disasterId,
          "POOL-UNVER-0",
          {
            amount: donationAmount,
            isAnonymous: false,
            message: "Test donation to unverified NGO",
          },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          pool: unverifiedPoolPDA,
          poolTokenAccount: unverifiedPoolTokenAccount,
          donationRecord: donationRecordPDA,
          donorTokenAccount: donorTokenAccount,
          config: platformConfigPDA,
          platformFeeRecipient: platformFeeRecipient,
          activityLog: activityLogPDA,
          donor: donor.publicKey,
        })
        .remainingAccounts([{ pubkey: unverifiedNgoPDA, isWritable: false, isSigner: false }])
        .signers([donor])
        .rpc();

      const feeRecipientAfter = await getAccount(provider.connection, platformFeeRecipient);
      const poolAfter = await getAccount(provider.connection, unverifiedPoolTokenAccount);

      // 3% fee = 3_000_000 (3 USDC)
      const expectedFee = 3_000_000;
      const expectedNetAmount = 97_000_000;

      expect(Number(feeRecipientAfter.amount) - Number(feeRecipientBefore.amount)).to.equal(expectedFee);
      expect(Number(poolAfter.amount) - Number(poolBefore.amount)).to.equal(expectedNetAmount);
    });

    it("should charge 1.5% fee for verified NGO donations", async () => {
      const donationAmount = new anchor.BN(100_000_000); // 100 USDC
      const timestamp = getCurrentTimestamp();

      const [donationRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("donation"),
          donor.publicKey.toBuffer(),
          verifiedPoolPDA.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      const [activityLogPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("activity"),
          donor.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      const feeRecipientBefore = await getAccount(provider.connection, platformFeeRecipient);
      const poolBefore = await getAccount(provider.connection, verifiedPoolTokenAccount);

      await program.methods
        .donateToPool(
          disasterId,
          "POOL-VER-0",
          {
            amount: donationAmount,
            isAnonymous: false,
            message: "Test donation to verified NGO",
          },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          pool: verifiedPoolPDA,
          poolTokenAccount: verifiedPoolTokenAccount,
          donationRecord: donationRecordPDA,
          donorTokenAccount: donorTokenAccount,
          config: platformConfigPDA,
          platformFeeRecipient: platformFeeRecipient,
          activityLog: activityLogPDA,
          donor: donor.publicKey,
        })
        .remainingAccounts([{ pubkey: verifiedNgoPDA, isWritable: false, isSigner: false }])
        .signers([donor])
        .rpc();

      const feeRecipientAfter = await getAccount(provider.connection, platformFeeRecipient);
      const poolAfter = await getAccount(provider.connection, verifiedPoolTokenAccount);

      // 1.5% fee = 1_500_000 (1.5 USDC)
      const expectedFee = 1_500_000;
      const expectedNetAmount = 98_500_000;

      expect(Number(feeRecipientAfter.amount) - Number(feeRecipientBefore.amount)).to.equal(expectedFee);
      expect(Number(poolAfter.amount) - Number(poolBefore.amount)).to.equal(expectedNetAmount);
    });

    it("should track total fees collected", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);

      // Total fees from this test: 3_000_000 (unverified) + 1_500_000 (verified) = 4_500_000
      const feesCollectedInThisTest = config.totalFeesCollected.toNumber() - initialFeesCollected;
      expect(feesCollectedInThisTest).to.equal(4_500_000);
    });
  });
});
