"use client";

import { useEffect, useState } from "react";
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
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);

  useEffect(() => {
    if (wallet.publicKey && beneficiaries.length > 0) {
      const found = beneficiaries.find(
        (b) => b.authority.toBase58() === wallet.publicKey?.toBase58(),
      );
      setBeneficiary(found || null);
    } else {
      setBeneficiary(null);
    }
  }, [wallet.publicKey, beneficiaries]);

  return {
    isBeneficiary: !!beneficiary,
    beneficiary,
    loading,
  };
}
