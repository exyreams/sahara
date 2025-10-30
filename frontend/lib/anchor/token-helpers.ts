import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";

/**
 * Get the associated token account address for a wallet and mint
 */
export async function getAssociatedTokenAccount(
  wallet: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  return getAssociatedTokenAddress(mint, wallet, false);
}

export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };
