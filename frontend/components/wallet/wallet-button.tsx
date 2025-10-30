"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ChevronDown, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
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
import { getAddressExplorerUrl, truncateAddress } from "@/lib/formatters";

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { connection } = useConnection();
  const [modalOpen, setModalOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch wallet balance
  useEffect(() => {
    if (publicKey && connected) {
      setIsLoadingBalance(true);
      connection
        .getBalance(publicKey)
        .then((bal) => {
          setBalance(bal / LAMPORTS_PER_SOL);
        })
        .catch((err) => {
          console.error("Error fetching balance:", err);
          setBalance(null);
        })
        .finally(() => {
          setIsLoadingBalance(false);
        });
    } else {
      setBalance(null);
    }
  }, [publicKey, connected, connection]);

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
        <Button onClick={() => setModalOpen(true)} variant="default">
          <Wallet className="mr-2 h-4 w-4" />
          Select Wallet
        </Button>
        <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="gap-2">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">{truncateAddress(publicKey)}</span>
          {balance !== null && (
            <Badge variant="secondary" className="hidden md:inline-flex">
              {isLoadingBalance ? "..." : `${balance.toFixed(4)} SOL`}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 mt-5">
        {/* Wallet Header with Balance */}
        <div className="px-2 py-3 space-y-2">
          <DropdownMenuLabel className="text-theme-text-highlight font-semibold">
            My Wallet
          </DropdownMenuLabel>
          <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-theme-background border border-theme-border">
            <div className="flex flex-col">
              <span className="text-xs text-theme-text/60">Balance</span>
              <span className="text-lg font-semibold text-theme-primary">
                {isLoadingBalance ? (
                  <span className="text-sm">Loading...</span>
                ) : balance !== null ? (
                  `${balance.toFixed(4)} SOL`
                ) : (
                  <span className="text-sm">--</span>
                )}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}
            </Badge>
          </div>
          <div className="px-2 py-1.5 rounded bg-theme-primary/5 border border-theme-primary/20">
            <p className="text-xs text-theme-text/80 font-mono break-all">
              {publicKey?.toBase58()}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleCopyAddress}
          className="cursor-pointer"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleViewExplorer}
          className="cursor-pointer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View in Explorer
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDisconnect}
          className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
