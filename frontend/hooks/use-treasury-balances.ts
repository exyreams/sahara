"use client";

import type { PublicKey } from "@solana/web3.js";
import { useQueries } from "@tanstack/react-query";
import { useAllowedTokens } from "./use-allowed-tokens";
import { usePlatformConfig } from "./use-platform-config";
import { useProgram } from "./use-program";

export interface TokenBalance {
  mint: PublicKey;
  mintAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  formattedBalance: string;
  logoURI?: string;
  image?: string;
}

async function fetchTokenBalance(
  connection: any,
  mint: PublicKey,
  owner: PublicKey,
  decimals: number,
): Promise<number> {
  try {
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");

    // Get the associated token account
    const tokenAccount = await getAssociatedTokenAddress(mint, owner);

    // Fetch the account info
    const accountInfo = await connection.getAccountInfo(tokenAccount);

    if (!accountInfo) {
      return 0; // Account doesn't exist, balance is 0
    }

    // Parse token account data (amount is at bytes 64-72)
    const data = accountInfo.data;
    const amount = Number(data.readBigUInt64LE(64));

    return amount;
  } catch (error) {
    console.error(`Error fetching balance for ${mint.toBase58()}:`, error);
    return 0;
  }
}

export function useTreasuryBalances() {
  const { tokens, isLoading: tokensLoading } = useAllowedTokens();
  const { config } = usePlatformConfig();
  const { connection } = useProgram();

  const balanceQueries = useQueries({
    queries: tokens.map((token) => ({
      queryKey: [
        "treasuryBalance",
        token.mintAddress,
        config?.platformFeeRecipient?.toBase58(),
      ],
      queryFn: async (): Promise<TokenBalance | null> => {
        if (!connection || !config?.platformFeeRecipient) return null;

        const balance = await fetchTokenBalance(
          connection,
          token.mint,
          config.platformFeeRecipient,
          token.decimals,
        );

        const humanBalance = balance / 10 ** token.decimals;
        const formattedBalance = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        }).format(humanBalance);

        return {
          mint: token.mint,
          mintAddress: token.mintAddress,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance,
          formattedBalance: `${formattedBalance} ${token.symbol}`,
          logoURI: token.logoURI,
          image: token.image,
        };
      },
      enabled:
        !!connection && !!config?.platformFeeRecipient && tokens.length > 0,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refetch every minute
    })),
  });

  const balances: TokenBalance[] = balanceQueries
    .map((q) => q.data)
    .filter((b): b is TokenBalance => b !== null && b !== undefined);

  const isLoading = tokensLoading || balanceQueries.some((q) => q.isLoading);
  const isRefetching = balanceQueries.some((q) => q.isFetching);

  const refetchAll = async () => {
    await Promise.all(balanceQueries.map((q) => q.refetch()));
  };

  // Get total value (for now just count of non-zero balances)
  const nonZeroBalances = balances.filter((b) => b.balance > 0);

  return {
    balances,
    nonZeroBalances,
    isLoading,
    isRefetching,
    refetchAll,
    totalAssets: balances.length,
    assetsWithBalance: nonZeroBalances.length,
  };
}
