import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import {
    airdropSOL,
    deriveBeneficiaryPDA,
    deriveDisasterPDA,
    deriveNGOPDA,
    deriveFieldWorkerPDA,
} from "./helpers/test-utils";
import {
    generateDisasterId,
    createMockLocation,
    createMockBeneficiaryParams,
    createMockDisasterParams,
    createMockUpdateBeneficiaryParams,
    createMockNGOParams,
    createMockFieldWorkerParams,
} from "./helpers/mock-data";
import {
    expectError,
    assertBeneficiaryPending,
} from "./helpers/assertions";

describe("Beneficiary Management", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let disasterId: string;
    let disasterPDA: anchor.web3.PublicKey;
    let beneficiary1: Keypair;
    let beneficiary1PDA: anchor.web3.PublicKey;
    let ngoAuthority: Keypair;
    let ngoPDA: anchor.web3.PublicKey;
    let fieldWorker: Keypair;
    let fieldWorkerPDA: anchor.web3.PublicKey;

    before(async () => {
        // Register NGO
        ngoAuthority = Keypair.generate();
        await airdropSOL(provider.connection, ngoAuthority.publicKey);
        [ngoPDA] = deriveNGOPDA(ngoAuthority.publicKey, program.programId);

        await program.methods
            .registerNgo(createMockNGOParams({ name: "Beneficiary Test NGO" }))
            .accountsPartial({
                authority: ngoAuthority.publicKey,
            })
            .signers([ngoAuthority])
            .rpc();

        // Register field worker
        fieldWorker = Keypair.generate();
        await airdropSOL(provider.connection, fieldWorker.publicKey);
        [fieldWorkerPDA] = deriveFieldWorkerPDA(fieldWorker.publicKey, program.programId);

        await program.methods
            .registerFieldWorker(createMockFieldWorkerParams({ name: "Beneficiary Test Field Worker" }))
            .accountsPartial({
                authority: fieldWorker.publicKey,
                ngoAuthority: ngoAuthority.publicKey,
                payer: ngoAuthority.publicKey,
            })
            .signers([ngoAuthority])
            .rpc();

        // Create disaster
        disasterId = generateDisasterId();
        [disasterPDA] = deriveDisasterPDA(disasterId, program.programId);

        await program.methods
            .initializeDisaster(createMockDisasterParams({
                eventId: disasterId,
                name: "Beneficiary Test Disaster",
                severity: 7,
            }))
            .accountsPartial({
                authority: admin.publicKey,
            })
            .rpc();

        // Setup beneficiary
        beneficiary1 = Keypair.generate();
        await airdropSOL(provider.connection, beneficiary1.publicKey);
        [beneficiary1PDA] = deriveBeneficiaryPDA(
            beneficiary1.publicKey,
            disasterId,
            program.programId
        );
    });

    describe("Beneficiary Registration", () => {
        it("Registers beneficiary with all required fields", async () => {
            const params = createMockBeneficiaryParams({ disasterId });

            await program.methods
                .registerBeneficiary(params)
                .accountsPartial({
                    authority: beneficiary1.publicKey,
                    payer: beneficiary1.publicKey,
                    disaster: disasterPDA,
                    fieldWorkerAuthority: fieldWorker.publicKey,
                })
                .signers([beneficiary1, fieldWorker])
                .rpc();

            const beneficiary = await program.account.beneficiary.fetch(beneficiary1PDA);

            expect(beneficiary.authority.toString()).to.equal(beneficiary1.publicKey.toString());
            expect(beneficiary.disasterId).to.equal(disasterId);
            expect(beneficiary.name).to.equal(params.name);
            expect(beneficiary.phoneNumber).to.equal(params.phoneNumber);
            expect(beneficiary.familySize).to.equal(params.familySize);
            expect(beneficiary.damageSeverity).to.equal(params.damageSeverity);
            expect(beneficiary.ipfsDocumentHash).to.equal(params.ipfsDocumentHash);

            // Verify initial state
            assertBeneficiaryPending(beneficiary);
            expect(beneficiary.verifierApprovals).to.have.lengthOf(0);
            expect(beneficiary.totalReceived.toNumber()).to.equal(0);
            expect(beneficiary.registeredAt.toNumber()).to.be.greaterThan(0);
        });

        it("Registers beneficiary with optional household ID", async () => {
            const beneficiary2 = Keypair.generate();
            await airdropSOL(provider.connection, beneficiary2.publicKey);
            const [beneficiary2PDA] = deriveBeneficiaryPDA(
                beneficiary2.publicKey,
                disasterId,
                program.programId
            );

            const params = createMockBeneficiaryParams({
                disasterId,
                householdId: "HH-2025-001",
            });

            await program.methods
                .registerBeneficiary(params)
                .accountsPartial({
                    authority: beneficiary2.publicKey,
                    payer: beneficiary2.publicKey,
                    disaster: disasterPDA,
                    fieldWorkerAuthority: fieldWorker.publicKey,
                })
                .signers([beneficiary2, fieldWorker])
                .rpc();

            const beneficiary = await program.account.beneficiary.fetch(beneficiary2PDA);
            expect(beneficiary.householdId).to.equal("HH-2025-001");
        });

        it("Rejects registration with invalid damage severity (< 1)", async () => {
            const beneficiary3 = Keypair.generate();
            await airdropSOL(provider.connection, beneficiary3.publicKey);

            const params = createMockBeneficiaryParams({
                disasterId,
                damageSeverity: 0,
            });

            await expectError(
                program.methods
                    .registerBeneficiary(params)
                    .accountsPartial({
                        authority: beneficiary3.publicKey,
                        payer: beneficiary3.publicKey,
                        disaster: disasterPDA,
                        fieldWorkerAuthority: fieldWorker.publicKey,
                    })
                    .signers([beneficiary3, fieldWorker])
                    .rpc(),
                "InvalidDamageSeverity"
            );
        });

        it("Rejects registration with invalid damage severity (> 10)", async () => {
            const beneficiary4 = Keypair.generate();
            await airdropSOL(provider.connection, beneficiary4.publicKey);

            const params = createMockBeneficiaryParams({
                disasterId,
                damageSeverity: 15,
            });

            await expectError(
                program.methods
                    .registerBeneficiary(params)
                    .accountsPartial({
                        authority: beneficiary4.publicKey,
                        payer: beneficiary4.publicKey,
                        disaster: disasterPDA,
                        fieldWorkerAuthority: fieldWorker.publicKey,
                    })
                    .signers([beneficiary4, fieldWorker])
                    .rpc(),
                "InvalidDamageSeverity"
            );
        });

        it("Validates family size", async () => {
            const beneficiary5 = Keypair.generate();
            await airdropSOL(provider.connection, beneficiary5.publicKey);
            const [beneficiary5PDA] = deriveBeneficiaryPDA(
                beneficiary5.publicKey,
                disasterId,
                program.programId
            );

            const params = createMockBeneficiaryParams({
                disasterId,
                familySize: 1, // Minimum valid
            });

            await program.methods
                .registerBeneficiary(params)
                .accountsPartial({
                    authority: beneficiary5.publicKey,
                    payer: beneficiary5.publicKey,
                    disaster: disasterPDA,
                    fieldWorkerAuthority: fieldWorker.publicKey,
                })
                .signers([beneficiary5, fieldWorker])
                .rpc();

            const beneficiary = await program.account.beneficiary.fetch(beneficiary5PDA);
            expect(beneficiary.familySize).to.equal(1);
        });
    });

    describe("Beneficiary Profile Updates", () => {
        let updateBeneficiary: Keypair;
        let updateBeneficiaryPDA: anchor.web3.PublicKey;

        before(async () => {
            updateBeneficiary = Keypair.generate();
            await airdropSOL(provider.connection, updateBeneficiary.publicKey);
            [updateBeneficiaryPDA] = deriveBeneficiaryPDA(
                updateBeneficiary.publicKey,
                disasterId,
                program.programId
            );

            const params = createMockBeneficiaryParams({ disasterId });
            await program.methods
                .registerBeneficiary(params)
                .accountsPartial({
                    authority: updateBeneficiary.publicKey,
                    payer: updateBeneficiary.publicKey,
                    disaster: disasterPDA,
                    fieldWorkerAuthority: fieldWorker.publicKey,
                })
                .signers([updateBeneficiary, fieldWorker])
                .rpc();
        });

        it("Updates phone number", async () => {
            const newPhone = "+977-9999999999";

            await program.methods
                .updateBeneficiary(disasterId, createMockUpdateBeneficiaryParams({ phoneNumber: newPhone }))
                .accountsPartial({
                    beneficiary: updateBeneficiaryPDA,
                    authority: updateBeneficiary.publicKey,
                })
                .signers([updateBeneficiary])
                .rpc();

            const beneficiary = await program.account.beneficiary.fetch(updateBeneficiaryPDA);
            expect(beneficiary.phoneNumber).to.equal(newPhone);
        });

        it("Updates family size", async () => {
            await program.methods
                .updateBeneficiary(disasterId, createMockUpdateBeneficiaryParams({ familySize: 8 }))
                .accountsPartial({
                    beneficiary: updateBeneficiaryPDA,
                    authority: updateBeneficiary.publicKey,
                })
                .signers([updateBeneficiary])
                .rpc();

            const beneficiary = await program.account.beneficiary.fetch(updateBeneficiaryPDA);
            expect(beneficiary.familySize).to.equal(8);
        });

        it("Updates damage severity with validation", async () => {
            await program.methods
                .updateBeneficiary(disasterId, createMockUpdateBeneficiaryParams({ damageSeverity: 9 }))
                .accountsPartial({
                    beneficiary: updateBeneficiaryPDA,
                    authority: updateBeneficiary.publicKey,
                })
                .signers([updateBeneficiary])
                .rpc();

            const beneficiary = await program.account.beneficiary.fetch(updateBeneficiaryPDA);
            expect(beneficiary.damageSeverity).to.equal(9);
        });

        it("Rejects damage severity update with invalid value", async () => {
            await expectError(
                program.methods
                    .updateBeneficiary(disasterId, createMockUpdateBeneficiaryParams({ damageSeverity: 11 }))
                    .accountsPartial({
                        beneficiary: updateBeneficiaryPDA,
                        authority: updateBeneficiary.publicKey,
                    })
                    .signers([updateBeneficiary])
                    .rpc(),
                "InvalidDamageSeverity"
            );
        });

        it("Rejects profile update by non-authority", async () => {
            const nonAuthority = Keypair.generate();
            await airdropSOL(provider.connection, nonAuthority.publicKey);

            await expectError(
                program.methods
                    .updateBeneficiary(disasterId, createMockUpdateBeneficiaryParams({ phoneNumber: "+977-1111111111" }))
                    .accountsPartial({
                        beneficiary: updateBeneficiaryPDA,
                        authority: nonAuthority.publicKey,
                    })
                    .signers([nonAuthority])
                    .rpc(),
                "ConstraintRaw"
            );
        });

    });
});
