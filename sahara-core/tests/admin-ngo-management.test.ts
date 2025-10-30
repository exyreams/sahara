import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
    airdropSOL,
    deriveNGOPDA,
    derivePlatformConfigPDA,
    deriveAdminActionPDA,
} from "./helpers/test-utils";
import { createMockNGOParams } from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";

describe("Admin NGO Management", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let platformConfigPDA: PublicKey;
    let ngoAuthority: Keypair;
    let ngoPDA: PublicKey;
    let ngoAuthority2: Keypair;
    let ngoPDA2: PublicKey;
    let nonAdmin: Keypair;

    before(async () => {
        [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

        // Create first NGO
        ngoAuthority = Keypair.generate();
        await airdropSOL(provider.connection, ngoAuthority.publicKey);
        [ngoPDA] = deriveNGOPDA(ngoAuthority.publicKey, program.programId);

        const params = createMockNGOParams();
        await program.methods
            .registerNgo(params)
            .accountsPartial({
                authority: ngoAuthority.publicKey,
            })
            .signers([ngoAuthority])
            .rpc();

        // Create second NGO for batch operations
        ngoAuthority2 = Keypair.generate();
        await airdropSOL(provider.connection, ngoAuthority2.publicKey);
        [ngoPDA2] = deriveNGOPDA(ngoAuthority2.publicKey, program.programId);

        const params2 = createMockNGOParams({ name: "Second NGO" });
        await program.methods
            .registerNgo(params2)
            .accountsPartial({
                authority: ngoAuthority2.publicKey,
            })
            .signers([ngoAuthority2])
            .rpc();

        // Create non-admin user
        nonAdmin = Keypair.generate();
        await airdropSOL(provider.connection, nonAdmin.publicKey);
    });

    describe("NGO Verification", () => {
        it("Admin can verify an NGO", async () => {
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .verifyNgo(ngoAuthority.publicKey, {
                    reason: "Verified after document review",
                })
                .accountsPartial({
                    ngo: ngoPDA,
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const ngo = await program.account.ngo.fetch(ngoPDA);
            expect(ngo.isVerified).to.be.true;
            expect(ngo.verifiedAt).to.not.be.null;
            expect(ngo.verifiedBy?.toString()).to.equal(admin.publicKey.toString());
        });

        it("Non-admin cannot verify an NGO", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                nonAdmin.publicKey,
                timestamp,
                program.programId
            );

            await expectError(
                program.methods
                    .verifyNgo(ngoAuthority2.publicKey, {
                        reason: "Attempting verification",
                    })
                    .accountsPartial({
                        ngo: ngoPDA2,
                        config: platformConfigPDA,
                        adminAction: adminActionPDA,
                        admin: nonAdmin.publicKey,
                    })
                    .signers([nonAdmin])
                    .rpc(),
                "UnauthorizedAdmin"
            );
        });

        it("Admin can revoke NGO verification", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .revokeNgoVerification(ngoAuthority.publicKey, {
                    reason: "Failed compliance audit",
                })
                .accountsPartial({
                    ngo: ngoPDA,
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const ngo = await program.account.ngo.fetch(ngoPDA);
            expect(ngo.isVerified).to.be.false;
            expect(ngo.verifiedAt).to.be.null;
            expect(ngo.verifiedBy).to.be.null;
        });
    });

    describe("NGO Status Management", () => {
        it("Admin can deactivate an NGO", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .updateNgoStatus(ngoAuthority.publicKey, {
                    isActive: false,
                    reason: "Temporary suspension for review",
                })
                .accountsPartial({
                    ngo: ngoPDA,
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const ngo = await program.account.ngo.fetch(ngoPDA);
            expect(ngo.isActive).to.be.false;

            // Check admin action log
            const adminAction = await program.account.adminAction.fetch(adminActionPDA);
            expect(adminAction.actionType).to.deep.equal({ deactivateNgo: {} });
        });

        it("Admin can reactivate an NGO", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .updateNgoStatus(ngoAuthority.publicKey, {
                    isActive: true,
                    reason: "Review completed successfully",
                })
                .accountsPartial({
                    ngo: ngoPDA,
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const ngo = await program.account.ngo.fetch(ngoPDA);
            expect(ngo.isActive).to.be.true;

            // Check admin action log
            const adminAction = await program.account.adminAction.fetch(adminActionPDA);
            expect(adminAction.actionType).to.deep.equal({ activateNgo: {} });
        });
    });

    describe("NGO Blacklisting", () => {
        it("Admin can blacklist an NGO", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .blacklistNgo(ngoAuthority.publicKey, {
                    reason: "Fraudulent activity detected",
                })
                .accountsPartial({
                    ngo: ngoPDA,
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const ngo = await program.account.ngo.fetch(ngoPDA);
            expect(ngo.isBlacklisted).to.be.true;
            expect(ngo.blacklistReason).to.equal("Fraudulent activity detected");
            expect(ngo.blacklistedAt).to.not.be.null;
            expect(ngo.blacklistedBy?.toString()).to.equal(admin.publicKey.toString());
            expect(ngo.isActive).to.be.false; // Should be automatically deactivated

            // Check admin action log
            const adminAction = await program.account.adminAction.fetch(adminActionPDA);
            expect(adminAction.actionType).to.deep.equal({ blacklistNgo: {} });
        });

        it("Admin can remove NGO from blacklist", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .removeBlacklist(ngoAuthority.publicKey, {
                    reason: "Appeal approved after investigation",
                })
                .accountsPartial({
                    ngo: ngoPDA,
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const ngo = await program.account.ngo.fetch(ngoPDA);
            expect(ngo.isBlacklisted).to.be.false;
            expect(ngo.blacklistReason).to.equal("");
            expect(ngo.blacklistedAt).to.be.null;
            expect(ngo.blacklistedBy).to.be.null;
        });
    });

    describe("Batch Operations", () => {
        it("Admin can batch verify multiple NGOs", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));

            await program.methods
                .batchVerifyNgos({
                    ngoAuthorities: [ngoAuthority.publicKey, ngoAuthority2.publicKey],
                    reason: "Batch verification after review",
                })
                .accountsPartial({
                    config: platformConfigPDA,
                    admin: admin.publicKey,
                })
                .remainingAccounts([
                    { pubkey: ngoPDA, isWritable: true, isSigner: false },
                    { pubkey: ngoPDA2, isWritable: true, isSigner: false },
                ])
                .rpc();

            const ngo1 = await program.account.ngo.fetch(ngoPDA);
            const ngo2 = await program.account.ngo.fetch(ngoPDA2);

            expect(ngo1.isVerified).to.be.true;
            expect(ngo2.isVerified).to.be.true;
        });

        it("Rejects batch operation with more than 20 NGOs", async () => {
            const manyNGOs = Array(21).fill(ngoAuthority.publicKey);

            await expectError(
                program.methods
                    .batchVerifyNgos({
                        ngoAuthorities: manyNGOs,
                        reason: "Too many NGOs",
                    })
                    .accountsPartial({
                        config: platformConfigPDA,
                        admin: admin.publicKey,
                    })
                    .rpc(),
                "BatchSizeTooLarge"
            );
        });
    });

    describe("Emergency Admin Transfer", () => {
        let newAdmin: Keypair;

        before(async () => {
            newAdmin = Keypair.generate();
            await airdropSOL(provider.connection, newAdmin.publicKey);
        });

        it("Admin can initiate admin transfer", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .initiateAdminTransfer({
                    newAdmin: newAdmin.publicKey,
                    reason: "Transferring admin privileges",
                })
                .accountsPartial({
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            expect(config.pendingAdmin?.toString()).to.equal(newAdmin.publicKey.toString());
            expect(config.adminTransferInitiatedAt).to.not.be.null;
        });

        it("Rejects second transfer initiation while one is pending", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            const anotherAdmin = Keypair.generate();

            await expectError(
                program.methods
                    .initiateAdminTransfer({
                        newAdmin: anotherAdmin.publicKey,
                        reason: "Another transfer",
                    })
                    .accountsPartial({
                        config: platformConfigPDA,
                        adminAction: adminActionPDA,
                        admin: admin.publicKey,
                    })
                    .rpc(),
                "ConstraintSeeds"
            );
        });

        it("Admin can cancel pending transfer", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp = Math.floor(Date.now() / 1000);
            const [adminActionPDA] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp,
                program.programId
            );

            await program.methods
                .cancelAdminTransfer({
                    reason: "Transfer cancelled",
                })
                .accountsPartial({
                    config: platformConfigPDA,
                    adminAction: adminActionPDA,
                    admin: admin.publicKey,
                })
                .rpc();

            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            expect(config.pendingAdmin).to.be.null;
            expect(config.adminTransferInitiatedAt).to.be.null;
        });

        it("Pending admin can accept transfer", async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp1 = Math.floor(Date.now() / 1000);
            const [adminActionPDA1] = deriveAdminActionPDA(
                admin.publicKey,
                timestamp1,
                program.programId
            );

            await program.methods
                .initiateAdminTransfer({
                    newAdmin: newAdmin.publicKey,
                    reason: "Transferring admin privileges",
                })
                .accountsPartial({
                    config: platformConfigPDA,
                    adminAction: adminActionPDA1,
                    admin: admin.publicKey,
                })
                .rpc();

            await new Promise(resolve => setTimeout(resolve, 1000));
            const timestamp2 = Math.floor(Date.now() / 1000);
            const [adminActionPDA2] = deriveAdminActionPDA(
                newAdmin.publicKey,
                timestamp2,
                program.programId
            );

            await program.methods
                .acceptAdminTransfer({
                    reason: "Accepting admin transfer",
                })
                .accountsPartial({
                    config: platformConfigPDA,
                    adminAction: adminActionPDA2,
                    newAdmin: newAdmin.publicKey,
                })
                .signers([newAdmin])
                .rpc();

            const config = await program.account.platformConfig.fetch(platformConfigPDA);
            expect(config.admin.toString()).to.equal(newAdmin.publicKey.toString());
            expect(config.pendingAdmin).to.be.null;
            expect(config.adminTransferInitiatedAt).to.be.null;
        });
    });

    describe("Admin Action Audit Log", () => {
        it("All admin actions are logged", async () => {
            const adminActions = await program.account.adminAction.all();

            if (adminActions.length > 0) {
                adminActions.forEach(action => {
                    expect(action.account.actionType).to.exist;
                    expect(action.account.target).to.exist;
                    expect(action.account.admin).to.exist;
                    expect(action.account.timestamp).to.exist;
                    expect(action.account.reason).to.be.a('string');
                });
            }
        });
    });
});
