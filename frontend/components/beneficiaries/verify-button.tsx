"use client";

import { SystemProgram } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import BN from "bn.js";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveActivityLogPDA,
  deriveBeneficiaryPDA,
  deriveDisasterPDA,
  deriveFieldWorkerPDA,
  derivePlatformConfigPDA,
} from "@/lib/anchor/pdas";
import type { Beneficiary } from "@/types/program";

interface VerifyButtonProps {
  beneficiary: Beneficiary;
  onSuccess?: () => void;
}

export function VerifyButton({ beneficiary, onSuccess }: VerifyButtonProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const queryClient = useQueryClient();
  const [hasVerified, setHasVerified] = useState(
    beneficiary.verifierApprovals.some(
      (v) => wallet.publicKey && v.equals(wallet.publicKey),
    ),
  );

  const handleVerify = async () => {
    if (!program || !wallet.publicKey) return;

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          beneficiary.authority,
          beneficiary.disasterId,
        );
        const [disasterPDA] = deriveDisasterPDA(beneficiary.disasterId);
        const [fieldWorkerPDA] = deriveFieldWorkerPDA(wallet.publicKey);
        const [configPDA] = derivePlatformConfigPDA();

        const timestamp = Math.floor(Date.now() / 1000);
        const [activityLogPDA] = deriveActivityLogPDA(
          wallet.publicKey,
          timestamp,
        );

        const tx = await program.methods
          .verifyBeneficiary(
            beneficiary.authority,
            beneficiary.disasterId,
            new BN(timestamp),
          )
          .accounts({
            beneficiary: beneficiaryPDA,
            disaster: disasterPDA,
            fieldWorker: fieldWorkerPDA,
            config: configPDA,
            activityLog: activityLogPDA,
            fieldWorkerAuthority: wallet.publicKey,
            payer: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: "Beneficiary verified successfully",
        onSuccess: () => {
          // Invalidate beneficiaries query to refetch data
          queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });

          setHasVerified(true);
          onSuccess?.();
        },
      },
    );
  };

  if (beneficiary.verificationStatus === "Verified") {
    return (
      <Button disabled variant="outline" className="w-full">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Already Verified
      </Button>
    );
  }

  if (beneficiary.verificationStatus === "Flagged") {
    return (
      <Button disabled variant="destructive" className="w-full">
        Flagged - Requires Admin Review
      </Button>
    );
  }

  if (hasVerified) {
    return (
      <Button disabled variant="outline" className="w-full">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        You've Verified
      </Button>
    );
  }

  return (
    <Button onClick={handleVerify} disabled={isLoading} className="w-full">
      {isLoading ? "Verifying..." : "Verify Beneficiary"}
    </Button>
  );
}
