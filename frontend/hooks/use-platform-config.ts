"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import type { PlatformConfig } from "@/types/program";
import { useProgram } from "./use-program";

interface UsePlatformConfigReturn {
  config: PlatformConfig | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePlatformConfig(): UsePlatformConfigReturn {
  const { program } = useProgram();

  const {
    data: config = null,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["platformConfig"],
    queryFn: async (): Promise<PlatformConfig | null> => {
      if (!program) {
        return null;
      }

      const [configPDA] = derivePlatformConfigPDA();

      // Try to fetch the config account
      const configAccount =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).platformConfig.fetchNullable(configPDA);

      // If account doesn't exist yet (not initialized), return null
      if (!configAccount) {
        return null;
      }

      return {
        publicKey: configPDA,
        admin: configAccount.admin,
        platformFeePercentage: configAccount.platformFeePercentage,
        platformFeeRecipient: configAccount.platformFeeRecipient,
        verificationThreshold: configAccount.verificationThreshold,
        maxVerifiers: configAccount.maxVerifiers,
        minDonationAmount: configAccount.minDonationAmount.toNumber(),
        maxDonationAmount: configAccount.maxDonationAmount.toNumber(),
        isPaused: configAccount.isPaused,
        totalDisasters: configAccount.totalDisasters,
        totalBeneficiaries: configAccount.totalBeneficiaries,
        totalVerifiedBeneficiaries: configAccount.totalVerifiedBeneficiaries,
        totalFieldWorkers: configAccount.totalFieldWorkers,
        totalNgos: configAccount.totalNgos,
        totalDonations: configAccount.totalDonations.toNumber(),
        totalAidDistributed: configAccount.totalAidDistributed.toNumber(),
        totalPools: configAccount.totalPools,
        usdcMint: configAccount.usdcMint,
        solUsdOracle: configAccount.solUsdOracle || null,
        allowedTokens: configAccount.allowedTokens,
        emergencyContacts: configAccount.emergencyContacts,
        platformName: configAccount.platformName,
        platformVersion: configAccount.platformVersion,
        createdAt: configAccount.createdAt.toNumber(),
        updatedAt: configAccount.updatedAt.toNumber(),
        bump: configAccount.bump,
        // Admin transfer fields
        pendingAdmin: configAccount.pendingAdmin || null,
        adminTransferInitiatedAt: configAccount.adminTransferInitiatedAt
          ? configAccount.adminTransferInitiatedAt.toNumber()
          : null,
        adminTransferTimeout: configAccount.adminTransferTimeout.toNumber(),
        // Verified NGO privilege fields
        verifiedNgoMaxDonation: configAccount.verifiedNgoMaxDonation.toNumber(),
        verifiedNgoPoolLimit: configAccount.verifiedNgoPoolLimit,
      };
    },
    enabled: !!program,
    staleTime: 60 * 1000, // 1 minute - platform config changes infrequently
  });

  const refetchConfig = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    config,
    loading,
    error: error as Error | null,
    refetch: refetchConfig,
  };
}
