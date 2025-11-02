"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

interface UseWalletBalanceReturn {
  balance: number | null;
  isLoading: boolean;
  error: Error | null;
}

export function useWalletBalance(): UseWalletBalanceReturn {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const {
    data: balance = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["walletBalance", publicKey?.toBase58()],
    queryFn: async (): Promise<number | null> => {
      if (!publicKey || !connected) {
        return null;
      }

      try {
        const bal = await connection.getBalance(publicKey);
        return bal / LAMPORTS_PER_SOL;
      } catch (err) {
        console.error("Error fetching balance:", err);
        return null;
      }
    },
    enabled: !!publicKey && connected,
    staleTime: 10 * 1000, // 10 seconds - balance can change frequently
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });

  return {
    balance,
    isLoading,
    error: error as Error | null,
  };
}
