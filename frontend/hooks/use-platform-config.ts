"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [configPDA] = derivePlatformConfigPDA();

      // Try to fetch the config account
      const configAccount =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).platformConfig.fetchNullable(configPDA);

      // If account doesn't exist yet (not initialized), return null
      if (!configAccount) {
        setConfig(null);
        setLoading(false);
        return;
      }

      setConfig({
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
      });
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching platform config:", err);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    refetch: fetchConfig,
  };
}
