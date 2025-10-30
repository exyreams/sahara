"use client";

import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getExplorerUrl } from "@/lib/formatters";

interface TransactionStatusProps {
  status: "idle" | "pending" | "success" | "error";
  signature?: string | null;
  error?: Error | null;
  onRetry?: () => void;
  cluster?: "devnet" | "testnet" | "mainnet-beta";
}

export function TransactionStatus({
  status,
  signature,
  error,
  onRetry,
  cluster = "devnet",
}: TransactionStatusProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "pending") {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Transaction Pending</AlertTitle>
        <AlertDescription>
          Your transaction is being processed on the Solana blockchain. This
          usually takes a few seconds.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "success" && signature) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Transaction Confirmed
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          <div className="space-y-2">
            <p>
              Your transaction has been successfully confirmed on the
              blockchain.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                {signature.slice(0, 8)}...{signature.slice(-8)}
              </code>
              <Button variant="outline" size="sm" asChild className="h-7">
                <a
                  href={getExplorerUrl(signature, cluster)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Transaction Failed</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>
              {error?.message ||
                "An error occurred while processing your transaction."}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-2"
              >
                Retry Transaction
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
