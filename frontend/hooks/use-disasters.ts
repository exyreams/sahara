"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { DisasterEvent, DisasterType } from "@/types/program";
import { useProgram } from "./use-program";

interface UseDisastersReturn {
  disasters: DisasterEvent[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByStatus: (isActive: boolean) => DisasterEvent[];
  filterByType: (type: DisasterType) => DisasterEvent[];
}

export function useDisasters(): UseDisastersReturn {
  const { program } = useProgram();

  const {
    data: disasters = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["disasters"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

      // @ts-expect-error - Anchor generates account types dynamically
      const disasterAccounts = await program.account.disasterEvent.all();

      const formattedDisasters: DisasterEvent[] = disasterAccounts.map(
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (account: any) => {
          // Extract disaster type from Anchor enum object (e.g., {earthquake: {}} -> "Earthquake")
          const eventTypeKey = Object.keys(account.account.eventType)[0];
          const eventType =
            eventTypeKey.charAt(0).toUpperCase() + eventTypeKey.slice(1);

          return {
            publicKey: account.publicKey,
            eventId: account.account.eventId,
            name: account.account.name,
            eventType: eventType as DisasterType,
            declaredAt: account.account.declaredAt.toNumber(),
            location: {
              district: account.account.location.district,
              ward: account.account.location.ward,
              latitude: account.account.location.latitude,
              longitude: account.account.location.longitude,
            },
            severity: account.account.severity,
            isActive: account.account.isActive,
            authority: account.account.authority,
            affectedAreas: account.account.affectedAreas,
            description: account.account.description,
            estimatedAffectedPopulation:
              account.account.estimatedAffectedPopulation,
            totalBeneficiaries: account.account.totalBeneficiaries,
            verifiedBeneficiaries: account.account.verifiedBeneficiaries,
            totalAidDistributed: account.account.totalAidDistributed.toNumber(),
            createdAt: account.account.createdAt.toNumber(),
            updatedAt: account.account.updatedAt.toNumber(),
            bump: account.account.bump,
          };
        },
      );

      return formattedDisasters;
    },
    enabled: !!program,
  });

  const refetchDisasters = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filterByStatus = useCallback(
    (isActive: boolean) => {
      return disasters.filter((d: DisasterEvent) => d.isActive === isActive);
    },
    [disasters],
  );

  const filterByType = useCallback(
    (type: DisasterType) => {
      return disasters.filter((d: DisasterEvent) => d.eventType === type);
    },
    [disasters],
  );

  return {
    disasters,
    loading,
    error: error as Error | null,
    refetch: refetchDisasters,
    filterByStatus,
    filterByType,
  };
}
