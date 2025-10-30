"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [ngo, setNgo] = useState<NGO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNGO = useCallback(async () => {
    if (!program || !wallet.publicKey) {
      setNgo(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [ngoPDA] = deriveNGOPDA(wallet.publicKey);
      const ngoAccount =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).ngo.fetch(ngoPDA);

      setNgo({
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
      });
    } catch (_err) {
      // NGO might not exist for this wallet
      setNgo(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey]);

  useEffect(() => {
    fetchNGO();
  }, [fetchNGO]);

  return {
    ngo,
    loading,
    error,
    refetch: fetchNGO,
  };
}
