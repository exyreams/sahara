import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import {
    airdropSOL,
    derivePlatformConfigPDA,
    createTokenMint,
} from "./helpers/test-utils";
import { createMockPlatformParams } from "./helpers/mock-data";
import {
    expectError,
    assertPlatformPaused,
    assertPlatformNotPaused,
} from "./helpers/assertions";

describe("Platform Configuration", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let platformConfigPDA: anchor.web3.PublicKey;
    let usdcMint: anchor.web3.PublicKey;

    before(async () => {
        // Derive platform config PDA
        [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

        // Create USDC mint for testing
        usdcMint = await createTokenMint(provider.connection, admin.payer, 6);
    });

    describe("Platform Initialization", () => {
        it("Verifies platform is already initialized", async () => {
            // Platform is initialized by 00-setup.test.ts
            const config = await program.account.platformConfig.fetch(platformConfigPDA);

            expect(config.admin.toString()).to.equal(admin.publicKey.toString());
            expect(config.isPaused).to.be.false;
            expect(config.platformName).to.equal("SaharaSol Test");
            expect(config.platformVersion).to.equal("1.0.0");

            // Verify timestamps
            expect(config.createdAt.toNumber()).to.be.greaterThan(0);
            expect(config.updatedAt.toNumber()).to.be.greaterThan(0);
        });

        it.skip("Rejects initialization with invalid fee percentage (> 1000 bps)", async () => {
            // Skipped: Cannot test initialization errors since platform is already initialized
            // This would require a separate test validator instance
        });

        it.skip("Rejects initialization with invalid verification threshold", async () => {
            // Skipped: Cannot test initialization errors since platform is already initialized
            // This would require a separate test validator instance
        });

        it.skip("Rejects initialization with threshold exceeding max verifiers", async () => {
            // Skipped: Cannot test initialization errors since platform is already initialized
            // This would require a separate test validator instance
        });
    });

    describe("Platform Configuration Updates", () => {
        it("Updates platform configuration as admin", async () => {
            const updateParams = {
                platformFeePercentage: 200, // 2%
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: null,
                isPaused: null,
                solUsdOracle: null,
            };

            await program.methods
                .updatePlatformConfig(updateParams)
                .accountsPartial({
                    admin: admin.publicKey,
                })
                .rpc();

            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            expect(config.platformFeePercentage).to.equal(200);
        });

        it("Rejects configuration updates from non-admin", async () => {
            const nonAdmin = Keypair.generate();
            await airdropSOL(provider.connection, nonAdmin.publicKey);

            const updateParams = {
                platformFeePercentage: 300,
                platformFeeRecipient: null,
                verificationThreshold: null,
                maxVerifiers: null,
                minDonationAmount: null,
                maxDonationAmount: null,
                isPaused: null,
                solUsdOracle: null,
            };

            await expectError(
                program.methods
                    .updatePlatformConfig(updateParams)
                    .accountsPartial({
                        admin: nonAdmin.publicKey,
                    })
                    .signers([nonAdmin])
                    .rpc(),
                "UnauthorizedAdmin"
            );
        });

        it("Updates individual configuration fields", async () => {
            // Update min donation amount
            await program.methods
                .updatePlatformConfig({
                    platformFeePercentage: null,
                    platformFeeRecipient: null,
                    verificationThreshold: null,
                    maxVerifiers: null,
                    minDonationAmount: new anchor.BN(2000000), // 2 USDC
                    maxDonationAmount: null,
                    isPaused: null,
                    solUsdOracle: null,
                })
                .accountsPartial({
                    admin: admin.publicKey,
                })
                .rpc();

            let config = await program.account.platformConfig.fetch(platformConfigPDA);
            expect(config.minDonationAmount.toNumber()).to.equal(2000000);

            // Update verification threshold
            await program.methods
                .updatePlatformConfig({
                    platformFeePercentage: null,
                    platformFeeRecipient: null,
                    verificationThreshold: 4,
                    maxVerifiers: null,
                    minDonationAmount: null,
                    maxDonationAmount: null,
                    isPaused: null,
                    solUsdOracle: null,
                })
                .accountsPartial({
                    admin: admin.publicKey,
                })
                .rpc();

            config = await program.account.platformConfig.fetch(platformConfigPDA);
            expect(config.verificationThreshold).to.equal(4);
        });
    });

    describe("Emergency Pause Functionality", () => {
        it("Sets emergency pause as admin", async () => {
            await program.methods
                .updatePlatformConfig({
                    platformFeePercentage: null,
                    platformFeeRecipient: null,
                    verificationThreshold: null,
                    maxVerifiers: null,
                    minDonationAmount: null,
                    maxDonationAmount: null,
                    isPaused: true,
                    solUsdOracle: null,
                })
                .accountsPartial({
                    admin: admin.publicKey,
                })
                .rpc();

            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            assertPlatformPaused(config);
        });

        it("Resumes operations after unpause", async () => {
            await program.methods
                .updatePlatformConfig({
                    platformFeePercentage: null,
                    platformFeeRecipient: null,
                    verificationThreshold: null,
                    maxVerifiers: null,
                    minDonationAmount: null,
                    maxDonationAmount: null,
                    isPaused: false,
                    solUsdOracle: null,
                })
                .accountsPartial({
                    admin: admin.publicKey,
                })
                .rpc();

            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            assertPlatformNotPaused(config);
        });

        it("Rejects pause toggle by non-admin", async () => {
            const nonAdmin = Keypair.generate();
            await airdropSOL(provider.connection, nonAdmin.publicKey);

            await expectError(
                program.methods
                    .updatePlatformConfig({
                        platformFeePercentage: null,
                        platformFeeRecipient: null,
                        verificationThreshold: null,
                        maxVerifiers: null,
                        minDonationAmount: null,
                        maxDonationAmount: null,
                        isPaused: true,
                        solUsdOracle: null,
                    })
                    .accountsPartial({
                        admin: nonAdmin.publicKey,
                    })
                    .signers([nonAdmin])
                    .rpc(),
                "UnauthorizedAdmin"
            );
        });
    });
});
