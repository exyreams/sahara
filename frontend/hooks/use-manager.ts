"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { usePlatformConfig } from "./use-platform-config";

interface UseManagerReturn {
  isManager: boolean;
  isAdminOrManager: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to check if the connected wallet is a platform manager or admin
 */
export function useManager(): UseManagerReturn {
  const { publicKey } = useWallet();
  const { config, loading, error } = usePlatformConfig();

  const { isManager, isAdminOrManager } = useMemo(() => {
    if (!publicKey || !config) {
      return { isManager: false, isAdminOrManager: false };
    }

    const isAdmin = publicKey.equals(config.admin);
    const isManagerRole = config.managers.some((manager) =>
      publicKey.equals(manager),
    );

    return {
      isManager: isManagerRole,
      isAdminOrManager: isAdmin || isManagerRole,
    };
  }, [publicKey, config]);

  return {
    isManager,
    isAdminOrManager,
    loading,
    error,
  };
}
