"use client";

import type { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useProgram } from "./use-program";

export interface PoolRegistration {
  publicKey: PublicKey;
  pool: PublicKey;
  beneficiary: PublicKey;
  allocationWeight: number;
  registeredAt: number;
  isDistributed: boolean;
  bump: number;
}

interface UsePoolRegistrationsReturn {
  registrations: PoolRegistration[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByPool: (poolAddress: PublicKey) => PoolRegistration[];
}

export function usePoolRegistrations(): UsePoolRegistrationsReturn {
  const { program } = useProgram();

  const {
    data: registrations = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["poolRegistrations"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

      const registrationAccounts =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).poolRegistration.all();

      const formattedRegistrations: PoolRegistration[] =
        registrationAccounts.map(
          // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          (account: any) => ({
            publicKey: account.publicKey,
            pool: account.account.pool,
            beneficiary: account.account.beneficiary,
            allocationWeight: account.account.allocationWeight.toNumber(),
            registeredAt: account.account.registeredAt.toNumber(),
            isDistributed: account.account.isDistributed,
            bump: account.account.bump,
          }),
        );

      return formattedRegistrations;
    },
    enabled: !!program,
  });

  const refetchRegistrations = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filterByPool = useCallback(
    (poolAddress: PublicKey) => {
      return registrations.filter((r: PoolRegistration) =>
        r.pool.equals(poolAddress),
      );
    },
    [registrations],
  );

  return {
    registrations,
    loading,
    error: error as Error | null,
    refetch: refetchRegistrations,
    filterByPool,
  };
}
