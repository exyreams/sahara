import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import {
    airdropSOL,
    deriveFieldWorkerPDA,
    deriveNGOPDA,
} from "./helpers/test-utils";
import { createMockFieldWorkerParams, createMockNGOParams } from "./helpers/mock-data";
import {
    expectError,
    assertFieldWorkerActive,
    assertFieldWorkerInactive,
} from "./helpers/assertions";

describe("Field Worker Management", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let ngoAuthority: Keypair;
    let ngoPDA: anchor.web3.PublicKey;
    let fieldWorker1: Keypair;
    let fieldWorker1PDA: anchor.web3.PublicKey;

    before(async () => {
        // Setup NGO
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

        // TODO: Verify NGO - instruction not yet implemented
        // For now, we'll manually set the NGO as verified in tests
        // await program.methods
        //     .verifyNgo()
        //     .accountsPartial({
        //         ngo: ngoPDA,
        //         admin: admin.publicKey,
        //     })
        //     .rpc();

        // Setup field worker
        fieldWorker1 = Keypair.generate();
        await airdropSOL(provider.connection, fieldWorker1.publicKey);
        [fieldWorker1PDA] = deriveFieldWorkerPDA(fieldWorker1.publicKey, program.programId);
    });

    describe("Field Worker Registration", () => {
        it("Registers field worker by NGO admin", async () => {
            const params = createMockFieldWorkerParams();

            await program.methods
                .registerFieldWorker(params)
                .accountsPartial({
                    authority: fieldWorker1.publicKey,
                    ngo: ngoPDA,
                    ngoAuthority: ngoAuthority.publicKey,
                    payer: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            const fieldWorker = await program.account.fieldWorker.fetch(fieldWorker1PDA);

            expect(fieldWorker.authority.toString()).to.equal(fieldWorker1.publicKey.toString());
            expect(fieldWorker.name).to.equal(params.name);
            expect(fieldWorker.organization).to.equal(params.organization);
            assertFieldWorkerActive(fieldWorker);
            expect(fieldWorker.verificationsCount).to.equal(0);
            expect(fieldWorker.registeredAt.toNumber()).to.be.greaterThan(0);
        });

        it("Registers another field worker by same NGO", async () => {
            const fieldWorker2 = Keypair.generate();
            await airdropSOL(provider.connection, fieldWorker2.publicKey);
            const [fieldWorker2PDA] = deriveFieldWorkerPDA(fieldWorker2.publicKey, program.programId);

            const params = createMockFieldWorkerParams({ name: "Second Field Worker" });

            await program.methods
                .registerFieldWorker(params)
                .accountsPartial({
                    authority: fieldWorker2.publicKey,
                    ngo: ngoPDA,
                    ngoAuthority: ngoAuthority.publicKey,
                    payer: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            const fieldWorker = await program.account.fieldWorker.fetch(fieldWorker2PDA);
            expect(fieldWorker.name).to.equal("Second Field Worker");
            assertFieldWorkerActive(fieldWorker);
        });
    });

    describe("Field Worker Status Management", () => {
        it("Updates field worker status to inactive", async () => {
            await program.methods
                .updateFieldWorkerStatus({ isActive: false, notes: null })
                .accountsPartial({
                    fieldWorker: fieldWorker1PDA,
                    ngoAuthority: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            const fieldWorker = await program.account.fieldWorker.fetch(fieldWorker1PDA);
            assertFieldWorkerInactive(fieldWorker);
        });

        it("Reactivates field worker", async () => {
            await program.methods
                .updateFieldWorkerStatus({ isActive: true, notes: null })
                .accountsPartial({
                    fieldWorker: fieldWorker1PDA,
                    ngoAuthority: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            const fieldWorker = await program.account.fieldWorker.fetch(fieldWorker1PDA);
            assertFieldWorkerActive(fieldWorker);
        });

        it("Rejects status update by non-authority", async () => {
            const nonAuthority = Keypair.generate();
            await airdropSOL(provider.connection, nonAuthority.publicKey);

            await expectError(
                program.methods
                    .updateFieldWorkerStatus({ isActive: false, notes: null })
                    .accountsPartial({
                        fieldWorker: fieldWorker1PDA,
                        ngoAuthority: nonAuthority.publicKey,
                    })
                    .signers([nonAuthority])
                    .rpc(),
                "ConstraintRaw"
            );
        });

        it("Updates timestamp on status change", async () => {
            const before = await program.account.fieldWorker.fetch(fieldWorker1PDA);
            const beforeTimestamp = before.lastActivityAt.toNumber();

            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));

            await program.methods
                .updateFieldWorkerStatus({ isActive: false, notes: null })
                .accountsPartial({
                    fieldWorker: fieldWorker1PDA,
                    ngoAuthority: ngoAuthority.publicKey,
                })
                .signers([ngoAuthority])
                .rpc();

            const after = await program.account.fieldWorker.fetch(fieldWorker1PDA);
            expect(after.lastActivityAt.toNumber()).to.be.greaterThan(beforeTimestamp);
        });
    });
});
