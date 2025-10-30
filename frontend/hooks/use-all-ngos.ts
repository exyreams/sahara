"use client";

import type { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import type { NGO } from "@/types/program";
import { useProgram } from "./use-program";

type NGOAccountData = {
  authority: PublicKey;
  name: string;
  registrationNumber: string;
  email: string;
  phoneNumber: string;
  website: string;
  description: string;
  address: string;
  isVerified: boolean;
  isActive: boolean;
  fieldWorkersCount: number;
  beneficiariesRegistered: number;
  poolsCreated: number;
  totalAidDistributed: { toNumber: () => number };
  verificationDocuments: string;
  operatingDistricts: string[];
  focusAreas: string[];
  registeredAt: { toNumber: () => number };
  verifiedAt: { toNumber: () => number } | null;
  verifiedBy: PublicKey | null;
  lastActivityAt: { toNumber: () => number };
  contactPersonName: string;
  contactPersonRole: string;
  bankAccountInfo: string;
  taxId: string;
  notes: string;
  bump: number;
  isBlacklisted: boolean;
  blacklistReason: string;
  blacklistedAt: { toNumber: () => number } | null;
  blacklistedBy: PublicKey | null;
};

type ProgramAccountNamespace = {
  ngo: {
    all: () => Promise<
      Array<{ publicKey: PublicKey; account: NGOAccountData }>
    >;
  };
};

interface UseAllNGOsReturn {
  ngos: NGO[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch all NGO accounts from the program
 */
export function useAllNGOs(): UseAllNGOsReturn {
  const { program } = useProgram();
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchNGOs = useCallback(async () => {
    if (!program) {
      setLoading(false);
      setIsInitialLoad(false);
      return;
    }

    try {
      // Only show loading state on initial load
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const ngoAccounts = await (
        program.account as unknown as ProgramAccountNamespace
      ).ngo.all();

      const mappedNGOs: NGO[] = ngoAccounts.map((account) => ({
        publicKey: account.publicKey,
        authority: account.account.authority,
        name: account.account.name,
        registrationNumber: account.account.registrationNumber,
        email: account.account.email,
        phoneNumber: account.account.phoneNumber,
        website: account.account.website,
        description: account.account.description,
        address: account.account.address,
        isVerified: account.account.isVerified,
        isActive: account.account.isActive,
        fieldWorkersCount: account.account.fieldWorkersCount,
        beneficiariesRegistered: account.account.beneficiariesRegistered,
        poolsCreated: account.account.poolsCreated,
        totalAidDistributed: account.account.totalAidDistributed.toNumber(),
        verificationDocuments: account.account.verificationDocuments,
        operatingDistricts: account.account.operatingDistricts,
        focusAreas: account.account.focusAreas,
        registeredAt: account.account.registeredAt.toNumber(),
        verifiedAt: account.account.verifiedAt
          ? account.account.verifiedAt.toNumber()
          : null,
        verifiedBy: account.account.verifiedBy || null,
        lastActivityAt: account.account.lastActivityAt.toNumber(),
        contactPersonName: account.account.contactPersonName,
        contactPersonRole: account.account.contactPersonRole,
        bankAccountInfo: account.account.bankAccountInfo,
        taxId: account.account.taxId,
        notes: account.account.notes,
        bump: account.account.bump,
        // Blacklist fields
        isBlacklisted: account.account.isBlacklisted,
        blacklistReason: account.account.blacklistReason || "",
        blacklistedAt: account.account.blacklistedAt
          ? account.account.blacklistedAt.toNumber()
          : null,
        blacklistedBy: account.account.blacklistedBy || null,
      }));

      setNgos(mappedNGOs);
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching NGOs:", err);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [program, isInitialLoad]);

  useEffect(() => {
    fetchNGOs();
  }, [fetchNGOs]);

  return {
    ngos,
    loading,
    error,
    refetch: fetchNGOs,
  };
}
