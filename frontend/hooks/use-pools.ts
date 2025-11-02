"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { DistributionType, FundPool } from "@/types/program";
import { useProgram } from "./use-program";

// Helper function to parse Anchor enum to our DistributionType
// biome-ignore lint/suspicious/noExplicitAny: Anchor enum types are dynamic
function parseDistributionType(anchorEnum: any): DistributionType {
  if (anchorEnum.equal) return "Equal" as DistributionType;
  if (anchorEnum.weightedFamily) return "WeightedFamily" as DistributionType;
  if (anchorEnum.weightedDamage) return "WeightedDamage" as DistributionType;
  if (anchorEnum.milestone) return "Milestone" as DistributionType;
  return "Equal" as DistributionType; // Default fallback
}

interface UsePoolsReturn {
  pools: FundPool[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByDisaster: (disasterId: string) => FundPool[];
  filterByStatus: (isActive: boolean) => FundPool[];
}

export function usePools(): UsePoolsReturn {
  const { program } = useProgram();

  const {
    data: pools = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pools"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

      const poolAccounts =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).fundPool.all();

      const formattedPools: FundPool[] = poolAccounts.map(
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (account: any) => ({
          publicKey: account.publicKey,
          poolId: account.account.poolId,
          disasterId: account.account.disasterId,
          name: account.account.name,
          authority: account.account.authority,
          tokenMint: account.account.tokenMint,
          tokenAccount: account.account.tokenAccount,
          distributionType: parseDistributionType(
            account.account.distributionType,
          ),
          totalDeposited: account.account.totalDeposited.toNumber(),
          totalDistributed: account.account.totalDistributed.toNumber(),
          totalClaimed: account.account.totalClaimed.toNumber(),
          beneficiaryCount: account.account.beneficiaryCount,
          donorCount: account.account.donorCount,
          timeLockDuration: account.account.timeLockDuration
            ? account.account.timeLockDuration.toNumber()
            : null,
          distributionPercentageImmediate:
            account.account.distributionPercentageImmediate,
          distributionPercentageLocked:
            account.account.distributionPercentageLocked,
          eligibilityCriteria: account.account.eligibilityCriteria,
          isActive: account.account.isActive,
          isDistributed: account.account.isDistributed,
          createdAt: account.account.createdAt.toNumber(),
          distributedAt: account.account.distributedAt
            ? account.account.distributedAt.toNumber()
            : null,
          closedAt: account.account.closedAt
            ? account.account.closedAt.toNumber()
            : null,
          minimumFamilySize: account.account.minimumFamilySize || null,
          minimumDamageSeverity: account.account.minimumDamageSeverity || null,
          targetAmount: account.account.targetAmount
            ? account.account.targetAmount.toNumber()
            : null,
          description: account.account.description,
          bump: account.account.bump,
        }),
      );

      return formattedPools;
    },
    enabled: !!program,
  });

  const refetchPools = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filterByDisaster = useCallback(
    (disasterId: string) => {
      return pools.filter((p: FundPool) => p.disasterId === disasterId);
    },
    [pools],
  );

  const filterByStatus = useCallback(
    (isActive: boolean) => {
      return pools.filter((p: FundPool) => p.isActive === isActive);
    },
    [pools],
  );

  return {
    pools,
    loading,
    error: error as Error | null,
    refetch: refetchPools,
    filterByDisaster,
    filterByStatus,
  };
}
