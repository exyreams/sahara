"use client";

import type { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useProgram } from "./use-program";

export interface Distribution {
  publicKey: PublicKey;
  beneficiary: PublicKey;
  pool: PublicKey;
  amountAllocated: number;
  amountImmediate: number;
  amountLocked: number;
  amountClaimed: number;
  unlockTime: number | null;
  createdAt: number;
  claimedAt: number | null;
  lockedClaimedAt: number | null;
  isFullyClaimed: boolean;
  allocationWeight: number;
  notes: string;
  bump: number;
  // Extended fields (fetched separately)
  poolData?: {
    disasterId: string;
    poolId: string;
    tokenAccount: PublicKey;
    tokenMint: PublicKey;
  };
}

interface UseDistributionsReturn {
  distributions: Distribution[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByPool: (poolAddress: PublicKey) => Distribution[];
  filterByBeneficiary: (beneficiaryAddress: PublicKey) => Distribution[];
}

export function useDistributions(): UseDistributionsReturn {
  const { program } = useProgram();

  const {
    data: distributions = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["distributions"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

      const distributionAccounts =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).distribution.all();

      const formattedDistributions: Distribution[] = distributionAccounts.map(
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (account: any) => ({
          publicKey: account.publicKey,
          beneficiary: account.account.beneficiary,
          pool: account.account.pool,
          amountAllocated: account.account.amountAllocated.toNumber(),
          amountImmediate: account.account.amountImmediate.toNumber(),
          amountLocked: account.account.amountLocked.toNumber(),
          amountClaimed: account.account.amountClaimed.toNumber(),
          unlockTime: account.account.unlockTime
            ? account.account.unlockTime.toNumber()
            : null,
          createdAt: account.account.createdAt.toNumber(),
          claimedAt: account.account.claimedAt
            ? account.account.claimedAt.toNumber()
            : null,
          lockedClaimedAt: account.account.lockedClaimedAt
            ? account.account.lockedClaimedAt.toNumber()
            : null,
          isFullyClaimed: account.account.isFullyClaimed,
          allocationWeight: account.account.allocationWeight,
          notes: account.account.notes,
          bump: account.account.bump,
        })
      );

      return formattedDistributions;
    },
    enabled: !!program,
  });

  const refetchDistributions = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filterByPool = useCallback(
    (poolAddress: PublicKey) => {
      return distributions.filter((d: Distribution) =>
        d.pool.equals(poolAddress)
      );
    },
    [distributions]
  );

  const filterByBeneficiary = useCallback(
    (beneficiaryAddress: PublicKey) => {
      return distributions.filter((d: Distribution) =>
        d.beneficiary.equals(beneficiaryAddress)
      );
    },
    [distributions]
  );

  return {
    distributions,
    loading,
    error: error as Error | null,
    refetch: refetchDistributions,
    filterByPool,
    filterByBeneficiary,
  };
}
