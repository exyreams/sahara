"use client";

import { SystemProgram } from "@solana/web3.js";
import { Clock, RotateCcw } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useDistributions } from "@/hooks/use-distributions";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { deriveDistributionPDA, deriveFundPoolPDA } from "@/lib/anchor/pdas";
import { formatAmount, formatDate } from "@/lib/formatters";
import type { Distribution, FundPool } from "@/types/program";

interface ReclaimExpiredButtonProps {
  pool: FundPool;
  onSuccess?: () => void;
}

export function ReclaimExpiredButton({
  pool,
  onSuccess,
}: ReclaimExpiredButtonProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const { distributions } = useDistributions();
  const { beneficiaries } = useBeneficiaries();
  const [open, setOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] =
    useState<Distribution | null>(null);

  // Find expired distributions for this pool that haven't been reclaimed
  const now = Math.floor(Date.now() / 1000);
  const expiredDistributions = distributions.filter(
    (d) =>
      d.pool.equals(pool.publicKey) &&
      !d.isExpired &&
      d.amountClaimed === 0 &&
      d.claimDeadline &&
      d.claimDeadline < now,
  );

  const handleReclaim = async (distribution: Distribution) => {
    if (!program || !wallet.publicKey) return;

    // Find the beneficiary to get their authority
    const beneficiary = beneficiaries.find((b) =>
      b.publicKey.equals(distribution.beneficiary),
    );

    if (!beneficiary) {
      alert("Could not find beneficiary information");
      return;
    }

    await submit(
      async () => {
        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);
        const [distributionPDA] = deriveDistributionPDA(
          beneficiary.authority,
          poolPDA,
        );

        return await program.methods
          .reclaimExpiredDistribution(
            pool.disasterId,
            pool.poolId,
            beneficiary.authority,
          )
          .accounts({
            distribution: distributionPDA,
            pool: poolPDA,
            authority: wallet.publicKey!,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      },
      {
        successMessage: `Reclaimed ${formatAmount(distribution.amountAllocated / 1_000_000)} USDC from expired distribution`,
        onSuccess: () => {
          setOpen(false);
          setSelectedDistribution(null);
          onSuccess?.();
        },
      },
    );
  };

  if (expiredDistributions.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className="border-amber-500 text-amber-600 hover:bg-amber-50"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reclaim Expired ({expiredDistributions.length})
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Reclaim Expired Distributions</AlertDialogTitle>
            <AlertDialogDescription>
              These distributions have passed their claim deadline and were
              never claimed. Reclaiming will return the funds to the pool's
              available balance.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-2 my-4">
            {expiredDistributions.map((dist) => {
              const beneficiary = beneficiaries.find((b) =>
                b.publicKey.equals(dist.beneficiary),
              );
              const amount = dist.amountAllocated / 1_000_000;

              return (
                <div
                  key={dist.publicKey.toString()}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {beneficiary?.name || "Unknown Beneficiary"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>${amount.toFixed(2)} USDC</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expired {formatDate(dist.claimDeadline!)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReclaim(dist)}
                    disabled={isLoading}
                  >
                    {isLoading ? "..." : "Reclaim"}
                  </Button>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
