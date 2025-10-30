import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import {
    airdropSOL,
    deriveDisasterPDA,
    derivePlatformConfigPDA,
} from "./helpers/test-utils";
import {
    generateDisasterId,
    createMockLocation,
} from "./helpers/mock-data";
import {
    expectError,
    assertDisasterActive,
    assertDisasterClosed,
} from "./helpers/assertions";

describe("Disaster Management", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    let platformConfigPDA: anchor.web3.PublicKey;
    let disasterId: string;
    let disasterPDA: anchor.web3.PublicKey;

    before(async () => {
        [platformConfigPDA] = derivePlatformConfigPDA(program.programId);
        disasterId = generateDisasterId();
        [disasterPDA] = deriveDisasterPDA(disasterId, program.programId);
    });

    describe("Disaster Creation", () => {
        it("Creates disaster with Earthquake type", async () => {
            const location = createMockLocation();

            await program.methods
                .initializeDisaster({
                    eventId: disasterId,
                    name: "Test Earthquake 2025",
                    eventType: { earthquake: {} },
                    location: location,
                    severity: 8,
                    affectedAreas: ["Kathmandu", "Bhaktapur"],
                    description: "Test earthquake disaster event",
                    estimatedAffectedPopulation: 10000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(disasterPDA);

            expect(disaster.eventId).to.equal(disasterId);
            expect(disaster.name).to.equal("Test Earthquake 2025");
            expect(disaster.severity).to.equal(8);
            assertDisasterActive(disaster);
            expect(disaster.location.district).to.equal(location.district);
            expect(disaster.location.ward).to.equal(location.ward);
            expect(disaster.description).to.equal("Test earthquake disaster event");
            expect(disaster.estimatedAffectedPopulation).to.equal(10000);
            expect(disaster.createdAt.toNumber()).to.be.greaterThan(0);
        });

        it("Creates disaster with Flood type", async () => {
            const floodId = generateDisasterId();
            const [floodPDA] = deriveDisasterPDA(floodId, program.programId);

            await program.methods
                .initializeDisaster({
                    eventId: floodId,
                    name: "Test Flood 2025",
                    eventType: { flood: {} },
                    location: createMockLocation({ district: "Lalitpur" }),
                    severity: 6,
                    affectedAreas: ["Lalitpur"],
                    description: "Test flood disaster event",
                    estimatedAffectedPopulation: 5000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(floodPDA);
            expect(disaster.eventId).to.equal(floodId);
            expect(Object.keys(disaster.eventType)[0]).to.equal("flood");
        });

        it("Creates disaster with Landslide type", async () => {
            const landslideId = generateDisasterId();
            const [landslidePDA] = deriveDisasterPDA(landslideId, program.programId);

            await program.methods
                .initializeDisaster({
                    eventId: landslideId,
                    name: "Test Landslide 2025",
                    eventType: { landslide: {} },
                    location: createMockLocation({ district: "Bhaktapur" }),
                    severity: 7,
                    affectedAreas: ["Bhaktapur"],
                    description: "Test landslide disaster event",
                    estimatedAffectedPopulation: 3000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(landslidePDA);
            expect(disaster.eventId).to.equal(landslideId);
            expect(Object.keys(disaster.eventType)[0]).to.equal("landslide");
        });

        it("Creates disaster with Other type", async () => {
            const otherId = generateDisasterId();
            const [otherPDA] = deriveDisasterPDA(otherId, program.programId);

            await program.methods
                .initializeDisaster({
                    eventId: otherId,
                    name: "Test Other Disaster 2025",
                    eventType: { other: {} },
                    location: createMockLocation(),
                    severity: 5,
                    affectedAreas: ["Kathmandu"],
                    description: "Test other disaster event",
                    estimatedAffectedPopulation: 2000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(otherPDA);
            expect(disaster.eventId).to.equal(otherId);
            expect(Object.keys(disaster.eventType)[0]).to.equal("other");
        });

        it("Validates severity range (1-10)", async () => {
            const validId = generateDisasterId();
            const [validPDA] = deriveDisasterPDA(validId, program.programId);

            // Test minimum valid severity (1)
            await program.methods
                .initializeDisaster({
                    eventId: validId,
                    name: "Min Severity Test",
                    eventType: { earthquake: {} },
                    location: createMockLocation(),
                    severity: 1,
                    affectedAreas: ["Test Area"],
                    description: "Minimum severity test",
                    estimatedAffectedPopulation: 100,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(validPDA);
            expect(disaster.severity).to.equal(1);

            // Test maximum valid severity (10)
            const maxId = generateDisasterId();
            const [maxPDA] = deriveDisasterPDA(maxId, program.programId);

            await program.methods
                .initializeDisaster({
                    eventId: maxId,
                    name: "Max Severity Test",
                    eventType: { earthquake: {} },
                    location: createMockLocation(),
                    severity: 10,
                    affectedAreas: ["Test Area"],
                    description: "Maximum severity test",
                    estimatedAffectedPopulation: 100,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const maxDisaster = await program.account.disasterEvent.fetch(maxPDA);
            expect(maxDisaster.severity).to.equal(10);
        });

        it("Rejects disaster with invalid severity (< 1)", async () => {
            const invalidId = generateDisasterId();

            await expectError(
                program.methods
                    .initializeDisaster({
                        eventId: invalidId,
                        name: "Invalid Severity Test",
                        eventType: { earthquake: {} },
                        location: createMockLocation(),
                        severity: 0,
                        affectedAreas: ["Test Area"],
                        description: "Invalid severity test",
                        estimatedAffectedPopulation: 100,
                    })
                    .accountsPartial({
                        authority: admin.publicKey,
                    })
                    .rpc(),
                "InvalidDisasterSeverity"
            );
        });

        it("Rejects disaster with invalid severity (> 10)", async () => {
            const invalidId = generateDisasterId();

            await expectError(
                program.methods
                    .initializeDisaster({
                        eventId: invalidId,
                        name: "Invalid Severity Test",
                        eventType: { earthquake: {} },
                        location: createMockLocation(),
                        severity: 15,
                        affectedAreas: ["Test Area"],
                        description: "Invalid severity test",
                        estimatedAffectedPopulation: 100,
                    })
                    .accountsPartial({
                        authority: admin.publicKey,
                    })
                    .rpc(),
                "InvalidDisasterSeverity"
            );
        });

        it("Stores location data correctly", async () => {
            const locationId = generateDisasterId();
            const [locationPDA] = deriveDisasterPDA(locationId, program.programId);
            const customLocation = createMockLocation({
                district: "Pokhara",
                ward: 15,
                latitude: 28.2096,
                longitude: 83.9856,
            });

            await program.methods
                .initializeDisaster({
                    eventId: locationId,
                    name: "Location Test",
                    eventType: { flood: {} },
                    location: customLocation,
                    severity: 6,
                    affectedAreas: ["Pokhara"],
                    description: "Location test disaster event",
                    estimatedAffectedPopulation: 1000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(locationPDA);
            expect(disaster.location.district).to.equal("Pokhara");
            expect(disaster.location.ward).to.equal(15);
            expect(disaster.location.latitude).to.equal(28.2096);
            expect(disaster.location.longitude).to.equal(83.9856);
        });
    });

    describe("Disaster Updates and Closure", () => {
        let updateDisasterId: string;
        let updateDisasterPDA: anchor.web3.PublicKey;

        before(async () => {
            updateDisasterId = generateDisasterId();
            [updateDisasterPDA] = deriveDisasterPDA(updateDisasterId, program.programId);

            await program.methods
                .initializeDisaster({
                    eventId: updateDisasterId,
                    name: "Update Test Disaster",
                    eventType: { earthquake: {} },
                    location: createMockLocation(),
                    severity: 5,
                    affectedAreas: ["Test Area"],
                    description: "Update test disaster event",
                    estimatedAffectedPopulation: 1000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();
        });

        it("Updates disaster details by admin", async () => {
            // Wait a moment to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 1000));

            await program.methods
                .updateDisaster(updateDisasterId, {
                    name: "Updated Disaster Name",
                    severity: 7,
                    isActive: null,
                    affectedAreas: null,
                    description: null,
                    estimatedAffectedPopulation: null,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(updateDisasterPDA);
            expect(disaster.name).to.equal("Updated Disaster Name");
            expect(disaster.severity).to.equal(7);
            expect(disaster.updatedAt.toNumber()).to.be.at.least(disaster.createdAt.toNumber());
        });

        it("Closes disaster event", async () => {
            await program.methods
                .closeDisaster(updateDisasterId)
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            const disaster = await program.account.disasterEvent.fetch(updateDisasterPDA);
            assertDisasterClosed(disaster);
        });

        it("Rejects updates by non-admin", async () => {
            const nonAdmin = Keypair.generate();
            await airdropSOL(provider.connection, nonAdmin.publicKey);

            const testId = generateDisasterId();
            const [testPDA] = deriveDisasterPDA(testId, program.programId);

            await program.methods
                .initializeDisaster({
                    eventId: testId,
                    name: "Auth Test Disaster",
                    eventType: { earthquake: {} },
                    location: createMockLocation(),
                    severity: 5,
                    affectedAreas: ["Test Area"],
                    description: "Auth test disaster event",
                    estimatedAffectedPopulation: 1000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            await expectError(
                program.methods
                    .updateDisaster(testId, {
                        name: "Unauthorized Update",
                        severity: null,
                        isActive: null,
                        affectedAreas: null,
                        description: null,
                        estimatedAffectedPopulation: null,
                    })
                    .accountsPartial({
                        authority: nonAdmin.publicKey,
                    })
                    .signers([nonAdmin])
                    .rpc(),
                "UnauthorizedModification"
            );
        });

        it("Rejects closure by non-admin", async () => {
            const nonAdmin = Keypair.generate();
            await airdropSOL(provider.connection, nonAdmin.publicKey);

            const testId = generateDisasterId();

            await program.methods
                .initializeDisaster({
                    eventId: testId,
                    name: "Close Auth Test",
                    eventType: { earthquake: {} },
                    location: createMockLocation(),
                    severity: 5,
                    affectedAreas: ["Test Area"],
                    description: "Close auth test disaster event",
                    estimatedAffectedPopulation: 1000,
                })
                .accountsPartial({
                    authority: admin.publicKey,
                })
                .rpc();

            await expectError(
                program.methods
                    .closeDisaster(testId)
                    .accountsPartial({
                        authority: nonAdmin.publicKey,
                    })
                    .signers([nonAdmin])
                    .rpc(),
                "UnauthorizedModification"
            );
        });
    });
});
