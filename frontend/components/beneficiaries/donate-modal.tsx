"use client";

import { X } from "lucide-react";
import { DonationForm } from "@/components/donations/donation-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useProgram } from "@/hooks/use-program";

interface DonateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaryAddress: string;
  beneficiaryName: string;
  disasterId: string;
  isVerified: boolean;
  onSuccess: () => void;
}

export function DonateModal({
  open,
  onOpenChange,
  beneficiaryAddress,
  beneficiaryName,
  disasterId,
  isVerified,
  onSuccess,
}: DonateModalProps) {
  const { wallet } = useProgram();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={false}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:text-theme-primary disabled:pointer-events-none"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        <DialogHeader>
          <DialogTitle>Donate to {beneficiaryName}</DialogTitle>
          <DialogDescription>
            Send direct aid to this verified beneficiary. Your donation will be
            recorded on the blockchain for full transparency.
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
          ) : !isVerified ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                This beneficiary must be verified before receiving donations
              </p>
            </div>
          ) : (
            <DonationForm
              recipientAddress={beneficiaryAddress}
              recipientType="beneficiary"
              disasterId={disasterId}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
