import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SaharasolCore } from "../target/types/saharasol_core";
import {
  derivePlatformConfigPDA,
  deriveNGOPDA,
  airdropSOL,
  getCurrentTimestamp,
} from "./helpers/test-utils";
import { createMockNGOParams } from "./helpers/mock-data";
import { expectError } from "./helpers/assertions";

describe("07 - Manager Role and Permissions", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
  const admin = provider.wallet as anchor.Wallet;

  let platformConfigPDA: PublicKey;
  let manager1: Keypair;
  let manager2: Keypair;
  let ngoAuthority: Keypair;
  let ngoPDA: PublicKey;

  before(async () => {
    [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

    // Create keypairs
    manager1 = Keypair.generate();
    manager2 = Keypair.generate();
    ngoAuthority = Keypair.generate();

    // Airdrop SOL
    await airdropSOL(provider.connection, manager1.publicKey);
    await airdropSOL(provider.connection, manager2.publicKey);
    await airdropSOL(provider.connection, ngoAuthority.publicKey);

    [ngoPDA] = deriveNGOPDA(ngoAuthority.publicKey, program.programId);
  });

  describe("add_manager", () => {
    it("should add first manager successfully", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          admin.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .addManager(
          new anchor.BN(timestamp),
          manager1.publicKey,
          "Adding first manager for platform operations"
        )
        .accountsPartial({
          config: platformConfigPDA,
          adminAction: adminActionPDA,
          admin: admin.publicKey,
        })
        .rpc();


      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(config.managers).to.have.lengthOf(1);
      expect(config.managers[0].toString()).to.equal(manager1.publicKey.toString());

      const adminAction = await program.account.adminAction.fetch(adminActionPDA);
      expect(adminAction.actionType).to.deep.equal({ addManager: {} });
      expect(adminAction.target.toString()).to.equal(manager1.publicKey.toString());
      expect(adminAction.admin.toString()).to.equal(admin.publicKey.toString());
    });

    it("should add second manager successfully", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          admin.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .addManager(
          new anchor.BN(timestamp),
          manager2.publicKey,
          "Adding second manager"
        )
        .accountsPartial({
          config: platformConfigPDA,
          adminAction: adminActionPDA,
          admin: admin.publicKey,
        })
        .rpc();

      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(config.managers).to.have.lengthOf(2);
      expect(config.managers[1].toString()).to.equal(manager2.publicKey.toString());
    });

    it("should fail to add duplicate manager", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          admin.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await expectError(
        program.methods
          .addManager(
            new anchor.BN(timestamp),
            manager1.publicKey,
            "Trying to add duplicate"
          )
          .accountsPartial({
            config: platformConfigPDA,
            adminAction: adminActionPDA,
            admin: admin.publicKey,
          })
          .rpc(),
        "ManagerAlreadyExists"
      );
    });

    it("should fail when non-admin tries to add manager", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          manager1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await expectError(
        program.methods
          .addManager(
            new anchor.BN(timestamp),
            Keypair.generate().publicKey,
            "Unauthorized attempt"
          )
          .accountsPartial({
            config: platformConfigPDA,
            adminAction: adminActionPDA,
            admin: manager1.publicKey,
          })
          .signers([manager1])
          .rpc(),
        "UnauthorizedAdmin"
      );
    });
  });


  describe("remove_manager", () => {
    it("should remove manager successfully", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          admin.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .removeManager(
          new anchor.BN(timestamp),
          manager2.publicKey,
          "Removing manager2"
        )
        .accountsPartial({
          config: platformConfigPDA,
          adminAction: adminActionPDA,
          admin: admin.publicKey,
        })
        .rpc();

      const config = await program.account.platformConfig.fetch(platformConfigPDA);
      expect(config.managers).to.have.lengthOf(1);
      expect(config.managers[0].toString()).to.equal(manager1.publicKey.toString());

      const adminAction = await program.account.adminAction.fetch(adminActionPDA);
      expect(adminAction.actionType).to.deep.equal({ removeManager: {} });
    });

    it("should fail to remove non-existent manager", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          admin.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await expectError(
        program.methods
          .removeManager(
            new anchor.BN(timestamp),
            Keypair.generate().publicKey,
            "Trying to remove non-existent manager"
          )
          .accountsPartial({
            config: platformConfigPDA,
            adminAction: adminActionPDA,
            admin: admin.publicKey,
          })
          .rpc(),
        "ManagerNotFound"
      );
    });
  });

  describe("Manager Permissions", () => {
    before(async () => {
      // Register an NGO for testing manager permissions
      const ngoParams = createMockNGOParams({
        name: "Test NGO for Manager Tests",
        registrationNumber: "NGO-MANAGER-001",
        email: "manager@testngo.org",
      });

      await program.methods
        .registerNgo(ngoParams)
        .accountsPartial({
          authority: ngoAuthority.publicKey,
          config: platformConfigPDA,
        })
        .signers([ngoAuthority])
        .rpc();
    });

    it("manager should be able to verify NGO", async () => {
      const actionId = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          manager1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(actionId).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .verifyNgo(
          ngoAuthority.publicKey,
          { reason: "Verified by manager" },
          new anchor.BN(actionId)
        )
        .accountsPartial({
          ngo: ngoPDA,
          config: platformConfigPDA,
          adminAction: adminActionPDA,
          admin: manager1.publicKey,
        })
        .signers([manager1])
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.isVerified).to.be.true;
      expect(ngo.verifiedBy.toString()).to.equal(manager1.publicKey.toString());
    });


    it("manager should be able to update NGO status", async () => {
      const actionId = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          manager1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(actionId).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .updateNgoStatus(
          ngoAuthority.publicKey,
          { isActive: false, reason: "Temporary suspension" },
          new anchor.BN(actionId)
        )
        .accountsPartial({
          ngo: ngoPDA,
          config: platformConfigPDA,
          adminAction: adminActionPDA,
          admin: manager1.publicKey,
        })
        .signers([manager1])
        .rpc();

      const ngo = await program.account.ngo.fetch(ngoPDA);
      expect(ngo.isActive).to.be.false;

      // Reactivate for other tests
      const actionId2 = getCurrentTimestamp();
      const [adminActionPDA2] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          manager1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(actionId2).toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods
        .updateNgoStatus(
          ngoAuthority.publicKey,
          { isActive: true, reason: "Reactivating" },
          new anchor.BN(actionId2)
        )
        .accountsPartial({
          ngo: ngoPDA,
          config: platformConfigPDA,
          adminAction: adminActionPDA2,
          admin: manager1.publicKey,
        })
        .signers([manager1])
        .rpc();
    });

    it("manager should NOT be able to add other managers", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          manager1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await expectError(
        program.methods
          .addManager(
            new anchor.BN(timestamp),
            Keypair.generate().publicKey,
            "Manager trying to add another manager"
          )
          .accountsPartial({
            config: platformConfigPDA,
            adminAction: adminActionPDA,
            admin: manager1.publicKey,
          })
          .signers([manager1])
          .rpc(),
        "UnauthorizedAdmin"
      );
    });

    it("manager should NOT be able to remove managers", async () => {
      const timestamp = getCurrentTimestamp();
      const [adminActionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("admin-action"),
          manager1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(timestamp).toArray("le", 8)),
        ],
        program.programId
      );

      await expectError(
        program.methods
          .removeManager(
            new anchor.BN(timestamp),
            manager1.publicKey,
            "Manager trying to remove themselves"
          )
          .accountsPartial({
            config: platformConfigPDA,
            adminAction: adminActionPDA,
            admin: manager1.publicKey,
          })
          .signers([manager1])
          .rpc(),
        "UnauthorizedAdmin"
      );
    });
  });

  describe("Platform Config Verification", () => {
    it("should have correct fee structure initialized", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);

      expect(config.unverifiedNgoFeePercentage).to.equal(300); // 3%
      expect(config.verifiedNgoFeePercentage).to.equal(150); // 1.5%
    });

    it("should have correct usage limits initialized", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);

      expect(config.unverifiedNgoPoolLimit).to.equal(5);
      expect(config.verifiedNgoPoolLimit).to.equal(10);
      expect(config.unverifiedNgoBeneficiaryLimit).to.equal(50);
      expect(config.verifiedNgoBeneficiaryLimit).to.equal(100);
    });

    it("should have total fees collected tracking", async () => {
      const config = await program.account.platformConfig.fetch(platformConfigPDA);

      // Fees may have been collected from previous tests
      expect(config.totalFeesCollected.toNumber()).to.be.at.least(0);
    });
  });
});
