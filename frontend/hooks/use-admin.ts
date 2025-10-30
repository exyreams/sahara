"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { usePlatformConfig } from "./use-platform-config";

interface UseAdminReturn {
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to check if the connected wallet is the platform admin
 */
export function useAdmin(): UseAdminReturn {
  const { publicKey } = useWallet();
  const { config, loading, error } = usePlatformConfig();

  const isAdmin = useMemo(() => {
    if (!publicKey || !config) {
      return false;
    }
    return publicKey.equals(config.admin);
  }, [publicKey, config]);

  return {
    isAdmin,
    loading,
    error,
  };
}
