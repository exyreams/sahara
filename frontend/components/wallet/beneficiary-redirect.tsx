"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useBeneficiaryProfile } from "@/hooks/use-beneficiary-profile";
import { useProgram } from "@/hooks/use-program";

/**
 * Optional component to auto-redirect beneficiaries to their profile page
 * Add this to your root layout or specific pages where you want auto-redirect
 */
export function BeneficiaryRedirect() {
  const router = useRouter();
  const { wallet } = useProgram();
  const { isBeneficiary, loading } = useBeneficiaryProfile();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect once per session and when wallet is connected
    if (
      wallet.connected &&
      isBeneficiary &&
      !loading &&
      !hasRedirected.current &&
      window.location.pathname !== "/wallet/profile"
    ) {
      hasRedirected.current = true;
      router.push("/wallet/profile");
    }
  }, [wallet.connected, isBeneficiary, loading, router]);

  return null; // This component doesn't render anything
}
