import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SaharasolCore } from "../target/types/saharasol_core";
import {
  derivePlatformConfigPDA,
  deriveDisasterPDA,
  deriveNGOPDA,
  airdropSOL,
  getCurrentTimestamp,
} from "./helpers/test-utils";
import { createMockDisasterParams, createMockNGOParams } from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";

describe("03 - Disaster Management", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
  const admin = provider.wallet as anchor.Wallet;

  let platformConfigPDA: PublicKey;
  let verifiedNgoAuthority: Keypair;
  let verifiedNgoPDA: PublicKey;

  before(async () => {
    [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

    // Create and verify an NGO for testing
    verifiedNgoAuthority = Keypair.generate();
    await airdropSOL(provider.connection, verifiedNgoAuthority.publicKey);
    [verifiedNgoPDA] = deriveNGOPDA(verifiedNgoAuthority.publicKey, program.programId);

    await program.methods
      .registerNgo(createMockNGOParams({ name: "Disaster Test NGO" }))
      .accountsPartial({
        authority: verifiedNgoAuthority.publicKey,
        config: platformConfigPDA,
      })
      .signers([verifiedNgoAuthority])
      .rpc();

    const actionId = getCurrentTimestamp();
    await program.methods
      .verifyNgo(verifiedNgoAuthority.publicKey, { reason: "Verified for testing" }, new anchor.BN(actionId))
      .accountsPartial({
        admin: admin.publicKey,
        ngo: verifiedNgoPDA,
        config: platformConfigPDA,
      })
      .rpc();
  });

  describe("initialize_disaster", () => {
    it("should initialize disaster as admin", async () => {
      const params = createMockDisasterParams({ eventId: "ADMIN-DISASTER-001" });
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(params.eventId, program.programId);

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);

      expect(disaster.eventId).to.equal(params.eventId);
      expect(disaster.name).to.equal(params.name);
      expect(disaster.severity).to.equal(params.severity);
      expect(disaster.isActive).to.be.true;
      expect(disaster.authority.toString()).to.equal(admin.publicKey.toString());
      expect(disaster.affectedAreas).to.deep.equal(params.affectedAreas);
      expect(disaster.description).to.equal(params.description);
      expect(disaster.estimatedAffectedPopulation).to.equal(params.estimatedAffectedPopulation);
      expect(disaster.location.district).to.equal(params.location.district);
      expect(disaster.location.ward).to.equal(params.location.ward);
      expect(disaster.location.latitude).to.equal(params.location.latitude);
      expect(disaster.location.longitude).to.equal(params.location.longitude);
      expect(disaster.totalBeneficiaries).to.equal(0);
      expect(disaster.verifiedBeneficiaries).to.equal(0);
      expect(disaster.totalAidDistributed.toNumber()).to.equal(0);
    });

    it("should initialize disaster as verified NGO", async () => {
      const params = createMockDisasterParams({ eventId: "NGO-DISASTER-001" });
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(params.eventId, program.programId);

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp))
        .accountsPartial({
          authority: verifiedNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .remainingAccounts([
          {
            pubkey: verifiedNgoPDA,
            isWritable: false,
            isSigner: false,
          },
        ])
        .signers([verifiedNgoAuthority])
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.eventId).to.equal(params.eventId);
      expect(disaster.authority.toString()).to.equal(verifiedNgoAuthority.publicKey.toString());
    });

    it("should fail when unverified NGO tries to create disaster", async () => {
      const unverifiedNgoAuthority = Keypair.generate();
      await airdropSOL(provider.connection, unverifiedNgoAuthority.publicKey);
      const [unverifiedNgoPDA] = deriveNGOPDA(unverifiedNgoAuthority.publicKey, program.programId);

      await program.methods
        .registerNgo(createMockNGOParams({ name: "Unverified NGO" }))
        .accountsPartial({
          authority: unverifiedNgoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([unverifiedNgoAuthority])
        .rpc();

      const params = createMockDisasterParams({ eventId: "UNVERIFIED-DISASTER-001" });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: unverifiedNgoAuthority.publicKey,
            config: platformConfigPDA,
          })
          .remainingAccounts([
            {
              pubkey: unverifiedNgoPDA,
              isWritable: false,
              isSigner: false,
            },
          ])
          .signers([unverifiedNgoAuthority])
          .rpc(),
        "UnauthorizedDisasterCreation"
      );
    });

    it("should fail when random user tries to create disaster", async () => {
      const randomUser = Keypair.generate();
      await airdropSOL(provider.connection, randomUser.publicKey);

      const params = createMockDisasterParams({ eventId: "RANDOM-DISASTER-001" });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: randomUser.publicKey,
            config: platformConfigPDA,
          })
          .signers([randomUser])
          .rpc(),
        "UnauthorizedDisasterCreation"
      );
    });

    it("should fail with duplicate event_id", async () => {
      const params = createMockDisasterParams({ eventId: "ADMIN-DISASTER-001" });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc(),
        "already in use"
      );
    });

    it("should fail with invalid severity (0)", async () => {
      const params = createMockDisasterParams({ eventId: "INVALID-SEV-0", severity: 0 });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc(),
        "InvalidDisasterSeverity"
      );
    });

    it("should fail with invalid severity (11)", async () => {
      const params = createMockDisasterParams({ eventId: "INVALID-SEV-11", severity: 11 });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc(),
        "InvalidDisasterSeverity"
      );
    });

    it("should allow severity 1 (minimum)", async () => {
      const params = createMockDisasterParams({ eventId: "SEV-MIN-1", severity: 1 });
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(params.eventId, program.programId);

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.severity).to.equal(1);
    });

    it("should allow severity 10 (maximum)", async () => {
      const params = createMockDisasterParams({ eventId: "SEV-MAX-10", severity: 10 });
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(params.eventId, program.programId);

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.severity).to.equal(10);
    });

    it("should fail with invalid latitude (-91)", async () => {
      const params = createMockDisasterParams({
        eventId: "INVALID-LAT",
        location: { district: "Test", ward: 1, latitude: -91, longitude: 0 },
      });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc(),
        "InvalidLocationCoordinates"
      );
    });

    it("should fail with invalid longitude (181)", async () => {
      const params = createMockDisasterParams({
        eventId: "INVALID-LON",
        location: { district: "Test", ward: 1, latitude: 0, longitude: 181 },
      });
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc(),
        "InvalidLocationCoordinates"
      );
    });

    it("should increment platform total_disasters counter", async () => {
      const configBefore = await program.account.platformConfig.fetch(platformConfigPDA);
      const totalBefore = configBefore.totalDisasters;

      const params = createMockDisasterParams({ eventId: `COUNTER-TEST-${Date.now()}` });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();

      const configAfter = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(configAfter.totalDisasters).to.equal(totalBefore + 1);
    });

    it("should support different disaster types", async () => {
      const types = [
        { earthquake: {} },
        { flood: {} },
        { landslide: {} },
        { other: {} },
      ];

      for (let i = 0; i < types.length; i++) {
        const params = createMockDisasterParams({
          eventId: `TYPE-TEST-${i}`,
          eventType: types[i],
        });
        const timestamp = getCurrentTimestamp();
        const [disasterPDA] = deriveDisasterPDA(params.eventId, program.programId);

        await program.methods
          .initializeDisaster(params, new anchor.BN(timestamp))
          .accountsPartial({
            authority: admin.publicKey,
            config: platformConfigPDA,
          })
          .rpc();

        const disaster = await program.account.disasterEvent.fetch(disasterPDA);
        expect(disaster.eventType).to.deep.equal(types[i]);
      }
    });
  });

  describe("update_disaster", () => {
    let testDisasterEventId: string;

    before(async () => {
      testDisasterEventId = `UPDATE-TEST-${Date.now()}`;
      const params = createMockDisasterParams({ eventId: testDisasterEventId });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();
    });

    it("should update disaster name", async () => {
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(testDisasterEventId, program.programId);

      await program.methods
        .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
          name: "Updated Disaster Name",
          severity: null,
          isActive: null,
          affectedAreas: null,
          description: null,
          estimatedAffectedPopulation: null,
        })
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.name).to.equal("Updated Disaster Name");
    });

    it("should update disaster severity", async () => {
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(testDisasterEventId, program.programId);

      await program.methods
        .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
          name: null,
          severity: 9,
          isActive: null,
          affectedAreas: null,
          description: null,
          estimatedAffectedPopulation: null,
        })
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.severity).to.equal(9);
    });

    it("should update affected areas", async () => {
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(testDisasterEventId, program.programId);
      const newAreas = ["Kathmandu", "Lalitpur", "Bhaktapur"];

      await program.methods
        .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
          name: null,
          severity: null,
          isActive: null,
          affectedAreas: newAreas,
          description: null,
          estimatedAffectedPopulation: null,
        })
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.affectedAreas).to.deep.equal(newAreas);
    });

    it("should update description", async () => {
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(testDisasterEventId, program.programId);

      await program.methods
        .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
          name: null,
          severity: null,
          isActive: null,
          affectedAreas: null,
          description: "Updated description with more details",
          estimatedAffectedPopulation: null,
        })
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.description).to.equal("Updated description with more details");
    });

    it("should update estimated affected population", async () => {
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(testDisasterEventId, program.programId);

      await program.methods
        .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
          name: null,
          severity: null,
          isActive: null,
          affectedAreas: null,
          description: null,
          estimatedAffectedPopulation: 50000,
        })
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.estimatedAffectedPopulation).to.equal(50000);
    });

    it("should update multiple fields at once", async () => {
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(testDisasterEventId, program.programId);

      await program.methods
        .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
          name: "Multi-Update Test",
          severity: 8,
          isActive: null,
          affectedAreas: ["Area1", "Area2"],
          description: "Multi-field update",
          estimatedAffectedPopulation: 75000,
        })
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.name).to.equal("Multi-Update Test");
      expect(disaster.severity).to.equal(8);
      expect(disaster.affectedAreas).to.deep.equal(["Area1", "Area2"]);
      expect(disaster.description).to.equal("Multi-field update");
      expect(disaster.estimatedAffectedPopulation).to.equal(75000);
    });

    it("should fail when non-authority tries to update", async () => {
      const nonAuthority = Keypair.generate();
      await airdropSOL(provider.connection, nonAuthority.publicKey);
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
            name: "Unauthorized Update",
            severity: null,
            isActive: null,
            affectedAreas: null,
            description: null,
            estimatedAffectedPopulation: null,
          })
          .accountsPartial({
            authority: nonAuthority.publicKey,
          })
          .signers([nonAuthority])
          .rpc(),
        "UnauthorizedModification"
      );
    });

    it("should fail with invalid severity in update", async () => {
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .updateDisaster(testDisasterEventId, new anchor.BN(timestamp), {
            name: null,
            severity: 0,
            isActive: null,
            affectedAreas: null,
            description: null,
            estimatedAffectedPopulation: null,
          })
          .accountsPartial({
            authority: admin.publicKey,
          })
          .rpc(),
        "InvalidDisasterSeverity"
      );
    });
  });

  describe("close_disaster", () => {
    let closeTestEventId: string;

    before(async () => {
      closeTestEventId = `CLOSE-TEST-${Date.now()}`;
      const params = createMockDisasterParams({ eventId: closeTestEventId });
      const timestamp = getCurrentTimestamp();

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();
    });

    it("should close disaster", async () => {
      const timestamp = getCurrentTimestamp();
      const [disasterPDA] = deriveDisasterPDA(closeTestEventId, program.programId);

      await program.methods
        .closeDisaster(closeTestEventId, new anchor.BN(timestamp))
        .accountsPartial({
          authority: admin.publicKey,
        })
        .rpc();

      const disaster = await program.account.disasterEvent.fetch(disasterPDA);
      expect(disaster.isActive).to.be.false;
    });

    it("should fail to close already closed disaster", async () => {
      const timestamp = getCurrentTimestamp();

      await expectError(
        program.methods
          .closeDisaster(closeTestEventId, new anchor.BN(timestamp))
          .accountsPartial({
            authority: admin.publicKey,
          })
          .rpc(),
        "DisasterNotActive"
      );
    });

    it("should fail when non-authority tries to close", async () => {
      const newEventId = `CLOSE-AUTH-TEST-${Date.now()}`;
      const params = createMockDisasterParams({ eventId: newEventId });
      const timestamp1 = getCurrentTimestamp();

      await program.methods
        .initializeDisaster(params, new anchor.BN(timestamp1))
        .accountsPartial({
          authority: admin.publicKey,
          config: platformConfigPDA,
        })
        .rpc();

      const nonAuthority = Keypair.generate();
      await airdropSOL(provider.connection, nonAuthority.publicKey);
      const timestamp2 = getCurrentTimestamp();

      await expectError(
        program.methods
          .closeDisaster(newEventId, new anchor.BN(timestamp2))
          .accountsPartial({
            authority: nonAuthority.publicKey,
          })
          .signers([nonAuthority])
          .rpc(),
        "UnauthorizedModification"
      );
    });
  });
});
