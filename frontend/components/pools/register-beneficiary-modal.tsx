"use client";

import { SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { Check, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveBeneficiaryPDA,
  deriveDisasterPDA,
  deriveFundPoolPDA,
  derivePoolRegistrationActivityLogPDA,
  derivePoolRegistrationPDA,
} from "@/lib/anchor/pdas";
import { cn } from "@/lib/utils";
import type { Beneficiary, FundPool } from "@/types/program";

interface RegisterBeneficiaryModalProps {
  pool: FundPool;
  onSuccess?: () => void;
}

export function RegisterBeneficiaryModal({
  pool,
  onSuccess,
}: RegisterBeneficiaryModalProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const { beneficiaries } = useBeneficiaries();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<Beneficiary | null>(null);

  // Filter for verified beneficiaries in this disaster
  const eligibleBeneficiaries = useMemo(() => {
    return beneficiaries.filter(
      (b) =>
        b.disasterId === pool.disasterId && b.verificationStatus === "Verified",
    );
  }, [beneficiaries, pool.disasterId]);

  // Filter by search query
  const filteredBeneficiaries = useMemo(() => {
    if (!searchQuery) return eligibleBeneficiaries;
    const lowerQuery = searchQuery.toLowerCase();
    return eligibleBeneficiaries.filter(
      (b) =>
        b.name.toLowerCase().includes(lowerQuery) ||
        b.publicKey.toBase58().toLowerCase().includes(lowerQuery),
    );
  }, [eligibleBeneficiaries, searchQuery]);

  const handleRegister = async () => {
    if (!program || !wallet.publicKey || !selectedBeneficiary) return;

    const timestamp = Math.floor(Date.now() / 1000);

    await submit(
      async () => {
        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);
        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          selectedBeneficiary.authority,
          pool.disasterId,
        );
        const [poolRegistrationPDA] = derivePoolRegistrationPDA(
          pool.publicKey,
          selectedBeneficiary.authority,
        );
        const [activityLogPDA] = derivePoolRegistrationActivityLogPDA(
          pool.publicKey,
          selectedBeneficiary.authority,
          timestamp,
        );
        const [disasterPDA] = deriveDisasterPDA(pool.disasterId);

        return await program.methods
          .registerBeneficiaryForPool(
            pool.disasterId,
            pool.poolId,
            { beneficiaryAuthority: selectedBeneficiary.authority },
            new BN(timestamp),
          )
          .accounts({
            pool: poolPDA,
            poolRegistration: poolRegistrationPDA,
            beneficiary: beneficiaryPDA,
            disaster: disasterPDA,
            activityLog: activityLogPDA,
            authority: wallet.publicKey!,
            payer: wallet.publicKey!,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      },
      {
        successMessage: `Registered ${selectedBeneficiary.name} to pool`,
        onSuccess: () => {
          setOpen(false);
          setSelectedBeneficiary(null);
          onSuccess?.();
        },
      },
    );
  };

  if (pool.registrationLocked) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <UserPlus className="mr-2 h-4 w-4" />
          Register Beneficiary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Beneficiary to Pool</DialogTitle>
          <DialogDescription>
            Select a verified beneficiary to add to this fund pool. This is
            required before distribution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search beneficiaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            {filteredBeneficiaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No eligible beneficiaries found.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBeneficiaries.map((beneficiary) => {
                  const isSelected = selectedBeneficiary?.publicKey.equals(
                    beneficiary.publicKey,
                  );
                  return (
                    <div
                      key={beneficiary.publicKey.toBase58()}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200",
                        isSelected
                          ? "bg-theme-primary/15 border-theme-primary"
                          : "border-theme-border/50 hover:bg-theme-primary/10 hover:border-theme-primary/50",
                      )}
                      onClick={() => setSelectedBeneficiary(beneficiary)}
                    >
                      <div>
                        <p className="font-medium text-theme-text-highlight">
                          {beneficiary.name}
                        </p>
                        <p className="text-xs text-theme-text/60 truncate w-48">
                          {beneficiary.publicKey.toBase58()}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-theme-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!selectedBeneficiary || isLoading}
            >
              {isLoading ? "Registering..." : "Register Selected"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
