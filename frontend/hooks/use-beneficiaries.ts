"use client";

import { useCallback, useEffect, useState } from "react";
import type { Beneficiary, VerificationStatus } from "@/types/program";
import { useProgram } from "./use-program";

interface UseBeneficiariesReturn {
  beneficiaries: Beneficiary[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByDisaster: (disasterId: string) => Beneficiary[];
  filterByStatus: (status: VerificationStatus) => Beneficiary[];
}

export function useBeneficiaries(): UseBeneficiariesReturn {
  const { program } = useProgram();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBeneficiaries = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // @ts-expect-error - Anchor generates account types dynamically
      const beneficiaryAccounts = await program.account.beneficiary.all();

      const formattedBeneficiaries: Beneficiary[] = beneficiaryAccounts.map(
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (account: any) => ({
          publicKey: account.publicKey,
          authority: account.account.authority,
          disasterId: account.account.disasterId,
          name: account.account.name,
          phoneNumber: account.account.phoneNumber,
          location: {
            district: account.account.location.district,
            ward: account.account.location.ward,
            latitude: account.account.location.latitude,
            longitude: account.account.location.longitude,
          },
          familySize: account.account.familySize,
          damageSeverity: account.account.damageSeverity,
          verificationStatus: (() => {
            const status = Object.keys(account.account.verificationStatus)[0];
            return (status.charAt(0).toUpperCase() +
              status.slice(1)) as VerificationStatus;
          })(),
          verifierApprovals: account.account.verifierApprovals,
          ipfsDocumentHash: account.account.ipfsDocumentHash,
          householdId: account.account.householdId || null,
          registeredAt: account.account.registeredAt.toNumber(),
          verifiedAt: account.account.verifiedAt
            ? account.account.verifiedAt.toNumber()
            : null,
          nftMint: account.account.nftMint || null,
          totalReceived: account.account.totalReceived.toNumber(),
          nationalId: account.account.nationalId,
          age: account.account.age,
          gender: account.account.gender,
          occupation: account.account.occupation,
          damageDescription: account.account.damageDescription,
          specialNeeds: account.account.specialNeeds,
          registeredBy: account.account.registeredBy,
          flaggedReason: account.account.flaggedReason || null,
          flaggedBy: account.account.flaggedBy || null,
          flaggedAt: account.account.flaggedAt
            ? account.account.flaggedAt.toNumber()
            : null,
          bump: account.account.bump,
        }),
      );

      setBeneficiaries(formattedBeneficiaries);
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching beneficiaries:", err);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchBeneficiaries();
  }, [fetchBeneficiaries]);

  const filterByDisaster = useCallback(
    (disasterId: string) => {
      return beneficiaries.filter((b) => b.disasterId === disasterId);
    },
    [beneficiaries],
  );

  const filterByStatus = useCallback(
    (status: VerificationStatus) => {
      return beneficiaries.filter((b) => b.verificationStatus === status);
    },
    [beneficiaries],
  );

  return {
    beneficiaries,
    loading,
    error,
    refetch: fetchBeneficiaries,
    filterByDisaster,
    filterByStatus,
  };
}
