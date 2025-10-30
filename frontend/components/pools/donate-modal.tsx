"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { DonationForm } from "@/components/donations/donation-form";
import { DonationIcon } from "@/components/icons/donation-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useProgram } from "@/hooks/use-program";
import type { FundPool } from "@/types/program";

interface DonateModalProps {
  pool: FundPool;
  onSuccess?: () => void;
}

export function DonateModal({ pool, onSuccess }: DonateModalProps) {
  const [open, setOpen] = useState(false);
  const { wallet } = useProgram();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="focus-visible:ring-theme-focus">
          <DonationIcon className="mr-2 h-4 w-4" />
          {wallet.connected ? "Donate" : "Connect Wallet to Donate"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={false}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:text-theme-primary disabled:pointer-events-none"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        <DialogHeader>
          <DialogTitle>Make a Donation</DialogTitle>
          <DialogDescription>
            Support this relief effort by donating to the fund pool. Your
            donation will be recorded on the blockchain for full transparency.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {!wallet.connected ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                Please connect your wallet to make a donation
              </p>
              <WalletButton />
            </div>
          ) : !pool.isActive ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                This pool is no longer accepting donations
              </p>
            </div>
          ) : (
            <DonationForm
              recipientAddress={pool.publicKey.toString()}
              recipientType="pool"
              disasterId={pool.disasterId}
              poolId={pool.poolId}
              onSuccess={() => {
                setOpen(false);
                onSuccess?.();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
