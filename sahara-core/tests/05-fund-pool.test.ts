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
  derivePoolRegistrationPDA,
  airdropSOL,
  getCurrentTimestamp,
  createTokenMint,
} from "./helpers/test-utils";
import {
  createMockDisasterParams,
  createMockNGOParams,
  createMockFieldWorkerParams,
  createMockBeneficiaryParams,
  createMockFundPoolParams,
} from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";

describe("05 - Fund Pool Management", () => {
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
  let adminUsdcAccount: PublicKey;
  let platformFeeRecipient: PublicKey;

  before(async () => {
    [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

    // Get USDC mint from platform config
    const config = await program.account.platformConfig.fetch(platformConfigPDA);
    usdcMint = config.usdcMint;

    // Ensure USDC is in allowed tokens (it should be from platform init, but let's verify)
    if (!config.allowedTokens.some((t: PublicKey) => t.toString() === usdcMint.toString())) {
      const timestamp = getCurrentTimestamp();
      await program.methods
        .addAllowedToken(new anchor.BN(timestamp), usdcMint, "Adding USDC for pool tests")
        .accountsPartial({
          admin: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();
    }

    // Create admin USDC account and mint tokens
    adminUsdcAccount = getAssociatedTokenAddressSync(usdcMint, admin.publicKey);
    try {
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, admin.publicKey);
    } catch (e) {
      // Account might already exist
    }
    await mintTo(provider.connection, admin.payer, usdcMint, adminUsdcAccount, admin.payer, 1000000000000);

    // Create platform fee recipient account
    platformFeeRecipient = getAssociatedTokenAddressSync(usdcMint, config.platformFeeRecipient);
    try {
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, config.platformFeeRecipient);
    } catch (e) {
      // Account might already exist
    }

    // Create and verify NGO
    ngoAuthority = Keypair.generate();
    await airdropSOL(provider.connection, ngoAuthority.publicKey);
    [ngoPDA] = deriveNGOPDA(ngoAuthority.publicKey, program.programId);

    await program.methods
      .registerNgo(createMockNGOParams({ name: "Pool Test NGO" }))
      .accountsPartial({
        authority: ngoAuthority.publicKey,
        config: platformConfigPDA,
      })
      .signers([ngoAuthority])
      .rpc();

    const actionId = getCurrentTimestamp();
    await program.methods
      .verifyNgo(ngoAuthority.publicKey, { reason: "Verified for testing" }, new anchor.BN(actionId))
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
      .registerFieldWorker(createMockFieldWorkerParams({ name: "Pool Field Worker 1" }))
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
      .registerFieldWorker(createMockFieldWorkerParams({ name: "Pool Field Worker 2" }))
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
      .registerFieldWorker(createMockFieldWorkerParams({ name: "Pool Field Worker 3" }))
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
    disasterEventId = `POOL-TEST-${Date.now()}`;
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
  });

  describe("create_fund_pool", () => {
    it("should create a fund pool", async () => {
      const poolId = "POOL-001";
      const params = createMockFundPoolParams({ name: "Emergency Relief Pool" });
      const timestamp = getCurrentTimestamp();

      const [poolPDA] = deriveFundPoolPDA(disasterEventId, poolId, program.programId);

      await program.methods
        .createFundPool(disasterEventId, poolId, new anchor.BN(timestamp), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(poolPDA);

      expect(pool.poolId).to.equal(poolId);
      expect(pool.disasterId).to.equal(disasterEventId);
      expect(pool.name).to.equal(params.name);
      expect(pool.authority.toString()).to.equal(ngoAuthority.publicKey.toString());
      expect(pool.tokenMint.toString()).to.equal(usdcMint.toString());
      expect(pool.distributionPercentageImmediate).to.equal(params.distributionPercentageImmediate);
      expect(pool.distributionPercentageLocked).to.equal(params.distributionPercentageLocked);
      expect(pool.isActive).to.be.true;
      expect(pool.isDistributed).to.be.false;
      expect(pool.totalDeposited.toNumber()).to.equal(0);
      expect(pool.totalDistributed.toNumber()).to.equal(0);
      expect(pool.beneficiaryCount).to.equal(0);
      expect(pool.donorCount).to.equal(0);
      expect(pool.registrationLocked).to.be.false;
    });

    it("should fail with invalid distribution percentages (not 100)", async () => {
      const poolId = "POOL-INVALID-DIST";
      const params = createMockFundPoolParams({
        distributionPercentageImmediate: 60,
        distributionPercentageLocked: 30, // 60 + 30 = 90, not 100
      });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .createFundPool(disasterEventId, poolId, new anchor.BN(timestamp), params)
          .accountsPartial({
            ngoAuthority: ngoAuthority.publicKey,
            payer: ngoAuthority.publicKey,
            tokenMint: usdcMint,
          })
          .signers([ngoAuthority])
          .rpc(),
        "InvalidDistributionPercentages"
      );
    });

    it("should create pool with different distribution types", async () => {
      const types = [
        { equal: {} },
        { weightedFamily: {} },
        { weightedDamage: {} },
        { milestone: {} },
      ];

      for (let i = 0; i < types.length; i++) {
        const poolId = `POOL-TYPE-${i}`;
        const params = createMockFundPoolParams({
          name: `Pool Type ${i}`,
          distributionType: types[i],
        });
        const timestamp = getCurrentTimestamp();

        const [poolPDA] = deriveFundPoolPDA(disasterEventId, poolId, program.programId);

        await program.methods
          .createFundPool(disasterEventId, poolId, new anchor.BN(timestamp), params)
          .accountsPartial({
            ngoAuthority: ngoAuthority.publicKey,
            payer: ngoAuthority.publicKey,
            tokenMint: usdcMint,
          })
          .signers([ngoAuthority])
          .rpc();

        const pool = await program.account.fundPool.fetch(poolPDA);
        expect(pool.distributionType).to.deep.equal(types[i]);
      }
    });

    it("should increment NGO pools_created counter", async () => {
      const ngoBefore = await program.account.ngo.fetch(ngoPDA);
      const countBefore = ngoBefore.poolsCreated;

      const poolId = `POOL-COUNTER-${Date.now()}`;
      const params = createMockFundPoolParams();
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

      const ngoAfter = await program.account.ngo.fetch(ngoPDA);
      expect(ngoAfter.poolsCreated).to.equal(countBefore + 1);
    });

    it("should increment platform total_pools counter", async () => {
      const configBefore = await program.account.platformConfig.fetch(platformConfigPDA);
      const countBefore = configBefore.totalPools;

      const poolId = `POOL-PLATFORM-${Date.now()}`;
      const params = createMockFundPoolParams();
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

      const configAfter = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(configAfter.totalPools).to.equal(countBefore + 1);
    });

    it("should fail when creating pool for inactive disaster", async () => {
      // Create and close a disaster
      const closedDisasterId = `CLOSED-DISASTER-${Date.now()}`;
      const [closedDisasterPDA] = deriveDisasterPDA(closedDisasterId, program.programId);

      const disasterParams = createMockDisasterParams({ eventId: closedDisasterId });
      const timestamp1 = getCurrentTimestamp();

      await program.methods
        .initializeDisaster(disasterParams, new anchor.BN(timestamp1))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();

      const timestamp2 = getCurrentTimestamp();
      await program.methods
        .closeDisaster(closedDisasterId, new anchor.BN(timestamp2))
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const poolId = "POOL-CLOSED-DISASTER";
      const params = createMockFundPoolParams();
      const timestamp3 = getCurrentTimestamp();

      await expectError(
        program.methods
          .createFundPool(closedDisasterId, poolId, new anchor.BN(timestamp3), params)
          .accountsPartial({
            ngoAuthority: ngoAuthority.publicKey,
            payer: ngoAuthority.publicKey,
            tokenMint: usdcMint,
          })
          .signers([ngoAuthority])
          .rpc(),
        "DisasterNotActive"
      );
    });
  });

  describe("donate_to_pool", () => {
    let testPoolId: string;
    let testPoolPDA: PublicKey;
    let donorKeypair: Keypair;
    let donorUsdcAccount: PublicKey;

    before(async () => {
      testPoolId = `DONATE-POOL-${Date.now()}`;
      [testPoolPDA] = deriveFundPoolPDA(disasterEventId, testPoolId, program.programId);

      const params = createMockFundPoolParams({ name: "Donation Test Pool" });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, testPoolId, new anchor.BN(timestamp), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();

      // Create donor with USDC
      donorKeypair = Keypair.generate();
      await airdropSOL(provider.connection, donorKeypair.publicKey);
      donorUsdcAccount = getAssociatedTokenAddressSync(usdcMint, donorKeypair.publicKey);
      await createAssociatedTokenAccount(provider.connection, admin.payer, usdcMint, donorKeypair.publicKey);
      await mintTo(provider.connection, admin.payer, usdcMint, donorUsdcAccount, admin.payer, 100000000000);
    });

    it("should donate to pool", async () => {
      const amount = new anchor.BN(10000000); // 10 USDC
      const timestamp = getCurrentTimestamp();

      const [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, testPoolId, program.programId);

      await program.methods
        .donateToPool(
          disasterEventId,
          testPoolId,
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
          poolTokenAccount: poolTokenAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .remainingAccounts([
          {
            pubkey: ngoPDA,
            isWritable: false,
            isSigner: false,
          },
        ])
        .signers([donorKeypair])
        .rpc();

      const pool = await program.account.fundPool.fetch(testPoolPDA);
      expect(pool.donorCount).to.equal(1);
      expect(pool.totalDeposited.toNumber()).to.be.greaterThan(0);
    });

    it("should fail with donation below minimum", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      const amount = config.minDonationAmount.sub(new anchor.BN(1));
      const timestamp = getCurrentTimestamp();

      const [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, testPoolId, program.programId);

      await expectError(
        program.methods
          .donateToPool(
            disasterEventId,
            testPoolId,
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
            poolTokenAccount: poolTokenAccount,
            platformFeeRecipient: platformFeeRecipient,
          })
          .remainingAccounts([
            {
              pubkey: ngoPDA,
              isWritable: false,
              isSigner: false,
            },
          ])
          .signers([donorKeypair])
          .rpc(),
        "DonationBelowMinimum"
      );
    });

    it("should increment pool donor_count", async () => {
      const poolBefore = await program.account.fundPool.fetch(testPoolPDA);
      const countBefore = poolBefore.donorCount;

      const amount = new anchor.BN(5000000);
      const timestamp = getCurrentTimestamp();
      const [poolTokenAccount] = derivePoolTokenAccountPDA(disasterEventId, testPoolId, program.programId);

      await program.methods
        .donateToPool(
          disasterEventId,
          testPoolId,
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
          poolTokenAccount: poolTokenAccount,
          platformFeeRecipient: platformFeeRecipient,
        })
        .remainingAccounts([
          {
            pubkey: ngoPDA,
            isWritable: false,
            isSigner: false,
          },
        ])
        .signers([donorKeypair])
        .rpc();

      const poolAfter = await program.account.fundPool.fetch(testPoolPDA);
      expect(poolAfter.donorCount).to.equal(countBefore + 1);
    });
  });

  describe("update_pool_config", () => {
    let updatePoolId: string;
    let updatePoolPDA: PublicKey;

    before(async () => {
      updatePoolId = `UPDATE-POOL-${Date.now()}`;
      [updatePoolPDA] = deriveFundPoolPDA(disasterEventId, updatePoolId, program.programId);

      const params = createMockFundPoolParams({ name: "Update Test Pool" });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, updatePoolId, new anchor.BN(timestamp), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();
    });

    it("should update pool eligibility criteria", async () => {
      await program.methods
        .updatePoolConfig(disasterEventId, updatePoolId, {
          isActive: null,
          eligibilityCriteria: "Updated criteria: Family size >= 5",
          targetAmount: null,
          description: null,
        })
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(updatePoolPDA);
      expect(pool.eligibilityCriteria).to.equal("Updated criteria: Family size >= 5");
    });

    it("should update pool target amount", async () => {
      await program.methods
        .updatePoolConfig(disasterEventId, updatePoolId, {
          isActive: null,
          eligibilityCriteria: null,
          targetAmount: new anchor.BN(50000000000),
          description: null,
        })
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(updatePoolPDA);
      expect(pool.targetAmount.toNumber()).to.equal(50000000000);
    });

    it("should deactivate pool", async () => {
      await program.methods
        .updatePoolConfig(disasterEventId, updatePoolId, {
          isActive: false,
          eligibilityCriteria: null,
          targetAmount: null,
          description: null,
        })
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(updatePoolPDA);
      expect(pool.isActive).to.be.false;
    });

    it("should reactivate pool", async () => {
      await program.methods
        .updatePoolConfig(disasterEventId, updatePoolId, {
          isActive: true,
          eligibilityCriteria: null,
          targetAmount: null,
          description: null,
        })
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(updatePoolPDA);
      expect(pool.isActive).to.be.true;
    });

    it("should fail when non-authority tries to update", async () => {
      const nonAuthority = Keypair.generate();
      await airdropSOL(provider.connection, nonAuthority.publicKey);

      await expectError(
        program.methods
          .updatePoolConfig(disasterEventId, updatePoolId, {
            isActive: false,
            eligibilityCriteria: null,
            targetAmount: null,
            description: null,
          })
          .accountsPartial({
            authority: nonAuthority.publicKey,
          })
          .signers([nonAuthority])
          .rpc(),
        "UnauthorizedModification"
      );
    });
  });

  describe("close_pool", () => {
    let closePoolId: string;
    let closePoolPDA: PublicKey;

    before(async () => {
      closePoolId = `CLOSE-POOL-${Date.now()}`;
      [closePoolPDA] = deriveFundPoolPDA(disasterEventId, closePoolId, program.programId);

      const params = createMockFundPoolParams({ name: "Close Test Pool" });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, closePoolId, new anchor.BN(timestamp), params)
        .accountsPartial({
          ngoAuthority: ngoAuthority.publicKey,
          payer: ngoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([ngoAuthority])
        .rpc();
    });

    it("should close pool", async () => {
      const timestamp = getCurrentTimestamp();

      await program.methods
        .closePool(disasterEventId, closePoolId, new anchor.BN(timestamp))
        .accountsPartial({
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(closePoolPDA);
      expect(pool.isActive).to.be.false;
      expect(pool.closedAt).to.not.be.null;
    });

    it("should fail to close already closed pool", async () => {
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .closePool(disasterEventId, closePoolId, new anchor.BN(timestamp))
          .accountsPartial({
            authority: ngoAuthority.publicKey,
          })
          .signers([ngoAuthority])
          .rpc(),
        "PoolClosed"
      );
    });

    it("should fail when non-authority tries to close", async () => {
      // Create a new NGO to avoid pool limit
      const newNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, newNgoAuthority.publicKey);
      const [newNgoPDA] = deriveNGOPDA(newNgoAuthority.publicKey, program.programId);

      await program.methods
        .registerNgo(createMockNGOParams({ name: "Close Auth Test NGO" }))
        .accountsPartial({
          authority: newNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([newNgoAuthority])
        .rpc();

      const actionId = getCurrentTimestamp();
      await program.methods
        .verifyNgo(newNgoAuthority.publicKey, { reason: "Verified" }, new anchor.BN(actionId))
        .accountsPartial({
          admin: admin.publicKey,
          ngo: newNgoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const newPoolId = `CLOSE-AUTH-${Date.now()}`;
      const params = createMockFundPoolParams();
      const timestamp1 = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, newPoolId, new anchor.BN(timestamp1), params)
        .accountsPartial({
          ngoAuthority: newNgoAuthority.publicKey,
          payer: newNgoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([newNgoAuthority])
        .rpc();

      const nonAuthority = Keypair.generate();
      await airdropSOL(provider.connection, nonAuthority.publicKey);
      const timestamp2 = getCurrentTimestamp();

      await expectError(
        program.methods
          .closePool(disasterEventId, newPoolId, new anchor.BN(timestamp2))
          .accountsPartial({
            authority: nonAuthority.publicKey,
          })
          .signers([nonAuthority])
          .rpc(),
        "UnauthorizedModification"
      );
    });
  });

  describe("register_beneficiary_for_pool", () => {
    let regPoolId: string;
    let regPoolPDA: PublicKey;
    let beneficiary1Authority: Keypair;
    let beneficiary1PDA: PublicKey;
    let beneficiary2Authority: Keypair;
    let beneficiary2PDA: PublicKey;
    let regNgoAuthority: Keypair;
    let regNgoPDA: PublicKey;

    before(async () => {
      // Create a new NGO to avoid pool limit
      regNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, regNgoAuthority.publicKey);
      [regNgoPDA] = deriveNGOPDA(regNgoAuthority.publicKey, program.programId);

      await program.methods
        .registerNgo(createMockNGOParams({ name: "Registration Test NGO" }))
        .accountsPartial({
          authority: regNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([regNgoAuthority])
        .rpc();

      const actionId = getCurrentTimestamp();
      await program.methods
        .verifyNgo(regNgoAuthority.publicKey, { reason: "Verified" }, new anchor.BN(actionId))
        .accountsPartial({
          admin: admin.publicKey,
          ngo: regNgoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      regPoolId = `REG-POOL-${Date.now()}`;
      [regPoolPDA] = deriveFundPoolPDA(disasterEventId, regPoolId, program.programId);

      const params = createMockFundPoolParams({
        name: "Registration Test Pool",
        distributionType: { weightedFamily: {} },
        minimumFamilySize: 3,
        minimumDamageSeverity: 5,
      });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, regPoolId, new anchor.BN(timestamp), params)
        .accountsPartial({
          ngoAuthority: regNgoAuthority.publicKey,
          payer: regNgoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([regNgoAuthority])
        .rpc();

      // Register and verify beneficiaries
      beneficiary1Authority = Keypair.generate();
      [beneficiary1PDA] = deriveBeneficiaryPDA(beneficiary1Authority.publicKey, disasterEventId, program.programId);

      const ben1Params = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800001001",
        nationalId: "POOL-BEN-001",
        familySize: 5,
        damageSeverity: 7,
      });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .registerBeneficiary(ben1Params, new anchor.BN(ts1))
        .accountsPartial({
          authority: beneficiary1Authority.publicKey,
          fieldWorkerAuthority: fieldWorkerAuthority.publicKey,
          payer: fieldWorkerAuthority.publicKey,
          config: platformConfigPDA,
        })
        .remainingAccounts([{ pubkey: ngoPDA, isWritable: false, isSigner: false }])
        .signers([fieldWorkerAuthority])
        .rpc();

      // Verify beneficiary1
      for (let i = 0; i < 3; i++) {
        const ts = getCurrentTimestamp();
        const fw = i === 0 ? fieldWorkerAuthority : i === 1 ? fieldWorker2Authority : fieldWorker3Authority;
        await program.methods
          .verifyBeneficiary(beneficiary1Authority.publicKey, disasterEventId, new anchor.BN(ts))
          .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
          .signers([fw])
          .rpc();
      }

      // Register beneficiary2
      beneficiary2Authority = Keypair.generate();
      [beneficiary2PDA] = deriveBeneficiaryPDA(beneficiary2Authority.publicKey, disasterEventId, program.programId);

      const ben2Params = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800001002",
        nationalId: "POOL-BEN-002",
        familySize: 4,
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
    });

    it("should register beneficiary for pool", async () => {
      const timestamp = getCurrentTimestamp();

      await program.methods
        .registerBeneficiaryForPool(
          disasterEventId,
          regPoolId,
          { beneficiaryAuthority: beneficiary1Authority.publicKey },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          authority: regNgoAuthority.publicKey,
          payer: regNgoAuthority.publicKey,
        })
        .signers([regNgoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(regPoolPDA);
      expect(pool.registeredBeneficiaryCount).to.equal(1);
      expect(pool.totalAllocationWeight.toNumber()).to.equal(5); // Family size = 5
    });

    it("should register second beneficiary with different weight", async () => {
      const timestamp = getCurrentTimestamp();

      await program.methods
        .registerBeneficiaryForPool(
          disasterEventId,
          regPoolId,
          { beneficiaryAuthority: beneficiary2Authority.publicKey },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          authority: regNgoAuthority.publicKey,
          payer: regNgoAuthority.publicKey,
        })
        .signers([regNgoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(regPoolPDA);
      expect(pool.registeredBeneficiaryCount).to.equal(2);
      expect(pool.totalAllocationWeight.toNumber()).to.equal(9); // 5 + 4
    });

    it("should fail to register unverified beneficiary", async () => {
      const unverifiedBenAuthority = Keypair.generate();
      const benParams = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800001003",
        nationalId: "POOL-BEN-UNVERIFIED",
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

      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .registerBeneficiaryForPool(
            disasterEventId,
            regPoolId,
            { beneficiaryAuthority: unverifiedBenAuthority.publicKey },
            new anchor.BN(timestamp)
          )
          .accountsPartial({
            authority: regNgoAuthority.publicKey,
            payer: regNgoAuthority.publicKey,
          })
          .signers([regNgoAuthority])
          .rpc(),
        "BeneficiaryNotVerified"
      );
    });

    it("should fail when beneficiary doesn't meet eligibility criteria", async () => {
      // Create beneficiary with family size < 3 (minimum is 3)
      const ineligibleBenAuthority = Keypair.generate();
      const benParams = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800001004",
        nationalId: "POOL-BEN-INELIGIBLE",
        familySize: 2, // Below minimum
        damageSeverity: 7,
      });
      const ts1 = getCurrentTimestamp();

      await program.methods
        .registerBeneficiary(benParams, new anchor.BN(ts1))
        .accountsPartial({
          authority: ineligibleBenAuthority.publicKey,
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
          .verifyBeneficiary(ineligibleBenAuthority.publicKey, disasterEventId, new anchor.BN(ts))
          .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
          .signers([fw])
          .rpc();
      }

      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .registerBeneficiaryForPool(
            disasterEventId,
            regPoolId,
            { beneficiaryAuthority: ineligibleBenAuthority.publicKey },
            new anchor.BN(timestamp)
          )
          .accountsPartial({
            authority: regNgoAuthority.publicKey,
            payer: regNgoAuthority.publicKey,
          })
          .signers([regNgoAuthority])
          .rpc(),
        "InvalidEligibilityCriteria"
      );
    });
  });

  describe("lock_pool_registration", () => {
    let lockPoolId: string;
    let lockPoolPDA: PublicKey;
    let lockNgoAuthority: Keypair;
    let lockNgoPDA: PublicKey;

    before(async () => {
      // Create a new NGO to avoid pool limit
      lockNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, lockNgoAuthority.publicKey);
      [lockNgoPDA] = deriveNGOPDA(lockNgoAuthority.publicKey, program.programId);

      await program.methods
        .registerNgo(createMockNGOParams({ name: "Lock Test NGO" }))
        .accountsPartial({
          authority: lockNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([lockNgoAuthority])
        .rpc();

      const actionId = getCurrentTimestamp();
      await program.methods
        .verifyNgo(lockNgoAuthority.publicKey, { reason: "Verified" }, new anchor.BN(actionId))
        .accountsPartial({
          admin: admin.publicKey,
          ngo: lockNgoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      lockPoolId = `LOCK-POOL-${Date.now()}`;
      [lockPoolPDA] = deriveFundPoolPDA(disasterEventId, lockPoolId, program.programId);

      const params = createMockFundPoolParams({ name: "Lock Test Pool" });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .createFundPool(disasterEventId, lockPoolId, new anchor.BN(timestamp), params)
        .accountsPartial({
          ngoAuthority: lockNgoAuthority.publicKey,
          payer: lockNgoAuthority.publicKey,
          tokenMint: usdcMint,
        })
        .signers([lockNgoAuthority])
        .rpc();

      // Register a beneficiary
      const benAuthority = Keypair.generate();
      const benParams = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800002001",
        nationalId: "LOCK-BEN-001",
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
      for (let i = 0; i < 3; i++) {
        const ts = getCurrentTimestamp();
        const fw = i === 0 ? fieldWorkerAuthority : i === 1 ? fieldWorker2Authority : fieldWorker3Authority;
        await program.methods
          .verifyBeneficiary(benAuthority.publicKey, disasterEventId, new anchor.BN(ts))
          .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
          .signers([fw])
          .rpc();
      }

      // Register for pool
      const ts2 = getCurrentTimestamp();
      await program.methods
        .registerBeneficiaryForPool(
          disasterEventId,
          lockPoolId,
          { beneficiaryAuthority: benAuthority.publicKey },
          new anchor.BN(ts2)
        )
        .accountsPartial({
          authority: lockNgoAuthority.publicKey,
          payer: lockNgoAuthority.publicKey,
        })
        .signers([lockNgoAuthority])
        .rpc();
    });

    it("should lock pool registration", async () => {
      const timestamp = getCurrentTimestamp();

      await program.methods
        .lockPoolRegistration(disasterEventId, lockPoolId, new anchor.BN(timestamp))
        .accountsPartial({
          authority: lockNgoAuthority.publicKey,
        })
        .signers([lockNgoAuthority])
        .rpc();

      const pool = await program.account.fundPool.fetch(lockPoolPDA);
      expect(pool.registrationLocked).to.be.true;
    });

    it("should fail to register beneficiary after lock", async () => {
      const benAuthority = Keypair.generate();
      const benParams = createMockBeneficiaryParams({
        disasterId: disasterEventId,
        phoneNumber: "+977-9800002002",
        nationalId: "LOCK-BEN-002",
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
      for (let i = 0; i < 3; i++) {
        const ts = getCurrentTimestamp();
        const fw = i === 0 ? fieldWorkerAuthority : i === 1 ? fieldWorker2Authority : fieldWorker3Authority;
        await program.methods
          .verifyBeneficiary(benAuthority.publicKey, disasterEventId, new anchor.BN(ts))
          .accountsPartial({ fieldWorkerAuthority: fw.publicKey })
          .signers([fw])
          .rpc();
      }

      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .registerBeneficiaryForPool(
            disasterEventId,
            lockPoolId,
            { beneficiaryAuthority: benAuthority.publicKey },
            new anchor.BN(timestamp)
          )
          .accountsPartial({
            authority: lockNgoAuthority.publicKey,
            payer: lockNgoAuthority.publicKey,
          })
          .signers([lockNgoAuthority])
          .rpc(),
        "RegistrationPhaseLocked"
      );
    });

    it("should fail to lock already locked pool", async () => {
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .lockPoolRegistration(disasterEventId, lockPoolId, new anchor.BN(timestamp))
          .accountsPartial({
            authority: lockNgoAuthority.publicKey,
          })
          .signers([lockNgoAuthority])
          .rpc(),
        "RegistrationPhaseLocked"
      );
    });
  });
});
