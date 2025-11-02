"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
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

  const {
    data: beneficiaries = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: async () => {
      if (!program) {
        return [];
      }

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
        })
      );

      return formattedBeneficiaries;
    },
    enabled: !!program,
  });

  const refetchBeneficiaries = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filterByDisaster = useCallback(
    (disasterId: string) => {
      return beneficiaries.filter(
        (b: Beneficiary) => b.disasterId === disasterId
      );
    },
    [beneficiaries]
  );

  const filterByStatus = useCallback(
    (status: VerificationStatus) => {
      return beneficiaries.filter(
        (b: Beneficiary) => b.verificationStatus === status
      );
    },
    [beneficiaries]
  );

  return {
    beneficiaries,
    loading,
    error: error as Error | null,
    refetch: refetchBeneficiaries,
    filterByDisaster,
    filterByStatus,
  };
}
