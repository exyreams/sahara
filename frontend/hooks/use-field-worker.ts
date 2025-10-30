"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [fieldWorker, setFieldWorker] = useState<FieldWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFieldWorker = useCallback(async () => {
    if (!program || !wallet.publicKey) {
      setFieldWorker(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [fieldWorkerPDA] = deriveFieldWorkerPDA(wallet.publicKey);
      const fieldWorkerAccount =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).fieldWorker.fetch(fieldWorkerPDA);

      setFieldWorker({
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
      });
    } catch (_err) {
      // Field worker might not exist for this wallet
      setFieldWorker(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey]);

  useEffect(() => {
    fetchFieldWorker();
  }, [fetchFieldWorker]);

  return {
    fieldWorker,
    loading,
    error,
    isFieldWorker: fieldWorker?.isActive ?? false,
    refetch: fetchFieldWorker,
  };
}
