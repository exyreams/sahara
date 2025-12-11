"use client";

import type { Connection, PublicKey } from "@solana/web3.js";
import { useQueries } from "@tanstack/react-query";
import { usePlatformConfig } from "./use-platform-config";
import { useProgram } from "./use-program";

export interface AllowedToken {
  mint: PublicKey;
  mintAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  image?: string;
}

async function fetchTokenMetadataSimple(
  connection: Connection,
  mint: PublicKey,
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  image?: string;
} | null> {
  try {
    // First get the mint info for decimals
    const mintInfo = await connection.getParsedAccountInfo(mint);
    if (!mintInfo.value || !("parsed" in mintInfo.value.data)) {
      return null;
    }

    const decimals = mintInfo.value.data.parsed.info.decimals;

    // Try to get Metaplex metadata
    const { PublicKey: PK } = await import("@solana/web3.js");
    const METADATA_PROGRAM_ID = new PK(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    );

    const [metadataPDA] = PK.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID,
    );

    const metadataAccount = await connection.getAccountInfo(metadataPDA);

    if (!metadataAccount) {
      // Check if it's USDC (only hardcode this one)
      const mintStr = mint.toBase58();
      if (
        mintStr === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" || // Devnet USDC
        mintStr === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      ) {
        // Mainnet USDC
        return {
          name: "USD Coin",
          symbol: "USDC",
          decimals,
          logoURI:
            "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
          image:
            "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
        };
      }

      // Return basic info with shortened address as fallback for other tokens
      const shortMint =
        mint.toBase58().slice(0, 4) + "..." + mint.toBase58().slice(-4);
      return {
        name: `Token (${shortMint})`,
        symbol: shortMint.toUpperCase(),
        decimals,
        logoURI: undefined,
        image: undefined,
      };
    }

    // Parse the metadata account data
    const data = metadataAccount.data;
    let offset = 1; // Skip account discriminator
    offset += 32; // Skip update authority
    offset += 32; // Skip mint

    // Read name
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const nameBytes = data.subarray(offset, offset + nameLength);
    const name = nameBytes.toString("utf8").replace(/\0/g, "").trim();
    offset += nameLength;

    // Read symbol
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbolBytes = data.subarray(offset, offset + symbolLength);
    const symbol = symbolBytes.toString("utf8").replace(/\0/g, "").trim();
    offset += symbolLength;

    // Read URI
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uriBytes = data.subarray(offset, offset + uriLength);
    const uri = uriBytes.toString("utf8").replace(/\0/g, "").trim();

    let logoURI: string | undefined;

    // Fetch additional metadata from URI if it exists
    if (uri && (uri.startsWith("http://") || uri.startsWith("https://"))) {
      try {
        const response = await fetch(uri);
        if (response.ok) {
          const jsonMetadata = await response.json();
          logoURI =
            jsonMetadata.image || jsonMetadata.logo || jsonMetadata.logoURI;
        }
      } catch (error) {
        // Silently handle URI fetch errors
      }
    }

    return {
      name: name || `Token (${mint.toBase58().slice(0, 8)})`,
      symbol: symbol || mint.toBase58().slice(0, 4).toUpperCase(),
      decimals,
      logoURI,
      image: logoURI,
    };
  } catch (error) {
    // Fallback: try to get just the decimals
    try {
      const mintInfo = await connection.getParsedAccountInfo(mint);
      if (mintInfo.value && "parsed" in mintInfo.value.data) {
        const decimals = mintInfo.value.data.parsed.info.decimals;
        const shortMint =
          mint.toBase58().slice(0, 4) + "..." + mint.toBase58().slice(-4);
        return {
          name: `Token (${shortMint})`,
          symbol: shortMint.toUpperCase(),
          decimals,
          logoURI: undefined,
          image: undefined,
        };
      }
    } catch (fallbackError) {
      // Silently handle fallback errors
    }

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
          logoURI: metadata.logoURI,
          image: metadata.image,
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
