import { type Connection, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useProgram } from "./use-program";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm36ScLyft7cb8Kongf",
);

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
}

async function fetchTokenMetadata(
  connection: Connection,
  mint: PublicKey,
): Promise<TokenMetadata | null> {
  try {
    // 1. Fetch Mint Account for decimals
    const mintInfo = await connection.getParsedAccountInfo(mint);
    if (!mintInfo.value) return null;

    // @ts-expect-error
    const decimals = mintInfo.value.data.parsed.info.decimals;

    // 2. Derive Metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID,
    );

    // 3. Fetch Metadata Account
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo) {
      return {
        name: "Unknown Token",
        symbol: "UNKNOWN",
        uri: "",
        decimals,
      };
    }

    // 4. Manual Deserialization (Simple version to avoid heavy dependencies)
    // Metadata layout:
    // key: u8
    // update_authority: Pubkey
    // mint: Pubkey
    // data: Data
    //   name: String (4 bytes len + chars)
    //   symbol: String (4 bytes len + chars)
    //   uri: String (4 bytes len + chars)

    // Skip key (1) + update_auth (32) + mint (32) = 65 bytes
    let offset = 65;

    const nameLen = accountInfo.data.readUInt32LE(offset);
    offset += 4;
    const name = accountInfo.data
      .slice(offset, offset + nameLen)
      .toString("utf-8")
      .replace(/\0/g, "");
    offset += nameLen;

    const symbolLen = accountInfo.data.readUInt32LE(offset);
    offset += 4;
    const symbol = accountInfo.data
      .slice(offset, offset + symbolLen)
      .toString("utf-8")
      .replace(/\0/g, "");
    offset += symbolLen;

    const uriLen = accountInfo.data.readUInt32LE(offset);
    offset += 4;
    const uri = accountInfo.data
      .slice(offset, offset + uriLen)
      .toString("utf-8")
      .replace(/\0/g, "");

    return {
      name: name.trim(),
      symbol: symbol.trim(),
      uri: uri.trim(),
      decimals,
    };
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    return null;
  }
}

export function useTokenMetadata(mintAddress: string | null | undefined) {
  const { connection } = useProgram();

  return useQuery({
    queryKey: ["token-metadata", mintAddress],
    queryFn: async () => {
      if (!mintAddress || !connection) return null;
      try {
        const mint = new PublicKey(mintAddress);
        return await fetchTokenMetadata(connection, mint);
      } catch {
        return null;
      }
    },
    enabled: !!mintAddress && !!connection,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
