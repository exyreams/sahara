"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { deriveNGOPDA } from "@/lib/anchor/pdas";
import type { NGO } from "@/types/program";
import { useProgram } from "./use-program";

interface UseNGOReturn {
  ngo: NGO | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useNGO(): UseNGOReturn {
  const { program, wallet } = useProgram();

  const {
    data: ngo = null,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ngo", wallet.publicKey?.toBase58()],
    queryFn: async (): Promise<NGO | null> => {
      if (!program || !wallet.publicKey) {
        return null;
      }

      try {
        const [ngoPDA] = deriveNGOPDA(wallet.publicKey);
        const ngoAccount =
          await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          (program.account as any).ngo.fetch(ngoPDA);

        return {
          publicKey: ngoPDA,
          authority: ngoAccount.authority,
          name: ngoAccount.name,
          registrationNumber: ngoAccount.registrationNumber,
          email: ngoAccount.email,
          phoneNumber: ngoAccount.phoneNumber,
          website: ngoAccount.website,
          description: ngoAccount.description,
          address: ngoAccount.address,
          isVerified: ngoAccount.isVerified,
          isActive: ngoAccount.isActive,
          isBlacklisted: ngoAccount.isBlacklisted || false,
          fieldWorkersCount: ngoAccount.fieldWorkersCount,
          beneficiariesRegistered: ngoAccount.beneficiariesRegistered,
          poolsCreated: ngoAccount.poolsCreated,
          totalAidDistributed: ngoAccount.totalAidDistributed.toNumber(),
          verificationDocuments: ngoAccount.verificationDocuments,
          operatingDistricts: ngoAccount.operatingDistricts,
          focusAreas: ngoAccount.focusAreas,
          registeredAt: ngoAccount.registeredAt.toNumber(),
          verifiedAt: ngoAccount.verifiedAt
            ? ngoAccount.verifiedAt.toNumber()
            : null,
          verifiedBy: ngoAccount.verifiedBy || null,
          lastActivityAt: ngoAccount.lastActivityAt.toNumber(),
          blacklistReason: ngoAccount.blacklistReason || null,
          blacklistedAt: ngoAccount.blacklistedAt
            ? ngoAccount.blacklistedAt.toNumber()
            : null,
          blacklistedBy: ngoAccount.blacklistedBy || null,
          contactPersonName: ngoAccount.contactPersonName,
          contactPersonRole: ngoAccount.contactPersonRole,
          bankAccountInfo: ngoAccount.bankAccountInfo,
          taxId: ngoAccount.taxId,
          notes: ngoAccount.notes,
          bump: ngoAccount.bump,
        };
      } catch (_err) {
        // NGO might not exist for this wallet
        return null;
      }
    },
    enabled: !!program && !!wallet.publicKey,
    staleTime: 2 * 60 * 1000, // 2 minutes - NGO data rarely changes
    placeholderData: (previousData) => previousData, // Keep previous data during refetch to prevent flash
  });

  const refetchNGO = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    ngo,
    loading,
    error: error as Error | null,
    refetch: refetchNGO,
  };
}
