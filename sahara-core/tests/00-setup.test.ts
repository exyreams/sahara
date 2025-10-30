import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SaharasolCore } from "../target/types/saharasol_core";
import { derivePlatformConfigPDA, createTokenMint } from "./helpers/test-utils";
import { createMockPlatformParams } from "./helpers/mock-data";

describe("Global Setup", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.SaharasolCore as Program<SaharasolCore>;
    const admin = provider.wallet as anchor.Wallet;

    before(async () => {
        const [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

        // Check if already initialized
        try {
            await program.account.platformConfig.fetch(platformConfigPDA);
            console.log("Platform already initialized, skipping...");
            return;
        } catch (e) {
            // Not initialized, proceed
        }

        const usdcMint = await createTokenMint(provider.connection, admin.payer, 6);
        const params = createMockPlatformParams(usdcMint);

        await program.methods
            .initializePlatform(params)
            .accountsPartial({
                admin: admin.publicKey,
            })
            .rpc();

        console.log("✓ Platform initialized for all tests");
    });

    it("Platform should be initialized", async () => {
        const [platformConfigPDA] = derivePlatformConfigPDA(program.programId);
        const config = await program.account.platformConfig.fetch(platformConfigPDA);
        console.log("✓ Platform config verified");
    });
});
