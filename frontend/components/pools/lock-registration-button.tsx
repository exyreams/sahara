"use client";

import { SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { deriveFundPoolPDA, derivePoolActivityLogPDA } from "@/lib/anchor/pdas";
import type { FundPool } from "@/types/program";

interface LockRegistrationButtonProps {
  pool: FundPool;
  onSuccess?: () => void;
}

export function LockRegistrationButton({
  pool,
  onSuccess,
}: LockRegistrationButtonProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const [open, setOpen] = useState(false);

  if (pool.registrationLocked) {
    return null;
  }

  const handleLock = async () => {
    if (!program || !wallet.publicKey) return;

    const timestamp = Math.floor(Date.now() / 1000);

    await submit(
      async () => {
        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);
        const [activityLogPDA] = derivePoolActivityLogPDA(poolPDA, timestamp);

        return await program.methods
          .lockPoolRegistration(pool.disasterId, pool.poolId, new BN(timestamp))
          .accounts({
            pool: poolPDA,
            activityLog: activityLogPDA,
            authority: wallet.publicKey!,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      },
      {
        successMessage: "Registration locked successfully",
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg">
          <Lock className="mr-2 h-4 w-4" />
          Lock Registration
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lock Pool Registration?</DialogTitle>
          <DialogDescription className="space-y-4">
            <span>
              This will finalize the beneficiary list and calculate allocation
              weights.
            </span>
            <span className="block font-bold text-red-500">
              Warning: You cannot add more beneficiaries after locking.
            </span>
            <span className="block">
              You must lock registration before you can distribute funds.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLock}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? "Locking..." : "Confirm Lock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
