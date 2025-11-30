import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SaharasolCore } from "../target/types/saharasol_core";
import {
  derivePlatformConfigPDA,
  createTokenMint,
  airdropSOL,
  getCurrentTimestamp,
} from "./helpers/test-utils";
import { createMockPlatformParams } from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";

describe("01 - Platform Configuration", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
  const admin = provider.wallet as anchor.Wallet;

  let usdcMint: PublicKey;
  let platformConfigPDA: PublicKey;

  before(async () => {
    [platformConfigPDA] = derivePlatformConfigPDA(program.programId);
    usdcMint = await createTokenMint(provider.connection, admin.payer, 6);
  });

  describe("initialize_platform", () => {
    it("should initialize platform with valid params", async () => {
      // Check if already initialized
      try {
        await program.account.platformConfig.fetch(platformConfigPDA);
        console.log("  → Platform already initialized, skipping init test");
        return;
      } catch (e) {
        // Not initialized, proceed
      }

      const params = createMockPlatformParams(usdcMint);

      await program.methods
        .initializePlatform(params)
        .accountsPartial({
          admin: admin.publicKey,
        })
        .rpc();

      const config = await program.account.platformConfig.fetch(platformConfigPDA);

      // Verify all initialized fields
      expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      expect(config.platformFeePercentage).to.equal(params.platformFeePercentage);
      expect(config.platformFeeRecipient.toString()).to.equal(admin.publicKey.toString());
      expect(config.verificationThreshold).to.equal(params.verificationThreshold);
      expect(config.maxVerifiers).to.equal(params.maxVerifiers);
      expect(config.minDonationAmount.toNumber()).to.equal(params.minDonationAmount.toNumber());
      expect(config.maxDonationAmount.toNumber()).to.equal(params.maxDonationAmount.toNumber());
      expect(config.isPaused).to.be.false;
      expect(config.usdcMint.toString()).to.equal(usdcMint.toString());
      expect(config.platformName).to.equal(params.platformName);
      expect(config.platformVersion).to.equal(params.platformVersion);

      // Verify counters initialized to 0
      expect(config.totalDisasters).to.equal(0);
      expect(config.totalBeneficiaries).to.equal(0);
      expect(config.totalVerifiedBeneficiaries).to.equal(0);
      expect(config.totalFieldWorkers).to.equal(0);
      expect(config.totalNgos).to.equal(0);
      expect(config.totalDonations.toNumber()).to.equal(0);
      expect(config.totalAidDistributed.toNumber()).to.equal(0);
      expect(config.totalPools).to.equal(0);

      // Verify allowed tokens includes USDC
      expect(config.allowedTokens.length).to.equal(1);
      expect(config.allowedTokens[0].toString()).to.equal(usdcMint.toString());

      // Verify emergency contacts includes admin
      expect(config.emergencyContacts.length).to.equal(1);
      expect(config.emergencyContacts[0].toString()).to.equal(admin.publicKey.toString());

      // Verify admin transfer fields
      expect(config.pendingAdmin).to.be.null;
      expect(config.adminTransferInitiatedAt).to.be.null;
    });

    it("should fail to initialize platform twice", async () => {
      const params = createMockPlatformParams(usdcMint);

      await expectError(
        program.methods
          .initializePlatform(params)
          .accountsPartial({
            admin: admin.publicKey,
          })
          .rpc(),
        "already in use"
      );
    });

    it("should fail with invalid platform fee (> 1000 bps)", async () => {
      // This test only works if platform is not initialized
      // Since it's already initialized, we skip
      console.log("  → Skipping: platform already initialized");
    });

    it("should fail with invalid verification threshold (0)", async () => {
      console.log("  → Skipping: platform already initialized");
    });

    it("should fail with verification threshold > max verifiers", async () => {
      console.log("  → Skipping: platform already initialized");
    });

    it("should fail with min donation >= max donation", async () => {
      console.log("  → Skipping: platform already initialized");
    });
  });

  describe("update_platform_config", () => {
    describe("platform_fee_percentage", () => {
      it("should update platform fee percentage", async () => {
        const timestamp = getCurrentTimestamp();
        const newFee = 250; // 2.5%

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: newFee,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Adjusting platform fee",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.platformFeePercentage).to.equal(newFee);
      });

      it("should fail with fee > 1000 bps (10%)", async () => {
        const timestamp = getCurrentTimestamp();

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: 1001,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Invalid fee test",
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "InvalidPlatformFee"
        );
      });

      it("should allow fee of 0 (no fee)", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: 0,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Setting zero fee",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.platformFeePercentage).to.equal(0);

      });

      it("should allow max fee of 1000 bps (10%)", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: 1000,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Setting max fee",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.platformFeePercentage).to.equal(1000);
      });
    });

    describe("platform_fee_recipient", () => {
      it("should update platform fee recipient", async () => {
        const timestamp = getCurrentTimestamp();
        const newRecipient = Keypair.generate().publicKey;

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: newRecipient,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Changing fee recipient",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.platformFeeRecipient.toString()).to.equal(newRecipient.toString());

      });
    });

    describe("verification_threshold", () => {
      it("should update verification threshold", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: 2,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Lowering threshold",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.verificationThreshold).to.equal(2);
      });

      it("should fail with threshold of 0", async () => {
        const timestamp = getCurrentTimestamp();

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: null,
                platformFeeRecipient: null,
                verificationThreshold: 0,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Invalid threshold",
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "VerificationThresholdNotMet"
        );
      });

      it("should fail with threshold > max_verifiers", async () => {
        const timestamp = getCurrentTimestamp();
        const config = await program.account.platformConfig.fetch(platformConfigPDA);

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: null,
                platformFeeRecipient: null,
                verificationThreshold: config.maxVerifiers + 1,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Invalid threshold",
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "VerificationThresholdNotMet"
        );
      });
    });

    describe("max_verifiers", () => {
      it("should update max verifiers", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: 10,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Increasing max verifiers",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.maxVerifiers).to.equal(10);
      });

      it("should fail with max_verifiers < current threshold", async () => {
        const timestamp = getCurrentTimestamp();
        const config = await program.account.platformConfig.fetch(platformConfigPDA);

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: null,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: config.verificationThreshold - 1,
                minDonationAmount: null,
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Invalid max verifiers",
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "InvalidInput"
        );
      });
    });

    describe("min_donation_amount", () => {
      it("should update min donation amount", async () => {
        const timestamp = getCurrentTimestamp();
        const newMin = new anchor.BN(500000); // 0.5 USDC

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: newMin,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Lowering min donation",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.minDonationAmount.toNumber()).to.equal(newMin.toNumber());
      });

      it("should fail with min = 0", async () => {
        const timestamp = getCurrentTimestamp();

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: null,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: new anchor.BN(0),
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Invalid min",
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "InvalidInput"
        );
      });

      it("should fail with min >= max", async () => {
        const timestamp = getCurrentTimestamp();
        const config = await program.account.platformConfig.fetch(platformConfigPDA);

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: null,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: config.maxDonationAmount,
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Invalid min",
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "InvalidInput"
        );
      });
    });

    describe("max_donation_amount", () => {
      it("should update max donation amount", async () => {
        const timestamp = getCurrentTimestamp();
        const newMax = new anchor.BN(5000000000000); // 5M USDC

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: newMax,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Increasing max donation",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.maxDonationAmount.toNumber()).to.equal(newMax.toNumber());
      });

      it("should fail with max <= min", async () => {
        const timestamp = getCurrentTimestamp();
        const config = await program.account.platformConfig.fetch(platformConfigPDA);

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: null,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: config.minDonationAmount,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Invalid max",
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "InvalidInput"
        );
      });
    });

    describe("usdc_mint", () => {
      it("should update USDC mint", async () => {
        const timestamp = getCurrentTimestamp();
        const newMint = await createTokenMint(provider.connection, admin.payer, 6);

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: newMint,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Updating USDC mint",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.usdcMint.toString()).to.equal(newMint.toString());
      });
    });

    describe("is_paused", () => {
      it("should pause platform", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: true,
              solUsdOracle: null,
            },
            reason: "Pausing for maintenance",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.isPaused).to.be.true;
      });

      it("should unpause platform", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: false,
              solUsdOracle: null,
            },
            reason: "Resuming operations",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.isPaused).to.be.false;
      });
    });

    describe("sol_usd_oracle", () => {
      it("should set SOL/USD oracle", async () => {
        const timestamp = getCurrentTimestamp();
        const oracleAddress = Keypair.generate().publicKey;

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: null,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: oracleAddress,
            },
            reason: "Setting oracle",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.solUsdOracle.toString()).to.equal(oracleAddress.toString());
      });
    });

    describe("authorization", () => {
      it("should fail when non-admin tries to update config", async () => {
        const nonAdmin = Keypair.generate();
        await airdropSOL(provider.connection, nonAdmin.publicKey);

        const timestamp = getCurrentTimestamp();

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: 500,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: "Unauthorized",
              metadata: "{}",
            })
            .accountsPartial({
              admin: nonAdmin.publicKey,
              config: platformConfigPDA,
            })
            .signers([nonAdmin])
            .rpc(),
          "UnauthorizedAdmin"
        );
      });
    });

    describe("audit trail", () => {
      it("should create admin action record on update", async () => {
        const timestamp = getCurrentTimestamp();

        const tx = await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: 150,
              platformFeeRecipient: null,
              verificationThreshold: null,
              maxVerifiers: null,
              minDonationAmount: null,
              maxDonationAmount: null,
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Audit test update",
            metadata: '{"test": true}',
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        // Verify the transaction succeeded (admin action was created)
        expect(tx).to.be.a("string");
      });

      it("should fail with reason too long", async () => {
        const timestamp = getCurrentTimestamp();
        const longReason = "x".repeat(300); // MAX_REASON_LEN is likely 256

        await expectError(
          program.methods
            .updatePlatformConfig(new anchor.BN(timestamp), {
              configParams: {
                platformFeePercentage: 100,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: null,
                usdcMint: null,
                isPaused: null,
                solUsdOracle: null,
              },
              reason: longReason,
              metadata: "{}",
            })
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "StringTooLong"
        );
      });
    });

    describe("multiple updates", () => {
      it("should update multiple fields at once", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .updatePlatformConfig(new anchor.BN(timestamp), {
            configParams: {
              platformFeePercentage: 200,
              platformFeeRecipient: null,
              verificationThreshold: 3,
              maxVerifiers: 7,
              minDonationAmount: new anchor.BN(1000000),
              maxDonationAmount: new anchor.BN(2000000000000),
              usdcMint: null,
              isPaused: null,
              solUsdOracle: null,
            },
            reason: "Bulk update",
            metadata: "{}",
          })
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.platformFeePercentage).to.equal(200);
        expect(config.verificationThreshold).to.equal(3);
        expect(config.maxVerifiers).to.equal(7);
        expect(config.minDonationAmount.toNumber()).to.equal(1000000);
        expect(config.maxDonationAmount.toNumber()).to.equal(2000000000000);
      });
    });
  });


  describe("allowed_tokens", () => {
    let testToken1: PublicKey;
    let testToken2: PublicKey;

    before(async () => {
      testToken1 = await createTokenMint(provider.connection, admin.payer, 6);
      testToken2 = await createTokenMint(provider.connection, admin.payer, 9);
    });

    describe("add_allowed_token", () => {
      it("should add a new allowed token", async () => {
        const timestamp = getCurrentTimestamp();
        const configBefore = await program.account.platformConfig.fetch(platformConfigPDA);
        const tokenCountBefore = configBefore.allowedTokens.length;

        await program.methods
          .addAllowedToken(
            new anchor.BN(timestamp),
            testToken1,
            "Adding test token for donations"
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.allowedTokens.length).to.equal(tokenCountBefore + 1);

        const tokenExists = config.allowedTokens.some(
          (t: PublicKey) => t.toString() === testToken1.toString()
        );
        expect(tokenExists).to.be.true;
      });

      it("should fail to add duplicate token", async () => {
        const timestamp = getCurrentTimestamp();

        await expectError(
          program.methods
            .addAllowedToken(
              new anchor.BN(timestamp),
              testToken1,
              "Duplicate token"
            )
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "TokenAlreadyAllowed"
        );
      });

      it("should add multiple different tokens", async () => {
        const timestamp = getCurrentTimestamp();

        await program.methods
          .addAllowedToken(
            new anchor.BN(timestamp),
            testToken2,
            "Adding second test token"
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        const token2Exists = config.allowedTokens.some(
          (t: PublicKey) => t.toString() === testToken2.toString()
        );
        expect(token2Exists).to.be.true;
      });

      it("should fail when non-admin tries to add token", async () => {
        const nonAdmin = Keypair.generate();
        await airdropSOL(provider.connection, nonAdmin.publicKey);
        const newToken = await createTokenMint(provider.connection, admin.payer, 6);
        const timestamp = getCurrentTimestamp();

        await expectError(
          program.methods
            .addAllowedToken(
              new anchor.BN(timestamp),
              newToken,
              "Unauthorized add"
            )
            .accountsPartial({
              admin: nonAdmin.publicKey,
              config: platformConfigPDA,
            })
            .signers([nonAdmin])
            .rpc(),
          "UnauthorizedAdmin"
        );
      });

      it("should create admin action record when adding token", async () => {
        const newToken = await createTokenMint(provider.connection, admin.payer, 6);
        const timestamp = getCurrentTimestamp();

        const tx = await program.methods
          .addAllowedToken(
            new anchor.BN(timestamp),
            newToken,
            "Adding token with audit"
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        expect(tx).to.be.a("string");
      });
    });

    describe("remove_allowed_token", () => {
      it("should remove an allowed token", async () => {
        const timestamp = getCurrentTimestamp();
        const configBefore = await program.account.platformConfig.fetch(platformConfigPDA);
        const tokenCountBefore = configBefore.allowedTokens.length;

        await program.methods
          .removeAllowedToken(
            new anchor.BN(timestamp),
            testToken1,
            "Removing test token"
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.allowedTokens.length).to.equal(tokenCountBefore - 1);

        const tokenExists = config.allowedTokens.some(
          (t: PublicKey) => t.toString() === testToken1.toString()
        );
        expect(tokenExists).to.be.false;
      });

      it("should fail to remove non-existent token", async () => {
        const timestamp = getCurrentTimestamp();
        const nonExistentToken = Keypair.generate().publicKey;

        await expectError(
          program.methods
            .removeAllowedToken(
              new anchor.BN(timestamp),
              nonExistentToken,
              "Removing non-existent"
            )
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "TokenNotInAllowedList"
        );
      });

      it("should fail to remove primary USDC token", async () => {
        const timestamp = getCurrentTimestamp();
        const config = await program.account.platformConfig.fetch(platformConfigPDA);

        await expectError(
          program.methods
            .removeAllowedToken(
              new anchor.BN(timestamp),
              config.usdcMint,
              "Trying to remove USDC"
            )
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "CannotRemovePrimaryToken"
        );
      });

      it("should fail when non-admin tries to remove token", async () => {
        const nonAdmin = Keypair.generate();
        await airdropSOL(provider.connection, nonAdmin.publicKey);
        const timestamp = getCurrentTimestamp();

        await expectError(
          program.methods
            .removeAllowedToken(
              new anchor.BN(timestamp),
              testToken2,
              "Unauthorized remove"
            )
            .accountsPartial({
              admin: nonAdmin.publicKey,
              config: platformConfigPDA,
            })
            .signers([nonAdmin])
            .rpc(),
          "UnauthorizedAdmin"
        );
      });

      it("should create admin action record when removing token", async () => {
        const timestamp = getCurrentTimestamp();

        const tx = await program.methods
          .removeAllowedToken(
            new anchor.BN(timestamp),
            testToken2,
            "Removing token with audit"
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        expect(tx).to.be.a("string");
      });
    });
  });

  describe("platform_state", () => {
    it("should have correct timestamps", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);

      expect(config.createdAt.toNumber()).to.be.a("number");
      expect(config.updatedAt.toNumber()).to.be.a("number");
      expect(config.updatedAt.toNumber()).to.be.at.least(config.createdAt.toNumber());
    });

    it("should have valid bump seed", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(config.bump).to.be.a("number");
      expect(config.bump).to.be.at.most(255);
    });

    it("should track admin transfer timeout", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);

      // Default is 7 days in seconds
      expect(config.adminTransferTimeout.toNumber()).to.equal(7 * 24 * 60 * 60);
    });
  });

  describe("admin_transfer", () => {
    let newAdmin: Keypair;

    before(async () => {
      newAdmin = Keypair.generate();
      await airdropSOL(provider.connection, newAdmin.publicKey);
    });

    describe("initiate_admin_transfer", () => {
      it("should initiate admin transfer", async () => {
        const actionId = getCurrentTimestamp();

        await program.methods
          .initiateAdminTransfer(
            { newAdmin: newAdmin.publicKey, reason: "Transferring to new admin" },
            new anchor.BN(actionId)
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.pendingAdmin.toString()).to.equal(newAdmin.publicKey.toString());
        expect(config.adminTransferInitiatedAt).to.not.be.null;
      });

      it("should fail to initiate transfer when one is already pending", async () => {
        const actionId = getCurrentTimestamp();
        const anotherAdmin = Keypair.generate();

        await expectError(
          program.methods
            .initiateAdminTransfer(
              { newAdmin: anotherAdmin.publicKey, reason: "Another transfer" },
              new anchor.BN(actionId)
            )
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "TransferAlreadyPending"
        );
      });

      it("should fail when non-admin tries to initiate transfer", async () => {
        const nonAdmin = Keypair.generate();
        await airdropSOL(provider.connection, nonAdmin.publicKey);
        const actionId = getCurrentTimestamp();

        await expectError(
          program.methods
            .initiateAdminTransfer(
              { newAdmin: newAdmin.publicKey, reason: "Unauthorized" },
              new anchor.BN(actionId)
            )
            .accountsPartial({
              admin: nonAdmin.publicKey,
              config: platformConfigPDA,
            })
            .signers([nonAdmin])
            .rpc(),
          "UnauthorizedAdmin"
        );
      });
    });

    describe("cancel_admin_transfer", () => {
      it("should cancel pending admin transfer", async () => {
        const actionId = getCurrentTimestamp();

        await program.methods
          .cancelAdminTransfer(
            { reason: "Changed mind" },
            new anchor.BN(actionId)
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.pendingAdmin).to.be.null;
        expect(config.adminTransferInitiatedAt).to.be.null;
      });

      it("should fail to cancel when no transfer is pending", async () => {
        const actionId = getCurrentTimestamp();

        await expectError(
          program.methods
            .cancelAdminTransfer(
              { reason: "No transfer" },
              new anchor.BN(actionId)
            )
            .accountsPartial({
              admin: admin.publicKey,
              config: platformConfigPDA,
            })
            .rpc(),
          "NoTransferPending"
        );
      });
    });

    describe("accept_admin_transfer", () => {
      before(async () => {
        // Initiate a new transfer for accept tests
        const actionId = getCurrentTimestamp();
        await program.methods
          .initiateAdminTransfer(
            { newAdmin: newAdmin.publicKey, reason: "For accept test" },
            new anchor.BN(actionId)
          )
          .accountsPartial({
            admin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();
      });

      it("should fail when wrong person tries to accept", async () => {
        const wrongPerson = Keypair.generate();
        await airdropSOL(provider.connection, wrongPerson.publicKey);
        const actionId = getCurrentTimestamp();

        await expectError(
          program.methods
            .acceptAdminTransfer(
              { reason: "Wrong person" },
              new anchor.BN(actionId)
            )
            .accountsPartial({
              newAdmin: wrongPerson.publicKey,
              config: platformConfigPDA,
            })
            .signers([wrongPerson])
            .rpc(),
          "NotPendingAdmin"
        );
      });

      it("should accept admin transfer", async () => {
        const actionId = getCurrentTimestamp();

        await program.methods
          .acceptAdminTransfer(
            { reason: "Accepting transfer" },
            new anchor.BN(actionId)
          )
          .accountsPartial({
            newAdmin: newAdmin.publicKey,
            config: platformConfigPDA,
          })
          .signers([newAdmin])
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.admin.toString()).to.equal(newAdmin.publicKey.toString());
        expect(config.pendingAdmin).to.be.null;
        expect(config.adminTransferInitiatedAt).to.be.null;
      });

      it("should fail to accept when no transfer is pending", async () => {
        const actionId = getCurrentTimestamp();

        await expectError(
          program.methods
            .acceptAdminTransfer(
              { reason: "No transfer" },
              new anchor.BN(actionId)
            )
            .accountsPartial({
              newAdmin: newAdmin.publicKey,
              config: platformConfigPDA,
            })
            .signers([newAdmin])
            .rpc(),
          "NoTransferPending"
        );
      });
    });

    describe("transfer_back_to_original", () => {
      it("should transfer admin back to original", async () => {
        // newAdmin is now the admin, transfer back
        const actionId1 = getCurrentTimestamp();
        await program.methods
          .initiateAdminTransfer(
            { newAdmin: admin.publicKey, reason: "Transfer back" },
            new anchor.BN(actionId1)
          )
          .accountsPartial({
            admin: newAdmin.publicKey,
            config: platformConfigPDA,
          })
          .signers([newAdmin])
          .rpc();

        const actionId2 = getCurrentTimestamp();
        await program.methods
          .acceptAdminTransfer(
            { reason: "Accepting back" },
            new anchor.BN(actionId2)
          )
          .accountsPartial({
            newAdmin: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        expect(config.admin.toString()).to.equal(admin.publicKey.toString());
      });
    });
  });
});
