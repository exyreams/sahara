"use client";

import type { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
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
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDistributions = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
        }),
      );

      setDistributions(formattedDistributions);
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching distributions:", err);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchDistributions();
  }, [fetchDistributions]);

  const filterByPool = useCallback(
    (poolAddress: PublicKey) => {
      return distributions.filter((d) => d.pool.equals(poolAddress));
    },
    [distributions],
  );

  const filterByBeneficiary = useCallback(
    (beneficiaryAddress: PublicKey) => {
      return distributions.filter((d) =>
        d.beneficiary.equals(beneficiaryAddress),
      );
    },
    [distributions],
  );

  return {
    distributions,
    loading,
    error,
    refetch: fetchDistributions,
    filterByPool,
    filterByBeneficiary,
  };
}
