"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface RPCErrorProps {
  error: Error;
  onRetry?: () => void;
}

/**
 * RPC Error Component
 *
 * Displays user-friendly error messages for RPC/blockchain errors.
 * Provides retry functionality for failed requests.
 */
export function RPCError({ error, onRetry }: RPCErrorProps) {
  // Parse common RPC errors into user-friendly messages
  const getUserFriendlyMessage = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes("user rejected")) {
      return "Transaction was cancelled. Please try again if you want to proceed.";
    }

    if (
      message.includes("insufficient funds") ||
      message.includes("insufficient lamports")
    ) {
      return "Insufficient funds in your wallet. Please add more SOL to cover transaction fees.";
    }

    if (message.includes("blockhash not found")) {
      return "Transaction expired. Please try again.";
    }

    if (message.includes("network") || message.includes("fetch")) {
      return "Network connection error. Please check your internet connection and try again.";
    }

    if (message.includes("timeout")) {
      return "Request timed out. The network might be congested. Please try again.";
    }

    if (message.includes("account not found")) {
      return "Account not found on the blockchain. It may not exist yet.";
    }

    if (
      message.includes("invalid") ||
      message.includes("failed to deserialize")
    ) {
      return "Invalid data received. Please refresh the page and try again.";
    }

    // Default message
    return (
      error.message ||
      "An error occurred while communicating with the blockchain."
    );
  };

  const friendlyMessage = getUserFriendlyMessage(error);

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Connection Error</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p>{friendlyMessage}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
