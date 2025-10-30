import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
    airdropSOL,
    deriveNGOPDA,
    derivePlatformConfigPDA,
} from "./helpers/test-utils";
import { createMockNGOParams } from "./helpers/mock-data";

describe("Admin NGO Management (Simplified)", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let platformConfigPDA: PublicKey;
    let ngoAuthority: Keypair;
    let ngoPDA: PublicKey;

    before(async () => {
        [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

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
    });

    it("NGO starts unverified after registration", async () => {
        const ngo = await program.account.ngo.fetch(ngoPDA);
        expect(ngo.isVerified).to.be.false;
        expect(ngo.isActive).to.be.true;
        expect(ngo.isBlacklisted).to.be.false;
    });

    it("Admin can verify an NGO (auto-resolved admin action)", async () => {
        await program.methods
            .verifyNgo(ngoAuthority.publicKey, {
                reason: "Verified after document review",
            })
            .accountsPartial({
                ngo: ngoPDA,
                config: platformConfigPDA,
                admin: admin.publicKey,
            })
            .rpc();

        const ngo = await program.account.ngo.fetch(ngoPDA);
        expect(ngo.isVerified).to.be.true;
        expect(ngo.verifiedAt).to.not.be.null;
        expect(ngo.verifiedBy?.toString()).to.equal(admin.publicKey.toString());
    });

    it("Admin can revoke NGO verification", async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .revokeNgoVerification(ngoAuthority.publicKey, {
                reason: "Failed compliance audit",
            })
            .accountsPartial({
                ngo: ngoPDA,
                config: platformConfigPDA,
                admin: admin.publicKey,
            })
            .rpc();

        const ngo = await program.account.ngo.fetch(ngoPDA);
        expect(ngo.isVerified).to.be.false;
        expect(ngo.verifiedAt).to.be.null;
        expect(ngo.verifiedBy).to.be.null;
    });

    it("Admin can deactivate an NGO", async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .updateNgoStatus(ngoAuthority.publicKey, {
                isActive: false,
                reason: "Temporary suspension for review",
            })
            .accountsPartial({
                ngo: ngoPDA,
                config: platformConfigPDA,
                admin: admin.publicKey,
            })
            .rpc();

        const ngo = await program.account.ngo.fetch(ngoPDA);
        expect(ngo.isActive).to.be.false;
    });

    it("Admin can reactivate an NGO", async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .updateNgoStatus(ngoAuthority.publicKey, {
                isActive: true,
                reason: "Review completed successfully",
            })
            .accountsPartial({
                ngo: ngoPDA,
                config: platformConfigPDA,
                admin: admin.publicKey,
            })
            .rpc();

        const ngo = await program.account.ngo.fetch(ngoPDA);
        expect(ngo.isActive).to.be.true;
    });

    it("Admin can blacklist an NGO", async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .blacklistNgo(ngoAuthority.publicKey, {
                reason: "Fraudulent activity detected",
            })
            .accountsPartial({
                ngo: ngoPDA,
                config: platformConfigPDA,
                admin: admin.publicKey,
            })
            .rpc();

        const ngo = await program.account.ngo.fetch(ngoPDA);
        expect(ngo.isBlacklisted).to.be.true;
        expect(ngo.blacklistReason).to.equal("Fraudulent activity detected");
        expect(ngo.blacklistedAt).to.not.be.null;
        expect(ngo.blacklistedBy?.toString()).to.equal(admin.publicKey.toString());
        expect(ngo.isActive).to.be.false;
    });

    it("Admin can remove NGO from blacklist", async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .removeBlacklist(ngoAuthority.publicKey, {
                reason: "Appeal approved after investigation",
            })
            .accountsPartial({
                ngo: ngoPDA,
                config: platformConfigPDA,
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
