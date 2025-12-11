"use client";

import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useProgram } from "./use-program";

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  image?: string;
}

/**
 * Hook to fetch token metadata from various sources
 */
export function useTokenMetadata(mintAddress: PublicKey | string | null) {
  const { connection } = useProgram();

  // Convert string to PublicKey if needed
  const publicKey = mintAddress
    ? typeof mintAddress === "string"
      ? (() => {
          try {
            return new PublicKey(mintAddress);
          } catch (error) {
            console.error("Invalid PublicKey string:", mintAddress);
            return null;
          }
        })()
      : mintAddress
    : null;

  return useQuery({
    queryKey: ["token-metadata", publicKey?.toBase58()],
    queryFn: async (): Promise<TokenMetadata | null> => {
      if (!publicKey || !connection) return null;

      try {
        // First try to get metadata from the mint account
        const mintInfo = await connection.getParsedAccountInfo(publicKey);

        if (mintInfo.value?.data && "parsed" in mintInfo.value.data) {
          const parsedData = mintInfo.value.data.parsed;
          if (parsedData.type === "mint") {
            const decimals = parsedData.info.decimals;

            // Try to get metadata from Metaplex (if available)
            try {
              const metadataPDA = PublicKey.findProgramAddressSync(
                [
                  Buffer.from("metadata"),
                  new PublicKey(
                    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
                  ).toBuffer(),
                  publicKey.toBuffer(),
                ],
                new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
              )[0];

              const metadataAccount =
                await connection.getAccountInfo(metadataPDA);

              if (metadataAccount) {
                // Parse basic metadata (this is a simplified parser)
                const data = metadataAccount.data;

                // Skip the first 1 byte (key) + 32 bytes (update authority) + 32 bytes (mint)
                let offset = 65;

                // Read name length (4 bytes)
                const nameLength = data.readUInt32LE(offset);
                offset += 4;

                // Read name
                const name = data
                  .subarray(offset, offset + nameLength)
                  .toString("utf8")
                  .replace(/\0/g, "");
                offset += nameLength;

                // Read symbol length (4 bytes)
                const symbolLength = data.readUInt32LE(offset);
                offset += 4;

                // Read symbol
                const symbol = data
                  .subarray(offset, offset + symbolLength)
                  .toString("utf8")
                  .replace(/\0/g, "");
                offset += symbolLength;

                // Read URI length (4 bytes)
                const uriLength = data.readUInt32LE(offset);
                offset += 4;

                // Read URI
                const uri = data
                  .subarray(offset, offset + uriLength)
                  .toString("utf8")
                  .replace(/\0/g, "");

                let logoURI: string | undefined;

                // Try to fetch additional metadata from URI
                if (uri && uri.startsWith("http")) {
                  try {
                    const response = await fetch(uri);
                    const metadata = await response.json();
                    logoURI =
                      metadata.image || metadata.logo || metadata.logoURI;
                  } catch (error) {
                    console.log("Could not fetch metadata from URI:", uri);
                  }
                }

                return {
                  name: name || "Unknown Token",
                  symbol: symbol || "UNK",
                  decimals,
                  logoURI,
                  image: logoURI,
                };
              }
            } catch (metadataError) {
              console.log("No Metaplex metadata found, using fallback");
            }

            // Fallback: Check if it's a known token
            const knownTokens: Record<
              string,
              Omit<TokenMetadata, "decimals">
            > = {
              // Devnet USDC
              "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
                name: "USD Coin",
                symbol: "USDC",
                logoURI:
                  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
              },
              // Mainnet USDC
              EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
                name: "USD Coin",
                symbol: "USDC",
                logoURI:
                  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
              },
              // Add more known tokens as needed
            };

            const knownToken = knownTokens[publicKey.toBase58()];
            if (knownToken) {
              return {
                ...knownToken,
                decimals,
              };
            }

            // Final fallback
            return {
              name: "Unknown Token",
              symbol: "UNK",
              decimals,
            };
          }
        }

        return null;
      } catch (error) {
        console.error("Error fetching token metadata:", error);
        return null;
      }
    },
    enabled: !!publicKey && !!connection,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
