"use client";

import type { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { FieldWorker } from "@/types/program";
import { useProgram } from "./use-program";

interface UseFieldWorkersReturn {
  fieldWorkers: FieldWorker[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByNGO: (ngoPublicKey: PublicKey) => FieldWorker[];
  filterByStatus: (isActive: boolean) => FieldWorker[];
}

export function useFieldWorkers(): UseFieldWorkersReturn {
  const { program } = useProgram();

  const {
    data: fieldWorkers = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["fieldWorkers"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

      const fieldWorkerAccounts =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).fieldWorker.all();

      const formattedFieldWorkers: FieldWorker[] = fieldWorkerAccounts.map(
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (account: any) => ({
          publicKey: account.publicKey,
          authority: account.account.authority,
          name: account.account.name,
          organization: account.account.organization,
          ngo: account.account.ngo || null,
          phoneNumber: account.account.phoneNumber,
          email: account.account.email,
          isActive: account.account.isActive,
          verificationsCount: account.account.verificationsCount,
          registrationsCount: account.account.registrationsCount,
          flagsRaised: account.account.flagsRaised,
          assignedDistricts: account.account.assignedDistricts,
          credentials: account.account.credentials,
          registeredAt: account.account.registeredAt.toNumber(),
          activatedAt: account.account.activatedAt
            ? account.account.activatedAt.toNumber()
            : null,
          deactivatedAt: account.account.deactivatedAt
            ? account.account.deactivatedAt.toNumber()
            : null,
          lastActivityAt: account.account.lastActivityAt.toNumber(),
          registeredBy: account.account.registeredBy,
          notes: account.account.notes,
          bump: account.account.bump,
        }),
      );

      return formattedFieldWorkers;
    },
    enabled: !!program,
    staleTime: 30 * 1000, // 30 seconds - field worker data changes moderately
    placeholderData: (previousData) => previousData, // Keep previous data during refetch
  });

  const refetchFieldWorkers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filterByNGO = useCallback(
    (ngoPublicKey: PublicKey) => {
      return fieldWorkers.filter((fw: FieldWorker) =>
        fw.ngo?.equals(ngoPublicKey),
      );
    },
    [fieldWorkers],
  );

  const filterByStatus = useCallback(
    (isActive: boolean) => {
      return fieldWorkers.filter((fw: FieldWorker) => fw.isActive === isActive);
    },
    [fieldWorkers],
  );

  return {
    fieldWorkers,
    loading,
    error: error as Error | null,
    refetch: refetchFieldWorkers,
    filterByNGO,
    filterByStatus,
  };
}
