"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDisasters = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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

      setDisasters(formattedDisasters);
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching disasters:", err);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchDisasters();
  }, [fetchDisasters]);

  const filterByStatus = useCallback(
    (isActive: boolean) => {
      return disasters.filter((d) => d.isActive === isActive);
    },
    [disasters],
  );

  const filterByType = useCallback(
    (type: DisasterType) => {
      return disasters.filter((d) => d.eventType === type);
    },
    [disasters],
  );

  return {
    disasters,
    loading,
    error,
    refetch: fetchDisasters,
    filterByStatus,
    filterByType,
  };
}
