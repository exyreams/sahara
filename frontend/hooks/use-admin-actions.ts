"use client";

import type { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import type { AdminAction, AdminActionType } from "@/types/admin";
import { useProgram } from "./use-program";

type AdminActionAccountData = {
  actionType: Record<string, unknown>;
  target: PublicKey;
  admin: PublicKey;
  reason: string;
  timestamp: { toNumber: () => number };
  metadata: string;
  bump: number;
};

type ProgramAccountNamespace = {
  adminAction: {
    all: () => Promise<
      Array<{ publicKey: PublicKey; account: AdminActionAccountData }>
    >;
  };
};

interface UseAdminActionsReturn {
  actions: AdminAction[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch all admin action log entries
 */
export function useAdminActions(): UseAdminActionsReturn {
  const { program } = useProgram();
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActions = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const actionAccounts = await (
        program.account as unknown as ProgramAccountNamespace
      ).adminAction.all();

      const mappedActions: AdminAction[] = actionAccounts.map((account) => ({
        publicKey: account.publicKey,
        actionType: Object.keys(
          account.account.actionType,
        )[0] as AdminActionType,
        target: account.account.target,
        admin: account.account.admin,
        reason: account.account.reason || "",
        timestamp: account.account.timestamp.toNumber(),
        metadata: account.account.metadata || "",
        bump: account.account.bump,
      }));

      // Sort by timestamp descending (newest first)
      mappedActions.sort((a, b) => b.timestamp - a.timestamp);

      setActions(mappedActions);
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching admin actions:", err);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return {
    actions,
    loading,
    error,
    refetch: fetchActions,
  };
}
