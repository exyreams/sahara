"use client";

import type { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useProgram } from "./use-program";

export interface ActivityLog {
  publicKey: PublicKey;
  actionType: string;
  actor: PublicKey;
  target: PublicKey;
  amount: number | null;
  timestamp: number;
  metadata: string;
}

export function useActivityLogs() {
  const { program } = useProgram();

  const {
    data: logs = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

      // Get all activity log accounts using Anchor's fetch all
      const activityLogAccounts =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).activityLog.all();

      // Helper to convert camelCase to PascalCase
      const toPascalCase = (str: string): string => {
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      const activityLogs: ActivityLog[] = activityLogAccounts.map(
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (item: any) => ({
          publicKey: item.publicKey,
          actionType: toPascalCase(Object.keys(item.account.actionType)[0]),
          actor: item.account.actor,
          target: item.account.target,
          amount: item.account.amount,
          timestamp: item.account.timestamp.toNumber(),
          metadata: item.account.metadata,
        }),
      );

      // Sort by timestamp (newest first)
      activityLogs.sort((a, b) => b.timestamp - a.timestamp);

      return activityLogs;
    },
    enabled: !!program,
    staleTime: 10 * 1000, // 10 seconds - activity logs change frequently
    placeholderData: (previousData) => previousData, // Keep previous data during refetch
  });

  const refetchActivityLogs = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return { logs, loading, refetch: refetchActivityLogs };
}
