"use client";

import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useProgram } from "@/hooks/use-program";

interface WalletGuardProps {
  children: ReactNode;
  message?: string;
}

/**
 * Wallet Guard Component
 *
 * Ensures wallet is connected before rendering protected content.
 * Displays a connection prompt if wallet is not connected.
 */
export function WalletGuard({ children, message }: WalletGuardProps) {
  const { wallet } = useProgram();

  if (!wallet.connected || !wallet.publicKey) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Wallet Connection Required</CardTitle>
                <CardDescription>
                  {message || "Please connect your wallet to continue"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This feature requires a connected Solana wallet. Connect your
                wallet to access this functionality.
              </p>
              <div className="w-full">
                <WalletButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
