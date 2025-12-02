import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SaharasolCore } from "../target/types/saharasol_core";
import {
  derivePlatformConfigPDA,
  deriveNGOPDA,
  deriveFieldWorkerPDA,
  airdropSOL,
  getCurrentTimestamp,
} from "./helpers/test-utils";
import { createMockNGOParams, createMockFieldWorkerParams } from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";

describe("02 - NGO Management", () => {
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
  });

  describe("register_ngo", () => {
    it("should register a new NGO", async () => {
      const params = createMockNGOParams();

      await program.methods
        .registerNgo(params)
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([ngoAuthority])
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);

      expect(ngo.authority.toString()).to.equal(ngoAuthority.publicKey.toString());
      expect(ngo.name).to.equal(params.name);
      expect(ngo.registrationNumber).to.equal(params.registrationNumber);
      expect(ngo.email).to.equal(params.email);
      expect(ngo.phoneNumber).to.equal(params.phoneNumber);
      expect(ngo.website).to.equal(params.website);
      expect(ngo.description).to.equal(params.description);
      expect(ngo.address).to.equal(params.address);
      expect(ngo.isVerified).to.be.false;
      expect(ngo.isActive).to.be.true;
      expect(ngo.isBlacklisted).to.be.false;
      expect(ngo.fieldWorkersCount).to.equal(0);
      expect(ngo.beneficiariesRegistered).to.equal(0);
      expect(ngo.poolsCreated).to.equal(0);
      expect(ngo.verifiedAt).to.be.null;
      expect(ngo.verifiedBy).to.be.null;
    });

    it("should fail to register NGO twice with same authority", async () => {
      const params = createMockNGOParams({ name: "Duplicate NGO" });

      await expectError(
        program.methods
          .registerNgo(params)
          .accountsPartial({
            authority: ngoAuthority.publicKey,
            config: platformConfigPDA,
          })
          .signers([ngoAuthority])
          .rpc(),
        "already in use"
      );
    });

    it("should register multiple NGOs with different authorities", async () => {
      const newNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, newNgoAuthority.publicKey);

      const params = createMockNGOParams({ name: "Second NGO" });

      await program.methods
        .registerNgo(params)
        .accountsPartial({
          authority: newNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([newNgoAuthority])
        .rpc();

      const [newNgoPDA] = deriveNGOPDA(newNgoAuthority.publicKey, program.programId);
      const ngo = await program.account.ngo.fetch(newNgoPDA);

      expect(ngo.name).to.equal("Second NGO");
    });

    it("should increment platform total_ngos counter", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(config.totalNgos).to.be.at.least(2);
    });
  });

  describe("update_ngo", () => {
    it("should update NGO profile", async () => {
      const timestamp = getCurrentTimestamp();

      await program.methods
        .updateNgo(
          {
            name: "Updated NGO Name",
            email: "updated@ngo.org",
            phoneNumber: null,
            website: null,
            description: null,
            address: null,
            verificationDocuments: null,
            operatingDistricts: null,
            focusAreas: null,
            contactPersonName: null,
            contactPersonRole: null,
            bankAccountInfo: null,
            taxId: null,
          },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .signers([ngoAuthority])
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.name).to.equal("Updated NGO Name");
      expect(ngo.email).to.equal("updated@ngo.org");
    });

    it("should fail when non-authority tries to update", async () => {
      const nonAuthority = Keypair.generate();
      await airdropSOL(provider.connection, nonAuthority.publicKey);
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .updateNgo(
            {
              name: "Hacked Name",
              email: null,
              phoneNumber: null,
              website: null,
              description: null,
              address: null,
              verificationDocuments: null,
              operatingDistricts: null,
              focusAreas: null,
              contactPersonName: null,
              contactPersonRole: null,
              bankAccountInfo: null,
              taxId: null,
            },
            new anchor.BN(timestamp)
          )
          .accountsPartial({
            authority: nonAuthority.publicKey,
            ngo: ngoPDA,
            config: platformConfigPDA,
          })
          .signers([nonAuthority])
          .rpc(),
        "ConstraintSeeds"
      );
    });

    it("should update multiple fields at once", async () => {
      const timestamp = getCurrentTimestamp();

      await program.methods
        .updateNgo(
          {
            name: null,
            email: null,
            phoneNumber: "+977-9999999999",
            website: "https://updated-ngo.org",
            description: "Updated description for the NGO",
            address: null,
            verificationDocuments: null,
            operatingDistricts: ["Kathmandu", "Bhaktapur", "Lalitpur"],
            focusAreas: ["Education", "Health"],
            contactPersonName: "Jane Doe",
            contactPersonRole: "CEO",
            bankAccountInfo: null,
            taxId: null,
          },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .signers([ngoAuthority])
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.phoneNumber).to.equal("+977-9999999999");
      expect(ngo.website).to.equal("https://updated-ngo.org");
      expect(ngo.operatingDistricts).to.deep.equal(["Kathmandu", "Bhaktapur", "Lalitpur"]);
      expect(ngo.focusAreas).to.deep.equal(["Education", "Health"]);
      expect(ngo.contactPersonName).to.equal("Jane Doe");
    });
  });

  describe("admin_verify_ngo", () => {
    it("should verify NGO as admin", async () => {
      const actionId = getCurrentTimestamp();

      await program.methods
        .verifyNgo(ngoAuthority.publicKey, { reason: "Documents verified" }, new anchor.BN(actionId))
        .accountsPartial({
          admin: admin.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.isVerified).to.be.true;
      expect(ngo.verifiedAt).to.not.be.null;
      expect(ngo.verifiedBy.toString()).to.equal(admin.publicKey.toString());
    });

    it("should fail when non-admin tries to verify", async () => {
      const nonAdmin = Keypair.generate();
      await airdropSOL(provider.connection, nonAdmin.publicKey);

      const newNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, newNgoAuthority.publicKey);
      await program.methods
        .registerNgo(createMockNGOParams({ name: "Unverified NGO" }))
        .accountsPartial({
          authority: newNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([newNgoAuthority])
        .rpc();

      const [newNgoPDA] = deriveNGOPDA(newNgoAuthority.publicKey, program.programId);
      const actionId = getCurrentTimestamp();

      await expectError(
        program.methods
          .verifyNgo(newNgoAuthority.publicKey, { reason: "Unauthorized" }, new anchor.BN(actionId))
          .accountsPartial({
            admin: nonAdmin.publicKey,
            ngo: newNgoPDA,
            config: platformConfigPDA,
          })
          .signers([nonAdmin])
          .rpc(),
        "UnauthorizedAdmin"
      );
    });
  });

  describe("admin_revoke_verification", () => {
    it("should revoke NGO verification", async () => {
      const actionId = getCurrentTimestamp();

      await program.methods
        .revokeNgoVerification(ngoAuthority.publicKey, { reason: "Re-verification needed" }, new anchor.BN(actionId))
        .accountsPartial({
          admin: admin.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.isVerified).to.be.false;
      expect(ngo.verifiedAt).to.be.null;
      expect(ngo.verifiedBy).to.be.null;
    });

    it("should re-verify NGO after revocation", async () => {
      const actionId = getCurrentTimestamp();

      await program.methods
        .verifyNgo(ngoAuthority.publicKey, { reason: "Re-verified" }, new anchor.BN(actionId))
        .accountsPartial({
          admin: admin.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.isVerified).to.be.true;
    });
  });

  describe("admin_update_ngo_status", () => {
    it("should deactivate NGO", async () => {
      const actionId = getCurrentTimestamp();

      await program.methods
        .updateNgoStatus(
          ngoAuthority.publicKey,
          { isActive: false, reason: "Temporary suspension" },
          new anchor.BN(actionId)
        )
        .accountsPartial({
          admin: admin.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.isActive).to.be.false;
    });

    it("should reactivate NGO", async () => {
      const actionId = getCurrentTimestamp();

      await program.methods
        .updateNgoStatus(
          ngoAuthority.publicKey,
          { isActive: true, reason: "Suspension lifted" },
          new anchor.BN(actionId)
        )
        .accountsPartial({
          admin: admin.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.isActive).to.be.true;
    });
  });

  describe("admin_blacklist_ngo", () => {
    let blacklistNgoAuthority: Keypair;
    let blacklistNgoPDA: PublicKey;

    before(async () => {
      blacklistNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, blacklistNgoAuthority.publicKey);
      [blacklistNgoPDA] = deriveNGOPDA(blacklistNgoAuthority.publicKey, program.programId);

      await program.methods
        .registerNgo(createMockNGOParams({ name: "NGO To Blacklist" }))
        .accountsPartial({
          authority: blacklistNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([blacklistNgoAuthority])
        .rpc();
    });

    it("should blacklist NGO", async () => {
      const actionId = getCurrentTimestamp();

      await program.methods
        .blacklistNgo(
          blacklistNgoAuthority.publicKey,
          { reason: "Fraudulent activity detected" },
          new anchor.BN(actionId)
        )
        .accountsPartial({
          admin: admin.publicKey,
          ngo: blacklistNgoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const ngo = await program.account.ngo.fetch(blacklistNgoPDA);
      expect(ngo.isBlacklisted).to.be.true;
      expect(ngo.isActive).to.be.false;
      expect(ngo.blacklistReason).to.equal("Fraudulent activity detected");
      expect(ngo.blacklistedAt).to.not.be.null;
      expect(ngo.blacklistedBy.toString()).to.equal(admin.publicKey.toString());
    });

    it("should fail to verify blacklisted NGO", async () => {
      const actionId = getCurrentTimestamp();

      await expectError(
        program.methods
          .verifyNgo(blacklistNgoAuthority.publicKey, { reason: "Try verify" }, new anchor.BN(actionId))
          .accountsPartial({
            admin: admin.publicKey,
            ngo: blacklistNgoPDA,
            config: platformConfigPDA,
          })
          .rpc(),
        "NGOBlacklisted"
      );
    });

    it("should remove blacklist", async () => {
      const actionId = getCurrentTimestamp();

      await program.methods
        .removeBlacklist(
          blacklistNgoAuthority.publicKey,
          { reason: "Investigation cleared" },
          new anchor.BN(actionId)
        )
        .accountsPartial({
          admin: admin.publicKey,
          ngo: blacklistNgoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const ngo = await program.account.ngo.fetch(blacklistNgoPDA);
      expect(ngo.isBlacklisted).to.be.false;
      expect(ngo.blacklistReason).to.equal("");
      expect(ngo.blacklistedAt).to.be.null;
      expect(ngo.blacklistedBy).to.be.null;
    });
  });

  // NOTE: batch_verify_ngos and batch_update_ngo_status are skipped
  // The contract expects pre-initialized AdminAction accounts in remaining_accounts
  // which is a design issue - batch operations should either skip audit logging
  // or use a different pattern for creating admin actions on the fly

  describe("register_field_worker", () => {
    let fieldWorkerAuthority: Keypair;
    let fieldWorkerPDA: PublicKey;

    before(async () => {
      fieldWorkerAuthority = Keypair.generate();
      [fieldWorkerPDA] = deriveFieldWorkerPDA(fieldWorkerAuthority.publicKey, program.programId);
    });

    it("should register a field worker", async () => {
      const params = createMockFieldWorkerParams();

      await program.methods
        .registerFieldWorker(params)
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

      const fieldWorker = await program.account.fieldWorker.fetch(fieldWorkerPDA);

      expect(fieldWorker.authority.toString()).to.equal(fieldWorkerAuthority.publicKey.toString());
      expect(fieldWorker.name).to.equal(params.name);
      expect(fieldWorker.organization).to.equal(params.organization);
      expect(fieldWorker.phoneNumber).to.equal(params.phoneNumber);
      expect(fieldWorker.email).to.equal(params.email);
      expect(fieldWorker.isActive).to.be.true;
      expect(fieldWorker.ngo.toString()).to.equal(ngoPDA.toString());
      expect(fieldWorker.verificationsCount).to.equal(0);
      expect(fieldWorker.registrationsCount).to.equal(0);
    });

    it("should increment NGO field_workers_count", async () => {
      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.fieldWorkersCount).to.be.at.least(1);
    });

    it("should fail to register field worker for inactive NGO", async () => {
      // First deactivate the NGO
      const actionId1 = getCurrentTimestamp();
      await program.methods
        .updateNgoStatus(
          ngoAuthority.publicKey,
          { isActive: false, reason: "Testing inactive" },
          new anchor.BN(actionId1)
        )
        .accountsPartial({
          admin: admin.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .rpc();

      const newFieldWorkerAuthority = Keypair.generate();
      const [newFieldWorkerPDA] = deriveFieldWorkerPDA(newFieldWorkerAuthority.publicKey, program.programId);

      await expectError(
        program.methods
          .registerFieldWorker(createMockFieldWorkerParams({ name: "New Worker" }))
          .accountsPartial({
            fieldWorker: newFieldWorkerPDA,
            ngo: ngoPDA,
            config: platformConfigPDA,
            authority: newFieldWorkerAuthority.publicKey,
            ngoAuthority: ngoAuthority.publicKey,
            payer: ngoAuthority.publicKey,
          })
          .signers([ngoAuthority])
          .rpc(),
        "NGONotActive"
      );

      // Reactivate NGO
      const actionId2 = getCurrentTimestamp();
      await program.methods
        .updateNgoStatus(
          ngoAuthority.publicKey,
          { isActive: true, reason: "Reactivating" },
          new anchor.BN(actionId2)
        )
        .accountsPartial({
          admin: admin.publicKey,
          ngo: ngoPDA,
          config: platformConfigPDA,
        })
        .rpc();
    });

    it("should fail when non-NGO authority tries to register field worker", async () => {
      const nonNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, nonNgoAuthority.publicKey);

      const newFieldWorkerAuthority = Keypair.generate();
      const [newFieldWorkerPDA] = deriveFieldWorkerPDA(newFieldWorkerAuthority.publicKey, program.programId);

      await expectError(
        program.methods
          .registerFieldWorker(createMockFieldWorkerParams({ name: "Unauthorized Worker" }))
          .accountsPartial({
            fieldWorker: newFieldWorkerPDA,
            ngo: ngoPDA,
            config: platformConfigPDA,
            authority: newFieldWorkerAuthority.publicKey,
            ngoAuthority: nonNgoAuthority.publicKey,
            payer: nonNgoAuthority.publicKey,
          })
          .signers([nonNgoAuthority])
          .rpc(),
        "ConstraintSeeds"
      );
    });
  });

  describe("update_field_worker_status", () => {
    let fieldWorkerAuthority: Keypair;
    let fieldWorkerPDA: PublicKey;

    before(async () => {
      fieldWorkerAuthority = Keypair.generate();
      [fieldWorkerPDA] = deriveFieldWorkerPDA(fieldWorkerAuthority.publicKey, program.programId);

      await program.methods
        .registerFieldWorker(createMockFieldWorkerParams({ name: "Status Test Worker" }))
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
    });

    it("should deactivate field worker", async () => {
      await program.methods
        .updateFieldWorkerStatus({ isActive: false, notes: "On leave" })
        .accountsPartial({
          fieldWorker: fieldWorkerPDA,
          ngo: ngoPDA,
          ngoAuthority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const fieldWorker = await program.account.fieldWorker.fetch(fieldWorkerPDA);
      expect(fieldWorker.isActive).to.be.false;
      expect(fieldWorker.notes).to.equal("On leave");
      expect(fieldWorker.deactivatedAt).to.not.be.null;
    });

    it("should reactivate field worker", async () => {
      await program.methods
        .updateFieldWorkerStatus({ isActive: true, notes: "Back from leave" })
        .accountsPartial({
          fieldWorker: fieldWorkerPDA,
          ngo: ngoPDA,
          ngoAuthority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const fieldWorker = await program.account.fieldWorker.fetch(fieldWorkerPDA);
      expect(fieldWorker.isActive).to.be.true;
      expect(fieldWorker.notes).to.equal("Back from leave");
      expect(fieldWorker.activatedAt).to.not.be.null;
    });

    it("should fail when wrong NGO tries to update field worker", async () => {
      const otherNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, otherNgoAuthority.publicKey);

      await program.methods
        .registerNgo(createMockNGOParams({ name: "Other NGO" }))
        .accountsPartial({
          authority: otherNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([otherNgoAuthority])
        .rpc();

      const [otherNgoPDA] = deriveNGOPDA(otherNgoAuthority.publicKey, program.programId);

      await expectError(
        program.methods
          .updateFieldWorkerStatus({ isActive: false, notes: "Unauthorized" })
          .accountsPartial({
            fieldWorker: fieldWorkerPDA,
            ngo: otherNgoPDA,
            ngoAuthority: otherNgoAuthority.publicKey,
          })
          .signers([otherNgoAuthority])
          .rpc(),
        "UnauthorizedNGO"
      );
    });
  });

  describe("update_field_worker", () => {
    let fieldWorkerAuthority: Keypair;
    let fieldWorkerPDA: PublicKey;

    before(async () => {
      fieldWorkerAuthority = Keypair.generate();
      [fieldWorkerPDA] = deriveFieldWorkerPDA(fieldWorkerAuthority.publicKey, program.programId);

      await program.methods
        .registerFieldWorker(createMockFieldWorkerParams({ name: "Update Test Worker" }))
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
    });

    it("should update field worker profile", async () => {
      const timestamp = getCurrentTimestamp();

      await program.methods
        .updateFieldWorker(
          {
            name: "Updated Worker Name",
            email: "updated@worker.org",
            phoneNumber: null,
            organization: null,
            notes: "Profile updated",
          },
          new anchor.BN(timestamp)
        )
        .accountsPartial({
          fieldWorker: fieldWorkerPDA,
          ngo: ngoPDA,
          config: platformConfigPDA,
          ngoAuthority: ngoAuthority.publicKey,
          authority: ngoAuthority.publicKey,
        })
        .signers([ngoAuthority])
        .rpc();

      const fieldWorker = await program.account.fieldWorker.fetch(fieldWorkerPDA);
      expect(fieldWorker.name).to.equal("Updated Worker Name");
      expect(fieldWorker.email).to.equal("updated@worker.org");
      expect(fieldWorker.notes).to.equal("Profile updated");
    });
  });

  describe("platform_counters", () => {
    it("should have incremented total_ngos count", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(config.totalNgos).to.be.at.least(1);
    });

    it("should have incremented total_field_workers count", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(config.totalFieldWorkers).to.be.at.least(1);
    });
  });
});
