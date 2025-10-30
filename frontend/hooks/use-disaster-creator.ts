"use client";

import type { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
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
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo>({
    type: "unknown",
    address: authorityKey?.toBase58() || "",
    loading: true,
  });

  useEffect(() => {
    async function fetchCreator() {
      if (!program || !authorityKey) {
        setCreatorInfo({
          type: "unknown",
          address: authorityKey?.toBase58() || "",
          loading: false,
        });
        return;
      }

      try {
        // Check if it's admin
        const [configPDA] = derivePlatformConfigPDA();

        try {
          // @ts-expect-error - Anchor account types
          const config = await program.account.platformConfig.fetch(configPDA);

          if (config.admin.toBase58() === authorityKey.toBase58()) {
            setCreatorInfo({
              type: "admin",
              name: "Platform Admin",
              address: authorityKey.toBase58(),
              loading: false,
            });
            return;
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
            setCreatorInfo({
              type: "ngo",
              name: ngoAccount.name || "NGO",
              address: authorityKey.toBase58(),
              loading: false,
            });
            return;
          }
        } catch {
          // Not an NGO
        }

        setCreatorInfo({
          type: "unknown",
          address: authorityKey.toBase58(),
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching creator info:", error);
        setCreatorInfo({
          type: "unknown",
          address: authorityKey.toBase58(),
          loading: false,
        });
      }
    }

    fetchCreator();
  }, [program, authorityKey]);

  return creatorInfo;
}
