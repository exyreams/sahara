"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ChevronDown, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

export function WalletModal({ open, onClose }: WalletModalProps) {
  const { wallets, select, connecting } = useWallet();
  const [showMore, setShowMore] = useState(false);

  // Priority wallets to show upfront (Phantom, Solflare, Backpack)
  const priorityWalletNames = ["Phantom", "Solflare", "Backpack"];

  // Remove duplicates by wallet name (keep first occurrence)
  const uniqueWallets = wallets.reduce(
    (acc, wallet) => {
      if (!acc.find((w) => w.adapter.name === wallet.adapter.name)) {
        acc.push(wallet);
      }
      return acc;
    },
    [] as typeof wallets,
  );

  const installedWallets = uniqueWallets.filter(
    (wallet) => wallet.readyState === "Installed",
  );

  const notInstalledWallets = uniqueWallets.filter(
    (wallet) => wallet.readyState !== "Installed",
  );

  // Get names of installed wallets to avoid duplicates
  const installedWalletNames = installedWallets.map((w) => w.adapter.name);

  // Separate priority wallets from others (excluding already installed ones)
  const priorityNotInstalled = notInstalledWallets.filter(
    (wallet) =>
      priorityWalletNames.includes(wallet.adapter.name) &&
      !installedWalletNames.includes(wallet.adapter.name),
  );

  const otherNotInstalled = notInstalledWallets.filter(
    (wallet) => !priorityWalletNames.includes(wallet.adapter.name),
  );

  const handleWalletClick = (walletName: string) => {
    select(walletName as Parameters<typeof select>[0]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-theme-card-bg border-theme-border max-w-xs sm:max-w-sm"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-theme-text-highlight pr-8">
                Connect a Solana wallet
              </DialogTitle>
              <DialogDescription className="sr-only">
                Select a wallet to connect to the application
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="cursor-pointer text-theme-text hover:text-theme-text-highlight hover:bg-theme-primary/10 -mt-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Wallet List */}
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {/* Installed Wallets */}
          {installedWallets.map((wallet) => (
            <Button
              key={wallet.adapter.name}
              onClick={() => handleWalletClick(wallet.adapter.name)}
              disabled={connecting}
              variant="outline"
              className="w-full h-auto justify-between p-4 hover:bg-theme-primary hover:border-theme-primary hover:text-theme-background group"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="font-medium">{wallet.adapter.name}</span>
              </div>
              <span className="text-sm opacity-60 group-hover:opacity-80">
                Installed
              </span>
            </Button>
          ))}

          {/* Priority Not Installed Wallets (Phantom, Solflare, Backpack) */}
          {priorityNotInstalled.map((wallet) => (
            <Button
              key={wallet.adapter.name}
              onClick={() => handleWalletClick(wallet.adapter.name)}
              disabled={connecting}
              variant="outline"
              className="w-full h-auto justify-between p-4 hover:bg-theme-primary hover:border-theme-primary hover:text-theme-background group"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <span className="font-medium">{wallet.adapter.name}</span>
              </div>
              <span className="text-xs opacity-50 group-hover:opacity-70">
                Not Installed
              </span>
            </Button>
          ))}

          {/* More Options Toggle for Other Wallets */}
          {otherNotInstalled.length > 0 && (
            <>
              <Button
                onClick={() => setShowMore(!showMore)}
                variant="ghost"
                className="w-full gap-2 py-3"
              >
                <span className="text-sm font-medium">More options</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showMore ? "rotate-180" : ""
                  }`}
                />
              </Button>

              {/* Other Not Installed Wallets */}
              {showMore &&
                otherNotInstalled.map((wallet) => (
                  <Button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletClick(wallet.adapter.name)}
                    disabled={connecting}
                    variant="outline"
                    className="w-full h-auto justify-between p-4 hover:bg-theme-primary hover:border-theme-primary hover:text-theme-background group"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        width={32}
                        height={32}
                        className="w-8 h-8"
                      />
                      <span className="font-medium">{wallet.adapter.name}</span>
                    </div>
                    <span className="text-xs opacity-50 group-hover:opacity-70">
                      Not Installed
                    </span>
                  </Button>
                ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-theme-border">
          <p className="text-xs text-theme-text text-center">
            By connecting, you agree to our Terms of Service
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
