"use client";

import type { Connection, PublicKey } from "@solana/web3.js";
import { useQueries } from "@tanstack/react-query";
import { usePlatformConfig } from "./use-platform-config";
import { useProgram } from "./use-program";

const METADATA_PROGRAM_ID_STR = "metaqbxxUerdq28cj1RbAWkYQm36ScLyft7cb8Kongf";

export interface AllowedToken {
  mint: PublicKey;
  mintAddress: string;
  symbol: string;
  name: string;
  decimals: number;
}

async function fetchTokenMetadataSimple(
  connection: Connection,
  mint: PublicKey,
): Promise<{ name: string; symbol: string; decimals: number } | null> {
  try {
    const { PublicKey: PK } = await import("@solana/web3.js");
    const METADATA_PROGRAM_ID = new PK(METADATA_PROGRAM_ID_STR);

    // Fetch mint info for decimals
    const mintInfo = await connection.getParsedAccountInfo(mint);
    if (!mintInfo.value) return null;
    // @ts-expect-error
    const decimals = mintInfo.value.data.parsed.info.decimals;

    // Derive metadata PDA
    const [metadataPDA] = PK.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID,
    );

    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo) {
      // No metadata - check for known tokens first
      const mintStr = mint.toBase58();

      // Known devnet/mainnet USDC mints
      const knownTokens: Record<string, { name: string; symbol: string }> = {
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
          name: "USD Coin",
          symbol: "USDC",
        }, // Devnet USDC
        EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
          name: "USD Coin",
          symbol: "USDC",
        }, // Mainnet USDC
        So11111111111111111111111111111111111111112: {
          name: "Wrapped SOL",
          symbol: "wSOL",
        },
      };

      if (knownTokens[mintStr]) {
        return { ...knownTokens[mintStr], decimals };
      }

      // Fallback to shortened mint address
      const shortMint = mintStr.slice(0, 4) + "..." + mintStr.slice(-4);
      return { name: `Token (${shortMint})`, symbol: shortMint, decimals };
    }

    // Parse metadata
    let offset = 65;
    const nameLen = accountInfo.data.readUInt32LE(offset);
    offset += 4;
    const name = accountInfo.data
      .slice(offset, offset + nameLen)
      .toString("utf-8")
      .replace(/\0/g, "")
      .trim();
    offset += nameLen;

    const symbolLen = accountInfo.data.readUInt32LE(offset);
    offset += 4;
    const symbol = accountInfo.data
      .slice(offset, offset + symbolLen)
      .toString("utf-8")
      .replace(/\0/g, "")
      .trim();

    return { name, symbol, decimals };
  } catch {
    return null;
  }
}

export function useAllowedTokens() {
  const { config, loading: configLoading } = usePlatformConfig();
  const { connection } = useProgram();

  const allowedTokenMints = config?.allowedTokens || [];

  const tokenQueries = useQueries({
    queries: allowedTokenMints.map((mint) => ({
      queryKey: ["allowedTokenMetadata", mint.toBase58()],
      queryFn: async (): Promise<AllowedToken | null> => {
        if (!connection) return null;
        const metadata = await fetchTokenMetadataSimple(connection, mint);
        if (!metadata) return null;
        return {
          mint,
          mintAddress: mint.toBase58(),
          symbol: metadata.symbol,
          name: metadata.name,
          decimals: metadata.decimals,
        };
      },
      enabled: !!connection,
      staleTime: 1000 * 60 * 60, // 1 hour
    })),
  });

  const tokens: AllowedToken[] = tokenQueries
    .map((q) => q.data)
    .filter((t): t is AllowedToken => t !== null && t !== undefined);

  const isLoading = configLoading || tokenQueries.some((q) => q.isLoading);

  return {
    tokens,
    isLoading,
    usdcMint: config?.usdcMint,
  };
}
