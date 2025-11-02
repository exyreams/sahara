"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { deriveFieldWorkerPDA } from "@/lib/anchor/pdas";
import type { FieldWorker } from "@/types/program";
import { useProgram } from "./use-program";

interface UseFieldWorkerReturn {
  fieldWorker: FieldWorker | null;
  loading: boolean;
  error: Error | null;
  isFieldWorker: boolean;
  refetch: () => Promise<void>;
}

export function useFieldWorker(): UseFieldWorkerReturn {
  const { program, wallet } = useProgram();

  const {
    data: fieldWorker = null,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["fieldWorker", wallet.publicKey?.toBase58()],
    queryFn: async (): Promise<FieldWorker | null> => {
      if (!program || !wallet.publicKey) {
        return null;
      }

      try {
        const [fieldWorkerPDA] = deriveFieldWorkerPDA(wallet.publicKey);
        const fieldWorkerAccount =
          await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          (program.account as any).fieldWorker.fetch(fieldWorkerPDA);

        return {
          publicKey: fieldWorkerPDA,
          authority: fieldWorkerAccount.authority,
          name: fieldWorkerAccount.name,
          organization: fieldWorkerAccount.organization,
          ngo: fieldWorkerAccount.ngo || null,
          phoneNumber: fieldWorkerAccount.phoneNumber,
          email: fieldWorkerAccount.email,
          isActive: fieldWorkerAccount.isActive,
          verificationsCount: fieldWorkerAccount.verificationsCount,
          registrationsCount: fieldWorkerAccount.registrationsCount,
          flagsRaised: fieldWorkerAccount.flagsRaised,
          assignedDistricts: fieldWorkerAccount.assignedDistricts,
          credentials: fieldWorkerAccount.credentials,
          registeredAt: fieldWorkerAccount.registeredAt.toNumber(),
          activatedAt: fieldWorkerAccount.activatedAt
            ? fieldWorkerAccount.activatedAt.toNumber()
            : null,
          deactivatedAt: fieldWorkerAccount.deactivatedAt
            ? fieldWorkerAccount.deactivatedAt.toNumber()
            : null,
          lastActivityAt: fieldWorkerAccount.lastActivityAt.toNumber(),
          registeredBy: fieldWorkerAccount.registeredBy,
          notes: fieldWorkerAccount.notes,
          bump: fieldWorkerAccount.bump,
        };
      } catch (_err) {
        // Field worker might not exist for this wallet
        return null;
      }
    },
    enabled: !!program && !!wallet.publicKey,
    staleTime: 2 * 60 * 1000, // 2 minutes - field worker data rarely changes
  });

  const refetchFieldWorker = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    fieldWorker,
    loading,
    error: error as Error | null,
    isFieldWorker: fieldWorker?.isActive ?? false,
    refetch: refetchFieldWorker,
  };
}
