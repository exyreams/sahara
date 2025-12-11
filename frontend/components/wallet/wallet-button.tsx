"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ChevronDown, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WalletModal } from "@/components/wallet/wallet-modal";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { getAddressExplorerUrl, truncateAddress } from "@/lib/formatters";

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const { balance, isLoading: isLoadingBalance } = useWalletBalance();

  const handleCopyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58());
      toast.success("Address copied to clipboard");
    }
  };

  const handleViewExplorer = () => {
    if (publicKey) {
      const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet") as
        | "devnet"
        | "testnet"
        | "mainnet-beta";
      window.open(getAddressExplorerUrl(publicKey, network), "_blank");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.info("Wallet disconnected");
  };

  if (!connected || !publicKey) {
    return (
      <>
        <Button
          onClick={() => setModalOpen(true)}
          variant="default"
          size="sm"
          className="text-xs px-3 py-1.5"
        >
          <Wallet className="mr-1.5 h-3.5 w-3.5" />
          Select Wallet
        </Button>
        <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 text-xs px-3 py-1.5"
        >
          <Wallet className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{truncateAddress(publicKey)}</span>
          {balance !== null && (
            <Badge
              variant="secondary"
              className="hidden md:inline-flex text-xs px-1.5 py-0.5"
            >
              {isLoadingBalance ? "..." : `${balance.toFixed(2)} SOL`}
            </Badge>
          )}
          <ChevronDown className="h-2.5 w-2.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2">
        {/* Wallet Header with Balance */}
        <div className="px-2 py-2 space-y-1.5">
          <DropdownMenuLabel className="text-theme-text-highlight font-semibold text-sm">
            My Wallet
          </DropdownMenuLabel>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-theme-background border border-theme-border">
            <div className="flex flex-col">
              <span className="text-xs text-theme-text/60">Balance</span>
              <span className="text-base font-semibold text-theme-primary">
                {isLoadingBalance ? (
                  <span className="text-xs">Loading...</span>
                ) : balance !== null ? (
                  `${balance.toFixed(2)} SOL`
                ) : (
                  <span className="text-xs">--</span>
                )}
              </span>
            </div>
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              {process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}
            </Badge>
          </div>
          <div className="px-2 py-1 rounded bg-theme-primary/5 border border-theme-primary/20">
            <p className="text-xs text-theme-text/80 font-mono break-all">
              {publicKey?.toBase58()}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleCopyAddress}
          className="cursor-pointer text-sm py-1.5"
        >
          <Copy className="mr-2 h-3.5 w-3.5" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleViewExplorer}
          className="cursor-pointer text-sm py-1.5"
        >
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          View in Explorer
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="cursor-pointer text-sm py-1.5 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
