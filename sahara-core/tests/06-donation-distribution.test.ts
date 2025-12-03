import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { SaharasolCore } from "../target/types/saharasol_core";
import {
  derivePlatformConfigPDA,
  deriveDisasterPDA,
  deriveNGOPDA,
  deriveFieldWorkerPDA,
  deriveBeneficiaryPDA,
  deriveFundPoolPDA,
  derivePoolTokenAccountPDA,
  deriveDistributionPDA,
  airdropSOL,
  getCurrentTimestamp,
} from "./helpers/test-utils";
import {
  createMockDisasterParams,
  createMockNGOParams,
  createMockFieldWorkerParams,
  createMockBeneficiaryParams,
  createMockFundPoolParams,
} from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";

describe("06 - Donation & Distribution", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
  const admin = provider.wallet as anchor.Wallet;

  let platformConfigPDA: PublicKey;
  let ngoAuthority: Keypair;
  let ngoPDA: PublicKey;
  let fieldWorkerAuthority: Keypair;
  let fieldWorkerPDA: PublicKey;
  let fieldWorker2Authority: Keypair;
  let fieldWorker2PDA: PublicKey;
  let fieldWorker3Authority: Keypair;
  let fieldWorker3PDA: PublicKey;
  let disasterEventId: string;
  let disasterPDA: PublicKey;
  let usdcMint: PublicKey;
  let platformFeeRecipient: PublicKey;
  let beneficiaryAuthority: Keypair;
  let beneficiaryPDA: PublicKey;
  let beneficiaryUsdcAccount: PublicKey;

  before(async () => {
    [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

    const config = await program.account.platformConfig.fetch(platformConfigPDA);
    usdcMint = config.usdcMint;
    platformFeeRecipient = getAssociatedTokenAddressSync(usdcMint, config.platformFeeRecipient);

    // Create and verify NGO
    ngoAuthority = Keypair.generate();
    await airdropSOL(provider.connection, ngoAuthority.publicKey);
    [ngoPDA] = deriveNGOPDA(ngoAuthority.publicKey, program.programId);

    await program.methods
      .registerNgo(createMockNGOParams({ name: "Donation Test NGO" }))
      .accountsPartial({
        authority: ngoAuthority.publicKey,
        config: platformConfigPDA,
      })
      .signers([ngoAuthority])
      .rpc();

    const actionId = getCurrentTimestamp();
    await program.methods
      .verifyNgo(ngoAuthority.publicKey, { reason: "Verified" }, new anchor.BN(actionId))
      .accountsPartial({
        admin: admin.publicKey,
        ngo: ngoPDA,
        config: platformConfigPDA,
      })
      .rpc();

    // Register field workers
    fieldWorkerAuthority = Keypair.generate();
    await airdropSOL(provider.connection, fieldWorkerAuthority.publicKey);
    [fieldWorkerPDA] = deriveFieldWorkerPDA(fieldWorkerAuthority.publicKey, program.programId);

    await program.methods
      .registerFieldWorker(createMockFieldWorkerParams({ name: "Donation FW 1" }))
      .accountsPartial({
        fieldWorker: fieldWorkerPDA,
        ngo: ngoPDA,
        config: platformConfigPDA,
        authority: fieldWorkerAuthority.publicKey,
        ngoAuthority: ngoAuthority.publicKey,
        payer: ngoAuthority.publicKey,
      })
      .signers([ngoAuthority])
      .rpc();

    fieldWorker2Authority = Keypair.generate();
    await airdropSOL(provider.connection, fieldWorker2Authority.publicKey);
    [fieldWorker2PDA] = deriveFieldWorkerPDA(fieldWorker2Authority.publicKey, program.programId);

    await program.methods
      .registerFieldWorker(createMockFieldWorkerParams({ name: "Donation FW 2" }))
      .accountsPartial({
        fieldWorker: fieldWorker2PDA,
        ngo: ngoPDA,
        config: platformConfigPDA,
        authority: fieldWorker2Authority.publicKey,
        ngoAuthority: ngoAuthority.publicKey,
        payer: ngoAuthority.publicKey,
      })
      .signers([ngoAuthority])
      .rpc();

    fieldWorker3Authority = Keypair.generate();
    await airdropSOL(provider.connection, fieldWorker3Authority.publicKey);
    [fieldWorker3PDA] = deriveFieldWorkerPDA(fieldWorker3Authority.publicKey, program.programId);

    await program.methods
      .registerFieldWorker(createMockFieldWorkerParams({ name: "Donation FW 3" }))
      .accountsPartial({
        fieldWorker: fieldWorker3PDA,
        ngo: ngoPDA,
        config: platformConfigPDA,
        authority: fieldWorker3Authority.publicKey,
        ngoAuthority: ngoAuthority.publicKey,
        payer: ngoAuthority.publicKey,
      })
      .signers([ngoAuthority])
      .rpc();

    // Create disaster
    disasterEventId = `DONATION-TEST-${Date.now()}`;
    [disasterPDA] = deriveDisasterPDA(disasterEventId, program.programId);

    const disasterParams = createMockDisasterParams({ eventId: disasterEventId });
    const timestamp = getCurrentTimestamp();

    await program.methods
      .initializeDisaster(disasterParams, new anchor.BN(timestamp))
      .accountsPartial({
        authority: admin.publicKey,
        config: platformConfigPDA,
      })
      .rpc();

    // Register and verify beneficiary
    beneficiaryAuthority = Keypair.generate();
    [beneficiaryPDA] = deriveBeneficiaryPDA(beneficiaryAuthority.publicKey, disasterEventId, program.programId);

    const benParams = createMockBeneficiaryParams({
      disasterId: disasterEventId,
      phoneNumber: "+977-9800003001",
      nationalId: "DONATION-BEN-001",
      familySize: 5,
      damageSeverity: 8,
    });
    const ts1 = getCurrentTimestamp();

    await program.methods
      .registerBeneficiary(benParams, new anchor.BN(ts1))
      .accountsPartial({
        authority: beneficiaryAuthority.publicKey,
        fieldWorkerAuthority: fieldWorkerAuthority.publicKey,
        payer: fieldWorkerAuthority.publicKey,
        config: platformConfigPDA,
      })
      .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
      .signers([fieldWorkerAuthority])
      .rpc();

    // Verify beneficiary
    for (let i = 0; i < 3; i++) {
      const ts = getCurrentTimestamp();
      const fw = i === 0 ? fieldWorkerAuthority : i === 1 ? fieldWorker2Authority : fieldWorker3Authority;
      await program.methods
        .verifyBeneficiary(beneficiaryAuthority.publicKey, disasterEventId, new anchor.BN(ts))
        .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
        .signers([fw])
        .rpc();
    }

    // Create beneficiary USDC account
    beneficiaryUsdcAccount = getAssociatedTokenAddressSync(usdcMint, beneficiaryAuthority.publicKey);
    await createAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      usdcMint,
      beneficiaryAuthority.publicKey
    );
  });

  describe("donate_direct", () => {
    let donorKeypair: Keypair;
    let donorUsdcAccount: PublicKey;

    before(async () => {
      donorKeypair = Keypair.generate();
      await airdropSOL(provider.connection, donorKeypair.publicKey);
      donorUsdcAccount = getAssociatedTokenAddressSync(usdcMint, donorKeypair.publicKey);
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, donorKeypair.publicKey);
      await mintTo(provider.connection, admin.payer, usdcMint, donorUsdcAccount, admin.payer, 100000000000);
    });

    it("should donate directly to beneficiary", async () => {
      const amount = new anchor.BN(10000000); // 10 USDC
      const timestamp = getCurrentTimestamp();

      const benBefore = await program.account.beneficiary.fetch(beneficiaryPDA);
      const receivedBefore = benBefore.totalReceived.toNumber();

      await program.methods
        .donateDirect(
          beneficiaryAuthority.publicKey,
          disasterEventId,
          {
            amount: amount,
            message: "Hope this helps!",
            isAnonymous: false,
          },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          donor: donorKeypair.publicKey,
          donorTokenAccount: donorUsdcAccount,
          beneficiaryTokenAccount: beneficiaryUsdcAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .signers([donorKeypair])
        .rpc();

      const benAfter = await program.account.beneficiary.fetch(beneficiaryPDA);
      expect(benAfter.totalReceived.toNumber()).to.be.greaterThan(receivedBefore);
    });

    it("should fail with donation below minimum", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      const amount = config.minDonationAmount.sub(new anchor.BN(1));
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .donateDirect(
            beneficiaryAuthority.publicKey,
            disasterEventId,
            {
              amount: amount,
              message: "Too small",
              isAnonymous: false,
            },
            new anchor.BN(timestamp)
          )
          .accountsPartial({
            donor: donorKeypair.publicKey,
            donorTokenAccount: donorUsdcAccount,
            beneficiaryTokenAccount: beneficiaryUsdcAccount,
            platformFeeRecipient: platformFeeRecipient,
          })
          .signers([donorKeypair])
          .rpc(),
        "DonationBelowMinimum"
      );
    });

    it("should fail to donate to unverified beneficiary", async () => {
      const unverifiedBenAuthority = Keypair.generate();
      const benParams = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800003002",
        nationalId: "DONATION-UNVERIFIED",
      });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .registerBeneficiary(benParams, new anchor.BN(ts1))
        .accountsPartial({
          authority: unverifiedBenAuthority.publicKey,
          fieldWorkerAuthority: fieldWorkerAuthority.publicKey,
          payer: fieldWorkerAuthority.publicKey,
          config: platformConfigPDA,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([fieldWorkerAuthority])
        .rpc();

      const unverifiedUsdcAccount = getAssociatedTokenAddressSync(usdcMint, unverifiedBenAuthority.publicKey);
      await createAssociatedTokenAccount(
        provider.connection,
        admin.payer,
        usdcMint,
        unverifiedBenAuthority.publicKey
      );

      const amount = new anchor.BN(5000000);
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .donateDirect(
            unverifiedBenAuthority.publicKey,
            disasterEventId,
            {
              amount: amount,
              message: "Test",
              isAnonymous: false,
            },
            new anchor.BN(timestamp)
          )
          .accountsPartial({
            donor: donorKeypair.publicKey,
            donorTokenAccount: donorUsdcAccount,
            beneficiaryTokenAccount: unverifiedUsdcAccount,
            platformFeeRecipient: platformFeeRecipient,
          })
          .signers([donorKeypair])
          .rpc(),
        "BeneficiaryNotVerified"
      );
    });

    it("should increment disaster total_aid_distributed", async () => {
      const disasterBefore = await program.account.disasterEvent.fetch(disasterPDA);
      const aidBefore = disasterBefore.totalAidDistributed.toNumber();

      const amount = new anchor.BN(5000000);
      const timestamp = getCurrentTimestamp();

      await program.methods
        .donateDirect(
          beneficiaryAuthority.publicKey,
          disasterEventId,
          {
            amount: amount,
            message: "Another donation",
            isAnonymous: false,
          },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          donor: donorKeypair.publicKey,
          donorTokenAccount: donorUsdcAccount,
          beneficiaryTokenAccount: beneficiaryUsdcAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .signers([donorKeypair])
        .rpc();

      const disasterAfter = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disasterAfter.totalAidDistributed.toNumber()).to.be.greaterThan(aidBefore);
    });
  });

  describe("distribute_from_pool & claim_distribution", () => {
    let poolId: string;
    let poolPDA: PublicKey;
    let poolTokenAccount: PublicKey;
    let beneficiary2Authority: Keypair;
    let beneficiary2PDA: PublicKey;
    let beneficiary2UsdcAccount: PublicKey;
    let donorKeypair: Keypair;
    let donorUsdcAccount: PublicKey;

    before(async () => {
      // Create pool
      poolId = `DIST-POOL-${Date.now()}`;
      [poolPDA] = deriveFundPoolPDA(disasterEventId, poolId, program.programId);
      [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, poolId, program.programId);

      const params = createMockFundPoolParams({
        name: "Distribution Test Pool",
        distributionType: { weightedFamily: {} },
        distributionPercentageImmediate: 60,
        distributionPercentageLocked: 40,
        timeLockDuration: new anchor.BN(7 * 24 * 60 * 60), // 7 days
      });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, poolId, new anchor.BN(timestamp), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      // Register beneficiary1 for pool
      const ts1 = getCurrentTimestamp();
      await program.methods
        .registerBeneficiaryForPool(
          disasterEventId,
          poolId,
          { beneficiaryAuthority: beneficiaryAuthority.publicKey },
          new anchor.BN(ts1)
        )
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      // Register beneficiary2
      beneficiary2Authority = Keypair.generate();
      [beneficiary2PDA] = deriveBeneficiaryPDA(beneficiary2Authority.publicKey, disasterEventId, program.programId);

      const ben2Params = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800003003",
        nationalId: "DIST-BEN-002",
        familySize: 3,
        damageSeverity: 6,
      });
      const ts2 = getCurrentTimestamp();

      await program.methods
        .registerBeneficiary(ben2Params, new anchor.BN(ts2))
        .accountsPartial({
          authority: beneficiary2Authority.publicKey,
          fieldWorkerAuthority: fieldWorkerAuthority.publicKey,
          payer: fieldWorkerAuthority.publicKey,
          config: platformConfigPDA,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([fieldWorkerAuthority])
        .rpc();

      // Verify beneficiary2
      for (let i = 0; i < 3; i++) {
        const ts = getCurrentTimestamp();
        const fw = i === 0 ? fieldWorkerAuthority : i === 1 ? fieldWorker2Authority : fieldWorker3Authority;
        await program.methods
          .verifyBeneficiary(beneficiary2Authority.publicKey, disasterEventId, new anchor.BN(ts))
          .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
          .signers([fw])
          .rpc();
      }

      beneficiary2UsdcAccount = getAssociatedTokenAddressSync(usdcMint, beneficiary2Authority.publicKey);
      await createAssociatedTokenAccount(
        provider.connection,
        admin.payer,
        usdcMint,
        beneficiary2Authority.publicKey
      );

      // Register beneficiary2 for pool
      const ts3 = getCurrentTimestamp();
      await program.methods
        .registerBeneficiaryForPool(
          disasterEventId,
          poolId,
          { beneficiaryAuthority: beneficiary2Authority.publicKey },
          new anchor.BN(ts3)
        )
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      // Lock pool registration
      const ts4 = getCurrentTimestamp();
      await program.methods
        .lockPoolRegistration(disasterEventId, poolId, new anchor.BN(ts4))
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      // Donate to pool
      donorKeypair = Keypair.generate();
      await airdropSOL(provider.connection, donorKeypair.publicKey);
      donorUsdcAccount = getAssociatedTokenAddressSync(usdcMint, donorKeypair.publicKey);
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, donorKeypair.publicKey);
      await mintTo(provider.connection, admin.payer, usdcMint, donorUsdcAccount, admin.payer, 100000000000);

      const donateAmount = new anchor.BN(80000000); // 80 USDC
      const ts5 = getCurrentTimestamp();

      await program.methods
        .donateToPool(
          disasterEventId,
          poolId,
          {
            amount: donateAmount,
            message: "For distribution test",
            isAnonymous: false,
          },
          new anchor.BN(ts5)
        )
        .accountsPartial({
          donor: donorKeypair.publicKey,
          donorTokenAccount: donorUsdcAccount,
          poolTokenAccount: poolTokenAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([donorKeypair])
        .rpc();
    });

    it("should distribute from pool to beneficiary", async () => {
      const [distributionPDA] = deriveDistributionPDA(beneficiaryAuthority.publicKey, poolPDA, program.programId);

      await program.methods
        .distributeFromPool(disasterEventId, poolId, {
          beneficiaryAuthority: beneficiaryAuthority.publicKey,
        })
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const distribution = await program.account.distribution.fetch(distributionPDA);

      expect(distribution.beneficiary.toString()).to.equal(beneficiaryPDA.toString());
      expect(distribution.pool.toString()).to.equal(poolPDA.toString());
      expect(distribution.amountAllocated.toNumber()).to.be.greaterThan(0);
      expect(distribution.amountImmediate.toNumber()).to.be.greaterThan(0);
      expect(distribution.amountLocked.toNumber()).to.be.greaterThan(0);
      expect(distribution.amountClaimed.toNumber()).to.equal(0);
      expect(distribution.isFullyClaimed).to.be.false;
    });

    it("should fail to distribute without locked registration", async () => {
      // Create a new pool without locking
      const newPoolId = `UNLOCKED-POOL-${Date.now()}`;
      const params = createMockFundPoolParams({ name: "Unlocked Pool" });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, newPoolId, new anchor.BN(ts1), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      const [newPoolPDA] = deriveFundPoolPDA(disasterEventId, newPoolId, program.programId);

      // Register beneficiary
      const ts2 = getCurrentTimestamp();
      await program.methods
        .registerBeneficiaryForPool(
          disasterEventId,
          newPoolId,
          { beneficiaryAuthority: beneficiaryAuthority.publicKey },
          new anchor.BN(ts2)
        )
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      // Try to distribute without locking
      await expectError(
        program.methods
          .distributeFromPool(disasterEventId, newPoolId, {
            beneficiaryAuthority: beneficiaryAuthority.publicKey,
          })
          .accountsPartial({
            authority: ngoAuthority.publicKey,
          })
          .signers([ngoAuthority])
          .rpc(),
        "PoolRegistrationNotLocked"
      );
    });

    it("should claim immediate distribution", async () => {
      // Airdrop SOL to beneficiary to pay for activity log
      await airdropSOL(provider.connection, beneficiaryAuthority.publicKey);

      const [distributionPDA] = deriveDistributionPDA(beneficiaryAuthority.publicKey, poolPDA, program.programId);
      const timestamp = getCurrentTimestamp();

      const distBefore = await program.account.distribution.fetch(distributionPDA);
      const immediateAmount = distBefore.amountImmediate.toNumber();

      await program.methods
        .claimDistribution(disasterEventId, poolId, new anchor.BN(timestamp))
        .accountsPartial({
          beneficiaryAuthority: beneficiaryAuthority.publicKey,
          beneficiaryTokenAccount: beneficiaryUsdcAccount,
          poolTokenAccount: poolTokenAccount,
        })
        .signers([beneficiaryAuthority])
        .rpc();

      const distAfter = await program.account.distribution.fetch(distributionPDA);
      expect(distAfter.amountClaimed.toNumber()).to.equal(immediateAmount);
      expect(distAfter.claimedAt).to.not.be.null;
      expect(distAfter.lockedClaimedAt).to.be.null; // Locked not claimed yet
      expect(distAfter.isFullyClaimed).to.be.false; // Still has locked portion
    });

    it("should fail to claim locked distribution before unlock time", async () => {
      const [distributionPDA] = deriveDistributionPDA(beneficiaryAuthority.publicKey, poolPDA, program.programId);
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .claimDistribution(disasterEventId, poolId, new anchor.BN(timestamp))
          .accountsPartial({
            beneficiaryAuthority: beneficiaryAuthority.publicKey,
            beneficiaryTokenAccount: beneficiaryUsdcAccount,
            poolTokenAccount: poolTokenAccount,
          })
          .signers([beneficiaryAuthority])
          .rpc(),
        "DistributionAlreadyClaimed"
      );
    });

    it("should increment pool total_distributed", async () => {
      const pool = await program.account.fundPool.fetch(poolPDA);
      expect(pool.totalDistributed.toNumber()).to.be.greaterThan(0);
      expect(pool.beneficiaryCount).to.be.at.least(1);
    });

    it("should increment pool total_claimed", async () => {
      const pool = await program.account.fundPool.fetch(poolPDA);
      expect(pool.totalClaimed.toNumber()).to.be.greaterThan(0);
    });
  });

  describe("distribution types - allocation weights", () => {
    let testBen1Authority: Keypair;
    let testBen1PDA: PublicKey;
    let testBen2Authority: Keypair;
    let testBen2PDA: PublicKey;
    let testBen3Authority: Keypair;
    let testBen3PDA: PublicKey;

    before(async () => {
      // Create 3 beneficiaries with different family sizes and damage severity
      const beneficiaries = [
        { familySize: 5, damageSeverity: 8, phone: "+977-9800004001", id: "DIST-TYPE-BEN-1" },
        { familySize: 3, damageSeverity: 6, phone: "+977-9800004002", id: "DIST-TYPE-BEN-2" },
        { familySize: 7, damageSeverity: 9, phone: "+977-9800004003", id: "DIST-TYPE-BEN-3" },
      ];

      const authorities = [
        (testBen1Authority = Keypair.generate()),
        (testBen2Authority = Keypair.generate()),
        (testBen3Authority = Keypair.generate()),
      ];

      const pdas = [];

      for (let i = 0; i < 3; i++) {
        const benAuthority = authorities[i];
        const [benPDA] = deriveBeneficiaryPDA(benAuthority.publicKey, disasterEventId, program.programId);
        pdas.push(benPDA);

        const benParams = createMockBeneficiaryParams({
          disasterId: disasterEventId,
          phoneNumber: beneficiaries[i].phone,
          nationalId: beneficiaries[i].id,
          familySize: beneficiaries[i].familySize,
          damageSeverity: beneficiaries[i].damageSeverity,
        });
        const ts1 = getCurrentTimestamp();

        await program.methods
          .registerBeneficiary(benParams, new anchor.BN(ts1))
          .accountsPartial({
            authority: benAuthority.publicKey,
            fieldWorkerAuthority: fieldWorkerAuthority.publicKey,
            payer: fieldWorkerAuthority.publicKey,
            config: platformConfigPDA,
          })
          .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
          .signers([fieldWorkerAuthority])
          .rpc();

        // Verify
        for (let j = 0; j < 3; j++) {
          const ts = getCurrentTimestamp();
          const fw = j === 0 ? fieldWorkerAuthority : j === 1 ? fieldWorker2Authority : fieldWorker3Authority;
          await program.methods
            .verifyBeneficiary(benAuthority.publicKey, disasterEventId, new anchor.BN(ts))
            .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
            .signers([fw])
            .rpc();
        }

        // Create USDC account
        const benUsdcAccount = getAssociatedTokenAddressSync(usdcMint, benAuthority.publicKey);
        await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, benAuthority.publicKey);
      }

      [testBen1PDA, testBen2PDA, testBen3PDA] = pdas;
    });

    it("should distribute equally with Equal distribution type", async () => {
      const poolId = `EQUAL-POOL-${Date.now()}`;
      const [poolPDA] = deriveFundPoolPDA(disasterEventId, poolId, program.programId);

      const params = createMockFundPoolParams({
        name: "Equal Distribution Pool",
        distributionType: { equal: {} },
        distributionPercentageImmediate: 100,
        distributionPercentageLocked: 0,
      });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, poolId, new anchor.BN(ts1), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      // Register all 3 beneficiaries
      for (const benAuth of [testBen1Authority, testBen2Authority, testBen3Authority]) {
        const ts = getCurrentTimestamp();
        await program.methods
          .registerBeneficiaryForPool(disasterEventId, poolId, { beneficiaryAuthority: benAuth.publicKey }, new anchor.BN(ts))
          .accountsPartial({
            authority: ngoAuthority.publicKey,
            payer: ngoAuthority.publicKey,
          })
          .signers([ngoAuthority])
          .rpc();
      }

      // Lock and donate
      const ts2 = getCurrentTimestamp();
      await program.methods
        .lockPoolRegistration(disasterEventId, poolId, new anchor.BN(ts2))
        .accountsPartial({ authority: ngoAuthority.publicKey })
        .signers([ngoAuthority])
        .rpc();

      const donorKeypair = Keypair.generate();
      await airdropSOL(provider.connection, donorKeypair.publicKey);
      const donorUsdcAccount = getAssociatedTokenAddressSync(usdcMint, donorKeypair.publicKey);
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, donorKeypair.publicKey);
      await mintTo(provider.connection, admin.payer, usdcMint, donorUsdcAccount, admin.payer, 100000000000);

      const [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, poolId, program.programId);
      const ts3 = getCurrentTimestamp();
      await program.methods
        .donateToPool(disasterEventId, poolId, { amount: new anchor.BN(90000000), message: "Equal test", isAnonymous: false }, new anchor.BN(ts3))
        .accountsPartial({
          donor: donorKeypair.publicKey,
          donorTokenAccount: donorUsdcAccount,
          poolTokenAccount: poolTokenAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([donorKeypair])
        .rpc();

      // Distribute to all
      for (const benAuth of [testBen1Authority, testBen2Authority, testBen3Authority]) {
        await program.methods
          .distributeFromPool(disasterEventId, poolId, { beneficiaryAuthority: benAuth.publicKey })
          .accountsPartial({ authority: ngoAuthority.publicKey })
          .signers([ngoAuthority])
          .rpc();
      }

      // Check allocations - should be equal (weight = 1 for all)
      const [dist1PDA] = deriveDistributionPDA(testBen1Authority.publicKey, poolPDA, program.programId);
      const [dist2PDA] = deriveDistributionPDA(testBen2Authority.publicKey, poolPDA, program.programId);
      const [dist3PDA] = deriveDistributionPDA(testBen3Authority.publicKey, poolPDA, program.programId);

      const dist1 = await program.account.distribution.fetch(dist1PDA);
      const dist2 = await program.account.distribution.fetch(dist2PDA);
      const dist3 = await program.account.distribution.fetch(dist3PDA);

      // All should have weight of 1
      expect(dist1.allocationWeight).to.equal(1);
      expect(dist2.allocationWeight).to.equal(1);
      expect(dist3.allocationWeight).to.equal(1);

      // All should get equal amounts
      expect(dist1.amountAllocated.toNumber()).to.equal(dist2.amountAllocated.toNumber());
      expect(dist2.amountAllocated.toNumber()).to.equal(dist3.amountAllocated.toNumber());
    });

    it("should distribute by family size with WeightedFamily type", async () => {
      const poolId = `FAMILY-POOL-${Date.now()}`;
      const [poolPDA] = deriveFundPoolPDA(disasterEventId, poolId, program.programId);

      const params = createMockFundPoolParams({
        name: "Family Weighted Pool",
        distributionType: { weightedFamily: {} },
        distributionPercentageImmediate: 100,
        distributionPercentageLocked: 0,
      });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, poolId, new anchor.BN(ts1), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      // Register all 3 beneficiaries
      for (const benAuth of [testBen1Authority, testBen2Authority, testBen3Authority]) {
        const ts = getCurrentTimestamp();
        await program.methods
          .registerBeneficiaryForPool(disasterEventId, poolId, { beneficiaryAuthority: benAuth.publicKey }, new anchor.BN(ts))
          .accountsPartial({
            authority: ngoAuthority.publicKey,
            payer: ngoAuthority.publicKey,
          })
          .signers([ngoAuthority])
          .rpc();
      }

      // Lock and donate
      const ts2 = getCurrentTimestamp();
      await program.methods
        .lockPoolRegistration(disasterEventId, poolId, new anchor.BN(ts2))
        .accountsPartial({ authority: ngoAuthority.publicKey })
        .signers([ngoAuthority])
        .rpc();

      const donorKeypair = Keypair.generate();
      await airdropSOL(provider.connection, donorKeypair.publicKey);
      const donorUsdcAccount = getAssociatedTokenAddressSync(usdcMint, donorKeypair.publicKey);
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, donorKeypair.publicKey);
      await mintTo(provider.connection, admin.payer, usdcMint, donorUsdcAccount, admin.payer, 100000000000);

      const [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, poolId, program.programId);
      const ts3 = getCurrentTimestamp();
      await program.methods
        .donateToPool(disasterEventId, poolId, { amount: new anchor.BN(90000000), message: "Family test", isAnonymous: false }, new anchor.BN(ts3))
        .accountsPartial({
          donor: donorKeypair.publicKey,
          donorTokenAccount: donorUsdcAccount,
          poolTokenAccount: poolTokenAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([donorKeypair])
        .rpc();

      // Distribute to all
      for (const benAuth of [testBen1Authority, testBen2Authority, testBen3Authority]) {
        await program.methods
          .distributeFromPool(disasterEventId, poolId, { beneficiaryAuthority: benAuth.publicKey })
          .accountsPartial({ authority: ngoAuthority.publicKey })
          .signers([ngoAuthority])
          .rpc();
      }

      // Check allocations - should be weighted by family size (5, 3, 7)
      const [dist1PDA] = deriveDistributionPDA(testBen1Authority.publicKey, poolPDA, program.programId);
      const [dist2PDA] = deriveDistributionPDA(testBen2Authority.publicKey, poolPDA, program.programId);
      const [dist3PDA] = deriveDistributionPDA(testBen3Authority.publicKey, poolPDA, program.programId);

      const dist1 = await program.account.distribution.fetch(dist1PDA);
      const dist2 = await program.account.distribution.fetch(dist2PDA);
      const dist3 = await program.account.distribution.fetch(dist3PDA);

      // Weights should match family sizes
      expect(dist1.allocationWeight).to.equal(5);
      expect(dist2.allocationWeight).to.equal(3);
      expect(dist3.allocationWeight).to.equal(7);

      // Ben3 (family=7) should get more than Ben1 (family=5) should get more than Ben2 (family=3)
      expect(dist3.amountAllocated.toNumber()).to.be.greaterThan(dist1.amountAllocated.toNumber());
      expect(dist1.amountAllocated.toNumber()).to.be.greaterThan(dist2.amountAllocated.toNumber());
    });

    it("should distribute by damage severity with WeightedDamage type", async () => {
      const poolId = `DAMAGE-POOL-${Date.now()}`;
      const [poolPDA] = deriveFundPoolPDA(disasterEventId, poolId, program.programId);

      const params = createMockFundPoolParams({
        name: "Damage Weighted Pool",
        distributionType: { weightedDamage: {} },
        distributionPercentageImmediate: 100,
        distributionPercentageLocked: 0,
      });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, poolId, new anchor.BN(ts1), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      // Register all 3 beneficiaries
      for (const benAuth of [testBen1Authority, testBen2Authority, testBen3Authority]) {
        const ts = getCurrentTimestamp();
        await program.methods
          .registerBeneficiaryForPool(disasterEventId, poolId, { beneficiaryAuthority: benAuth.publicKey }, new anchor.BN(ts))
          .accountsPartial({
            authority: ngoAuthority.publicKey,
            payer: ngoAuthority.publicKey,
          })
          .signers([ngoAuthority])
          .rpc();
      }

      // Lock and donate
      const ts2 = getCurrentTimestamp();
      await program.methods
        .lockPoolRegistration(disasterEventId, poolId, new anchor.BN(ts2))
        .accountsPartial({ authority: ngoAuthority.publicKey })
        .signers([ngoAuthority])
        .rpc();

      const donorKeypair = Keypair.generate();
      await airdropSOL(provider.connection, donorKeypair.publicKey);
      const donorUsdcAccount = getAssociatedTokenAddressSync(usdcMint, donorKeypair.publicKey);
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, donorKeypair.publicKey);
      await mintTo(provider.connection, admin.payer, usdcMint, donorUsdcAccount, admin.payer, 100000000000);

      const [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, poolId, program.programId);
      const ts3 = getCurrentTimestamp();
      await program.methods
        .donateToPool(disasterEventId, poolId, { amount: new anchor.BN(90000000), message: "Damage test", isAnonymous: false }, new anchor.BN(ts3))
        .accountsPartial({
          donor: donorKeypair.publicKey,
          donorTokenAccount: donorUsdcAccount,
          poolTokenAccount: poolTokenAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([donorKeypair])
        .rpc();

      // Distribute to all
      for (const benAuth of [testBen1Authority, testBen2Authority, testBen3Authority]) {
        await program.methods
          .distributeFromPool(disasterEventId, poolId, { beneficiaryAuthority: benAuth.publicKey })
          .accountsPartial({ authority: ngoAuthority.publicKey })
          .signers([ngoAuthority])
          .rpc();
      }

      // Check allocations - should be weighted by damage severity (8, 6, 9)
      const [dist1PDA] = deriveDistributionPDA(testBen1Authority.publicKey, poolPDA, program.programId);
      const [dist2PDA] = deriveDistributionPDA(testBen2Authority.publicKey, poolPDA, program.programId);
      const [dist3PDA] = deriveDistributionPDA(testBen3Authority.publicKey, poolPDA, program.programId);

      const dist1 = await program.account.distribution.fetch(dist1PDA);
      const dist2 = await program.account.distribution.fetch(dist2PDA);
      const dist3 = await program.account.distribution.fetch(dist3PDA);

      // Weights should match damage severity
      expect(dist1.allocationWeight).to.equal(8);
      expect(dist2.allocationWeight).to.equal(6);
      expect(dist3.allocationWeight).to.equal(9);

      // Ben3 (damage=9) should get more than Ben1 (damage=8) should get more than Ben2 (damage=6)
      expect(dist3.amountAllocated.toNumber()).to.be.greaterThan(dist1.amountAllocated.toNumber());
      expect(dist1.amountAllocated.toNumber()).to.be.greaterThan(dist2.amountAllocated.toNumber());
    });

  });

  describe("reclaim_expired_distribution", () => {
    let expiredPoolId: string;
    let expiredPoolPDA: PublicKey;
    let expiredBenAuthority: Keypair;

    before(async () => {
      // Create pool with short claim deadline for testing
      expiredPoolId = `EXPIRED-POOL-${Date.now()}`;
      [expiredPoolPDA] = deriveFundPoolPDA(disasterEventId, expiredPoolId, program.programId);

      const params = createMockFundPoolParams({
        name: "Expired Test Pool",
        distributionPercentageImmediate: 100,
        distributionPercentageLocked: 0,
      });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, expiredPoolId, new anchor.BN(ts1), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      // Register beneficiary
      expiredBenAuthority = Keypair.generate();
      const [expiredBenPDA] = deriveBeneficiaryPDA(
        expiredBenAuthority.publicKey,
        disasterEventId,
        program.programId
      );

      const benParams = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800003004",
        nationalId: "EXPIRED-BEN",
      });
      const ts2 = getCurrentTimestamp();

      await program.methods
        .registerBeneficiary(benParams, new anchor.BN(ts2))
        .accountsPartial({
          authority: expiredBenAuthority.publicKey,
          fieldWorkerAuthority: fieldWorkerAuthority.publicKey,
          payer: fieldWorkerAuthority.publicKey,
          config: platformConfigPDA,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([fieldWorkerAuthority])
        .rpc();

      // Verify
      for (let i = 0; i < 3; i++) {
        const ts = getCurrentTimestamp();
        const fw = i === 0 ? fieldWorkerAuthority : i === 1 ? fieldWorker2Authority : fieldWorker3Authority;
        await program.methods
          .verifyBeneficiary(expiredBenAuthority.publicKey, disasterEventId, new anchor.BN(ts))
          .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
          .signers([fw])
          .rpc();
      }

      // Register for pool
      const ts3 = getCurrentTimestamp();
      await program.methods
        .registerBeneficiaryForPool(
          disasterEventId,
          expiredPoolId,
          { beneficiaryAuthority: expiredBenAuthority.publicKey },
          new anchor.BN(ts3)
        )
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      // Lock registration
      const ts4 = getCurrentTimestamp();
      await program.methods
        .lockPoolRegistration(disasterEventId, expiredPoolId, new anchor.BN(ts4))
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      // Donate to pool
      const donorKeypair = Keypair.generate();
      await airdropSOL(provider.connection, donorKeypair.publicKey);
      const donorUsdcAccount = getAssociatedTokenAddressSync(usdcMint, donorKeypair.publicKey);
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, donorKeypair.publicKey);
      await mintTo(provider.connection, admin.payer, usdcMint, donorUsdcAccount, admin.payer, 10000000000);

      const [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, expiredPoolId, program.programId);
      const donateAmount = new anchor.BN(10000000);
      const ts5 = getCurrentTimestamp();

      await program.methods
        .donateToPool(
          disasterEventId,
          expiredPoolId,
          {
            amount: donateAmount,
            message: "For expiry test",
            isAnonymous: false,
          },
          new anchor.BN(ts5)
        )
        .accountsPartial({
          donor: donorKeypair.publicKey,
          donorTokenAccount: donorUsdcAccount,
          poolTokenAccount: poolTokenAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([donorKeypair])
        .rpc();

      // Distribute
      await program.methods
        .distributeFromPool(disasterEventId, expiredPoolId, {
          beneficiaryAuthority: expiredBenAuthority.publicKey,
        })
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();
    });

    it("should fail to reclaim non-expired distribution", async () => {
      await expectError(
        program.methods
          .reclaimExpiredDistribution(disasterEventId, expiredPoolId, expiredBenAuthority.publicKey)
          .accountsPartial({
            authority: ngoAuthority.publicKey,
          })
          .signers([ngoAuthority])
          .rpc(),
        "DistributionNotExpired"
      );
    });

    it.skip("should reclaim expired distribution (requires time travel)", async () => {
      // This test would require advancing blockchain time by 90 days
      // In production, this would work after the claim_deadline passes
      console.log("  → Skipping: requires time travel to test expiry");
    });
  });
});
