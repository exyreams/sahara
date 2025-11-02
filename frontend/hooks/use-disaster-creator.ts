"use client";

import type { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { deriveNGOPDA, derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import { useProgram } from "./use-program";

interface CreatorInfo {
  type: "admin" | "ngo" | "unknown";
  name?: string;
  address: string;
  loading: boolean;
}

export function useDisasterCreator(authorityKey?: PublicKey): CreatorInfo {
  const { program } = useProgram();

  const { data: creatorInfo, isLoading } = useQuery({
    queryKey: ["disasterCreator", authorityKey?.toBase58()],
    queryFn: async (): Promise<CreatorInfo> => {
      if (!program || !authorityKey) {
        return {
          type: "unknown",
          address: authorityKey?.toBase58() || "",
          loading: false,
        };
      }

      try {
        // Check if it's admin
        const [configPDA] = derivePlatformConfigPDA();

        try {
          // @ts-expect-error - Anchor account types
          const config = await program.account.platformConfig.fetch(configPDA);

          if (config.admin.toBase58() === authorityKey.toBase58()) {
            return {
              type: "admin",
              name: "Platform Admin",
              address: authorityKey.toBase58(),
              loading: false,
            };
          }
        } catch (error) {
          console.error("Error fetching config:", error);
        }

        // Try to fetch NGO
        const [ngoPDA] = deriveNGOPDA(authorityKey);

        try {
          // @ts-expect-error - Anchor account types
          const ngoAccount = await program.account.ngo.fetch(ngoPDA);

          if (ngoAccount) {
            return {
              type: "ngo",
              name: ngoAccount.name || "NGO",
              address: authorityKey.toBase58(),
              loading: false,
            };
          }
        } catch {
          // Not an NGO
        }

        return {
          type: "unknown",
          address: authorityKey.toBase58(),
          loading: false,
        };
      } catch (error) {
        console.error("Error fetching creator info:", error);
        return {
          type: "unknown",
          address: authorityKey.toBase58(),
          loading: false,
        };
      }
    },
    enabled: !!program && !!authorityKey,
    staleTime: 5 * 60 * 1000, // 5 minutes - creator info rarely changes
  });

  return (
    creatorInfo || {
      type: "unknown",
      address: authorityKey?.toBase58() || "",
      loading: isLoading,
    }
  );
}
