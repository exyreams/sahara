"use client";

import type { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
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

  const {
    data: actions = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["adminActions"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

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

      return mappedActions;
    },
    enabled: !!program,
    staleTime: 30 * 1000, // 30 seconds
  });

  const refetchActions = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    actions,
    loading,
    error: error as Error | null,
    refetch: refetchActions,
  };
}
