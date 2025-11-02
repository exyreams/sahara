"use client";

import { useMemo } from "react";
import type { Beneficiary } from "@/types/program";
import { useBeneficiaries } from "./use-beneficiaries";
import { useProgram } from "./use-program";

interface UseBeneficiaryProfileReturn {
  isBeneficiary: boolean;
  beneficiary: Beneficiary | null;
  loading: boolean;
}

export function useBeneficiaryProfile(): UseBeneficiaryProfileReturn {
  const { wallet } = useProgram();
  const { beneficiaries, loading } = useBeneficiaries();

  const beneficiary = useMemo(() => {
    if (!wallet.publicKey || beneficiaries.length === 0) {
      return null;
    }
    return (
      beneficiaries.find(
        (b) => b.authority.toBase58() === wallet.publicKey?.toBase58(),
      ) || null
    );
  }, [wallet.publicKey, beneficiaries]);

  return {
    isBeneficiary: !!beneficiary,
    beneficiary,
    loading,
  };
}
