"use client";

import type { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
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
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivityLogs = async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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

      setLogs(activityLogs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program]);

  return { logs, loading, refetch: fetchActivityLogs };
}
