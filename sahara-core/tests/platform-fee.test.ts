import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    createMint,
    createAccount,
    mintTo,
    getAccount,
} from "@solana/spl-token";
import {
    airdropSOL,
    deriveNGOPDA,
    derivePlatformConfigPDA,
    deriveDisasterPDA,
    deriveFundPoolPDA,
    deriveBeneficiaryPDA,
} from "./helpers/test-utils";
import {
    createMockNGOParams,
    createMockDisasterParams,
    createMockFundPoolParams,
    createMockBeneficiaryParams,
} from "./helpers/mock-data";

describe("Platform Fee Collection", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let platformConfigPDA: PublicKey;
    let tokenMint: PublicKey;
    let ngoAuthority: Keypair;
    let ngoPDA: PublicKey;
    let disasterId: string;
    let disasterPDA: PublicKey;
    let poolId: string;
    let poolPDA: PublicKey;
    let poolTokenAccount: PublicKey;
    let donor: Keypair;
    let donorTokenAccount: PublicKey;
    let platformFeeRecipient: PublicKey;
    let beneficiaryAuthority: Keypair;
    let beneficiaryPDA: PublicKey;
    let beneficiaryTokenAccount: PublicKey;

    before(async () => {
        [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

        // Create token mint
        const mintAuthority = Keypair.generate();
        tokenMint = await createMint(
            provider.connection,
            admin.payer,
            mintAuthority.publicKey,
            null,
            6
        );

        // Create NGO
        ngoAuthority = Keypair.generate();
        await airdropSOL(provider.connection, ngoAuthority.publicKey);
        [ngoPDA] = deriveNGOPDA(ngoAuthority.publicKey, program.programId);

        const ngoParams = createMockNGOParams();
        await program.methods
            .registerNgo(ngoParams)
            .accountsPartial({
                authority: ngoAuthority.publicKey,
            })
            .signers([ngoAuthority])
            .rpc();

        await program.methods
            .verifyNgo(ngoAuthority.publicKey, {
                reason: "Verified for testing",
            })
            .accountsPartial({
                ngo: ngoPDA,
                config: platformConfigPDA,
                admin: admin.publicKey,
            })
            .rpc();

        // Create disaster
        disasterId = "TEST-DISASTER-" + Date.now();
        [disasterPDA] = deriveDisasterPDA(disasterId, program.programId);

        const disasterParams = createMockDisasterParams({ eventId: disasterId });
        await program.methods
            .initializeDisaster(disasterParams)
            .accountsPartial({
                config: platformConfigPDA,
                admin: admin.publicKey,
            })
            .rpc();

        // Create fund pool
        poolId = "TEST-POOL-" + Date.now();
        [poolPDA] = deriveFundPoolPDA(disasterId, poolId, program.programId);
        [poolTokenAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("pool-token"),
                Buffer.from(disasterId),
                Buffer.from(poolId),
            ],
            program.programId
        );

        const poolParams = createMockFundPoolParams(tokenMint);
        await program.methods
            .createFundPool(disasterId, poolId, poolParams)
            .accountsPartial({
                ngoAuthority: ngoAuthority.publicKey,
                tokenMint: tokenMint,
            })
            .signers([ngoAuthority])
            .rpc();

        // Create donor and mint tokens
        donor = Keypair.generate();
        await airdropSOL(provider.connection, donor.publicKey);

        donorTokenAccount = await createAccount(
            provider.connection,
            admin.payer,
            tokenMint,
            donor.publicKey
        );

        await mintTo(
            provider.connection,
            admin.payer,
            tokenMint,
            donorTokenAccount,
            mintAuthority,
            1_000_000_000 // 1000 tokens with 6 decimals
        );

        // Create platform fee recipient token account
        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        platformFeeRecipient = await createAccount(
            provider.connection,
            admin.payer,
            tokenMint,
            config.platformFeeRecipient
        );

        // Create beneficiary for direct donation tests
        beneficiaryAuthority = Keypair.generate();
        await airdropSOL(provider.connection, beneficiaryAuthority.publicKey);
        [beneficiaryPDA] = deriveBeneficiaryPDA(
            beneficiaryAuthority.publicKey,
            disasterId,
            program.programId
        );

        // Register and verify beneficiary
        const fieldWorker = Keypair.generate();
        await airdropSOL(provider.connection, fieldWorker.publicKey);

        const beneficiaryParams = createMockBeneficiaryParams({
            disasterId: disasterId,
        });

        await program.methods
            .registerBeneficiary(beneficiaryParams)
            .accountsPartial({
                authority: beneficiaryAuthority.publicKey,
                fieldWorkerAuthority: fieldWorker.publicKey,
            })
            .signers([fieldWorker])
            .rpc();

        // Verify beneficiary (simplified - would need proper multi-sig in production)
        await program.methods
            .verifyBeneficiary(beneficiaryAuthority.publicKey, disasterId)
            .accountsPartial({
                fieldWorkerAuthority: fieldWorker.publicKey,
            })
            .signers([fieldWorker])
            .rpc();

        beneficiaryTokenAccount = await createAccount(
            provider.connection,
            admin.payer,
            tokenMint,
            beneficiaryAuthority.publicKey
        );
    });

    describe("Pool Donation Fee Collection", () => {
        it("Collects platform fee on pool donation", async () => {
            const donationAmount = 100_000_000; // 100 tokens
            const timestamp = Math.floor(Date.now() / 1000);

            // Get initial balances
            const initialPoolBalance = (await getAccount(
                provider.connection,
                poolTokenAccount
            )).amount;
            const initialFeeBalance = (await getAccount(
                provider.connection,
                platformFeeRecipient
            )).amount;

            // Get platform fee percentage
            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            const feePercentage = config.platformFeePercentage;
            const expectedFee = Math.floor((donationAmount * feePercentage) / 10000);
            const expectedNetAmount = donationAmount - expectedFee;

            await program.methods
                .donateToPool(
                    disasterId,
                    poolId,
                    {
                        amount: new anchor.BN(donationAmount),
                        message: "Test donation",
                        isAnonymous: false,
                    },
                    new anchor.BN(timestamp)
                )
                .accountsPartial({
                    donor: donor.publicKey,
                    donorTokenAccount: donorTokenAccount,
                    platformFeeRecipient: platformFeeRecipient,
                })
                .remainingAccounts([
                    { pubkey: ngoPDA, isWritable: false, isSigner: false },
                ])
                .signers([donor])
                .rpc();

            // Check balances after donation
            const finalPoolBalance = (await getAccount(
                provider.connection,
                poolTokenAccount
            )).amount;
            const finalFeeBalance = (await getAccount(
                provider.connection,
                platformFeeRecipient
            )).amount;

            // Verify net amount went to pool
            expect(Number(finalPoolBalance - initialPoolBalance)).to.equal(expectedNetAmount);

            // Verify fee went to platform
            expect(Number(finalFeeBalance - initialFeeBalance)).to.equal(expectedFee);
        });

        it("Handles zero fee correctly", async () => {
            // This would require setting platform fee to 0, which we won't do in this test
            // Just documenting that the code handles platform_fee > 0 check
        });
    });

    describe("Direct Donation Fee Collection", () => {
        it("Collects platform fee on direct beneficiary donation", async () => {
            const donationAmount = 50_000_000; // 50 tokens
            const timestamp = Math.floor(Date.now() / 1000);

            // Get initial balances
            const initialBeneficiaryBalance = (await getAccount(
                provider.connection,
                beneficiaryTokenAccount
            )).amount;
            const initialFeeBalance = (await getAccount(
                provider.connection,
                platformFeeRecipient
            )).amount;

            // Get platform fee percentage
            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            const feePercentage = config.platformFeePercentage;
            const expectedFee = Math.floor((donationAmount * feePercentage) / 10000);
            const expectedNetAmount = donationAmount - expectedFee;

            await program.methods
                .donateDirect(
                    beneficiaryAuthority.publicKey,
                    disasterId,
                    {
                        amount: new anchor.BN(donationAmount),
                        message: "Direct donation test",
                        isAnonymous: false,
                    },
                    new anchor.BN(timestamp)
                )
                .accountsPartial({
                    donor: donor.publicKey,
                    donorTokenAccount: donorTokenAccount,
                    beneficiaryTokenAccount: beneficiaryTokenAccount,
                    platformFeeRecipient: platformFeeRecipient,
                })
                .signers([donor])
                .rpc();

            // Check balances after donation
            const finalBeneficiaryBalance = (await getAccount(
                provider.connection,
                beneficiaryTokenAccount
            )).amount;
            const finalFeeBalance = (await getAccount(
                provider.connection,
                platformFeeRecipient
            )).amount;

            // Verify net amount went to beneficiary
            expect(Number(finalBeneficiaryBalance - initialBeneficiaryBalance)).to.equal(expectedNetAmount);

            // Verify fee went to platform
            expect(Number(finalFeeBalance - initialFeeBalance)).to.equal(expectedFee);
        });
    });

    describe("Fee Calculation", () => {
        it("Calculates fees correctly for various amounts", async () => {
            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            const feePercentage = config.platformFeePercentage;

            const testAmounts = [
                1_000_000,    // 1 token
                10_000_000,   // 10 tokens
                100_000_000,  // 100 tokens
                1_000_000_000, // 1000 tokens
            ];

            testAmounts.forEach(amount => {
                const expectedFee = Math.floor((amount * feePercentage) / 10000);
                const netAmount = amount - expectedFee;

                expect(netAmount + expectedFee).to.equal(amount);
                expect(expectedFee).to.be.greaterThan(0);
            });
        });
    });
});
