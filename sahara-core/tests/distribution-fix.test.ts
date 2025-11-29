import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
    airdropSOL,
    derivePlatformConfigPDA,
    deriveDisasterPDA,
    deriveNGOPDA,
    deriveFieldWorkerPDA,
    deriveBeneficiaryPDA,
    deriveFundPoolPDA,
    derivePoolRegistrationPDA,
    deriveDistributionPDA,
    createTokenMint,
    createTokenAccount,
    mintTokens,
    getCurrentTimestamp,
} from "./helpers/test-utils";

describe("Distribution Fix Tests", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let platformConfigPDA: PublicKey;
    let usdcMint: PublicKey;
    let disasterId: string;
    let disasterPDA: PublicKey;
    let ngoAuthority: Keypair;
    let ngoPDA: PublicKey;
    let poolId: string;
    let poolPDA: PublicKey;
    let poolTokenAccount: PublicKey;

    before(async () => {
        // Get platform config
        [platformConfigPDA] = derivePlatformConfigPDA(program.programId);
        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        usdcMint = config.usdcMint;

        // Setup NGO
        ngoAuthority = Keypair.generate();
        await airdropSOL(provider.connection, ngoAuthority.publicKey);
        [ngoPDA] = deriveNGOPDA(ngoAuthority.publicKey, program.programId);

        // Register and verify NGO (simplified for tests)
        await program.methods
            .registerNgo({
                name: "Test NGO for Distribution",
                registrationNumber: "TEST-001",
                email: "test@ngo.org",
                phoneNumber: "+1234567890",
                website: "https://testngo.org",
                description: "Test NGO",
                address: "123 Test St",
                city: "Test City",
                country: "Test Country",
                verified: false,
                documentsHash: "test-hash",
            })
            .accountsPartial({
                authority: ngoAuthority.publicKey,
            })
            .signers([ngoAuthority])
            .rpc();

        // Create disaster
        disasterId = `disaster-test-${Date.now()}`;
        [disasterPDA] = deriveDisasterPDA(disasterId, program.programId);

        await program.methods
            .initializeDisaster(
                {
                    eventId: disasterId,
                    name: "Test Earthquake 2025",
                    eventType: { earthquake: {} },
                    location: {
                        latitude: "27.7172",
                        longitude: "85.3240",
                        district: "Kathmandu",
                        municipality: "Test Municipality",
                        ward: 1,
                    },
                    severity: 8,
                    affectedAreas: ["Kathmandu"],
                    description: "Test earthquake for distribution tests",
                    estimatedAffectedPopulation: 10000,
                },
                getCurrentTimestamp()
            )
            .accountsPartial({
                authority: admin.publicKey,
            })
            .rpc();
    });

    describe("Equal Distribution Tests", () => {
        it("Should distribute equally among 2 beneficiaries", async () => {
            // Create pool
            poolId = `pool-equal-2-${Date.now()}`;
            [poolPDA] = deriveFundPoolPDA(disasterId, poolId, program.programId);

            const [poolTokenPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("pool-token"),
                    Buffer.from(disasterId),
                    Buffer.from(poolId),
                ],
                program.programId
            );
            poolTokenAccount = poolTokenPDA;

            await program.methods
                .createFundPool(
                    disasterId,
                    poolId,
                    getCurrentTimestamp(),
                    {
                        name: "Test Equal Distribution Pool",
                        distributionType: { equal: {} },
                        timeLockDuration: null,
                        distributionPercentageImmediate: 100,
                        distributionPercentageLocked: 0,
                        eligibilityCriteria: "Test criteria",
                        minimumFamilySize: null,
                        minimumDamageSeverity: null,
                        targetAmount: new anchor.BN(1000_000000), // $1000
                        description: "Test pool for equal distribution",
                    }
                )
                .accountsPartial({
                    ngoAuthority: ngoAuthority.publicKey,
                    payer: ngoAuthority.publicKey,
                    tokenMint: usdcMint,
                })
                .signers([ngoAuthority])
                .rpc();

            // Donate to pool
            const donorTokenAccount = await createTokenAccount(
                provider.connection,
                admin.payer,
                usdcMint,
                admin.publicKey
            );
            await mintTokens(
                provider.connection,
                admin.payer,
                usdcMint,
                donorTokenAccount,
                22_000000 // $22
            );

            await program.methods
                .donateToPool(
                    disasterId,
                    poolId,
                    {
                        amount: new anchor.BN(22_000000),
                        message: "Test donation",
                        isAnonymous: false,
                    },
                    getCurrentTimestamp()
                )
                .accountsPartial({
                    donor: admin.publicKey,
                    donorTokenAccount,
                    poolTokenAccount,
                })
                .remainingAccounts([
                    {
                        pubkey: ngoPDA,
                        isWritable: false,
                        isSigner: false,
                    },
                ])
                .rpc();

            // Create 2 beneficiaries
            const beneficiary1 = Keypair.generate();
            const beneficiary2 = Keypair.generate();
            await airdropSOL(provider.connection, beneficiary1.publicKey);
            await airdropSOL(provider.connection, beneficiary2.publicKey);

            const [ben1PDA] = deriveBeneficiaryPDA(
                beneficiary1.publicKey,
                disasterId,
                program.programId
            );
            const [ben2PDA] = deriveBeneficiaryPDA(
                beneficiary2.publicKey,
                disasterId,
                program.programId
            );

            // Register beneficiaries (simplified - skip field worker verification)
            const fieldWorker = Keypair.generate();
            await airdropSOL(provider.connection, fieldWorker.publicKey);
            const [fieldWorkerPDA] = deriveFieldWorkerPDA(
                fieldWorker.publicKey,
                program.programId
            );

            await program.methods
                .registerFieldWorker({
                    name: "Test Worker",
                    phoneNumber: "+1234567890",
                    email: "worker@test.com",
                    assignedDistrict: "Kathmandu",
                    credentials: "Test credentials",
                })
                .accountsPartial({
                    authority: fieldWorker.publicKey,
                    ngo: ngoPDA,
                    ngoAuthority: ngoAuthority.publicKey,
                    payer: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            // Register beneficiary 1
            await program.methods
                .registerBeneficiary(
                    {
                        disasterId,
                        name: "Test Beneficiary 1",
                        age: 30,
                        gender: "male",
                        phoneNumber: "+1234567891",
                        nationalId: "ID001",
                        householdId: "HH001",
                        familySize: 4,
                        damageSeverity: 7,
                        address: "Test Address 1",
                        location: {
                            latitude: "27.7172",
                            longitude: "85.3240",
                            district: "Kathmandu",
                            municipality: "Test Municipality",
                            ward: 1,
                        },
                        documentsHash: "hash1",
                    },
                    getCurrentTimestamp()
                )
                .accountsPartial({
                    authority: beneficiary1.publicKey,
                    payer: beneficiary1.publicKey,
                    disaster: disasterPDA,
                    fieldWorkerAuthority: fieldWorker.publicKey,
                })
                .signers([beneficiary1, fieldWorker])
                .rpc();

            // Register beneficiary 2
           await program.methods
                .registerBeneficiary(
                    {
                        disasterId,
                        name: "Test Beneficiary 2",
                        age: 35,
                        gender: "female",
                        phoneNumber: "+1234567892",
                        nationalId: "ID002",
                        householdId: "HH002",
                        familySize: 3,
                        damageSeverity: 6,
                        address: "Test Address 2",
                        location: {
                            latitude: "27.7172",
                            longitude: "85.3240",
                            district: "Kathmandu",
                            municipality: "Test Municipality",
                            ward: 1,
                        },
                        documentsHash: "hash2",
                    },
                    getCurrentTimestamp()
                )
                .accountsPartial({
                    authority: beneficiary2.publicKey,
                    payer: beneficiary2.publicKey,
                    disaster: disasterPDA,
                    fieldWorkerAuthority: fieldWorker.publicKey,
                })
                .signers([beneficiary2, fieldWorker])
                .rpc();

            // Verify beneficiaries (3-of-5 multi-sig - simplified for test)
            for (let i = 0; i < 3; i++) {
                const worker = Keypair.generate();
                await airdropSOL(provider.connection, worker.publicKey);
                const [workerPDA] = deriveFieldWorkerPDA(worker.publicKey, program.programId);

                await program.methods
                    .registerFieldWorker({
                        name: `Worker ${i}`,
                        phoneNumber: `+123456789${i}`,
                        email: `worker${i}@test.com`,
                        assignedDistrict: "Kathmandu",
                        credentials: "Credentials",
                    })
                    .accountsPartial({
                        authority: worker.publicKey,
                        ngo: ngoPDA,
                        ngoAuthority: ngoAuthority.publicKey,
                        payer: ngoAuthority.publicKey,
                    })
                    .signers([ngoAuthority])
                    .rpc();

                await program.methods
                    .verifyBeneficiary(beneficiary1.publicKey, disasterId, getCurrentTimestamp())
                    .accountsPartial({
                        beneficiary: ben1PDA,
                        fieldWorker: workerPDA,
                        fieldWorkerAuthority: worker.publicKey,
                    })
                    .signers([worker])
                    .rpc();

                await program.methods
                    .verifyBeneficiary(beneficiary2.publicKey, disasterId, getCurrentTimestamp())
                    .accountsPartial({
                        beneficiary: ben2PDA,
                        fieldWorker: workerPDA,
                        fieldWorkerAuthority: worker.publicKey,
                    })
                    .signers([worker])
                    .rpc();
            }

            // NEW WORKFLOW: Register beneficiaries to pool
            const [poolReg1PDA] = derivePoolRegistrationPDA(
                poolPDA,
                beneficiary1.publicKey,
                program.programId
            );
            const [poolReg2PDA] = derivePoolRegistrationPDA(
                poolPDA,
                beneficiary2.publicKey,
                program.programId
            );

            await program.methods
                .registerBeneficiaryForPool(
                    disasterId,
                    poolId,
                    { beneficiaryAuthority: beneficiary1.publicKey },
                    getCurrentTimestamp()
                )
                .accountsPartial({
                    pool: poolPDA,
                    poolRegistration: poolReg1PDA,
                    beneficiary: ben1PDA,
                    disaster: disasterPDA,
                    authority: ngoAuthority.publicKey,
                    payer: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            await program.methods
                .registerBeneficiaryForPool(
                    disasterId,
                    poolId,
                    { beneficiaryAuthority: beneficiary2.publicKey },
                    getCurrentTimestamp()
                )
                .accountsPartial({
                    pool: poolPDA,
                    poolRegistration: poolReg2PDA,
                    beneficiary: ben2PDA,
                    disaster: disasterPDA,
                    authority: ngoAuthority.publicKey,
                    payer: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            // Lock pool registration
            await program.methods
                .lockPoolRegistration(disasterId, poolId, getCurrentTimestamp())
                .accountsPartial({
                    pool: poolPDA,
                    authority: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            // Verify pool is locked
            let poolData = await program.account.fundPool.fetch(poolPDA);
            expect(poolData.registrationLocked).to.be.true;
            expect(poolData.registeredBeneficiaryCount).to.equal(2);
            expect(poolData.totalAllocationWeight.toNumber()).to.equal(2); // Equal distribution: 1+1

            // Distribute to both beneficiaries
            const [dist1PDA] = deriveDistributionPDA(
                beneficiary1.publicKey,
                poolPDA,
                program.programId
            );
            const [dist2PDA] = deriveDistributionPDA(
                beneficiary2.publicKey,
                poolPDA,
                program.programId
            );

            await program.methods
                .distributeFromPool(disasterId, poolId, {
                    beneficiaryAuthority: beneficiary1.publicKey,
                })
                .accountsPartial({
                    pool: poolPDA,
                    distribution: dist1PDA,
                    beneficiary: ben1PDA,
                    disaster: disasterPDA,
                    authority: ngoAuthority.publicKey,
                    poolRegistration: poolReg1PDA,
                })
                .signers([ngoAuthority])
                .rpc();

            await program.methods
                .distributeFromPool(disasterId, poolId, {
                    beneficiaryAuthority: beneficiary2.publicKey,
                })
                .accountsPartial({
                    pool: poolPDA,
                    distribution: dist2PDA,
                    beneficiary: ben2PDA,
                    disaster: disasterPDA,
                    authority: ngoAuthority.publicKey,
                    poolRegistration: poolReg2PDA,
                })
                .signers([ngoAuthority])
                .rpc();

            // Verify distributions
            const dist1 = await program.account.distribution.fetch(dist1PDA);
            const dist2 = await program.account.distribution.fetch(dist2PDA);

            // $22 / 2 = $11 each (accounting for platform fees)
            const expectedPerBeneficiary = 11_000000;
            const tolerance = 100000; // $0.10 tolerance for fees

            expect(dist1.amountAllocated.toNumber()).to.be.closeTo(
                expectedPerBeneficiary,
                tolerance
            );
            expect(dist2.amountAllocated.toNumber()).to.be.closeTo(
                expectedPerBeneficiary,
                tolerance
            );

            // Verify pool balance is not negative
            poolData = await program.account.fundPool.fetch(poolPDA);
            expect(poolData.totalDistributed.toNumber()).to.be.lte(
                poolData.totalDeposited.toNumber()
            );

            console.log("✅ Equal distribution test passed: $11 each for 2 beneficiaries");
        });
    });
});
