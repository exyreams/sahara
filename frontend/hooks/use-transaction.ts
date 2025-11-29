"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isRecoverableError, parseError } from "@/lib/error-parser";
import { getExplorerUrl } from "@/lib/formatters";

type TransactionStatus = "idle" | "pending" | "success" | "error";

interface UseTransactionReturn {
  submit: <T>(
    fn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      successMessage?: string;
      errorMessage?: string;
    },
  ) => Promise<T | null>;
  status: TransactionStatus;
  signature: string | null;
  error: Error | null;
  isLoading: boolean;
}

export function useTransaction(): UseTransactionReturn {
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
        successMessage?: string;
        errorMessage?: string;
      },
    ): Promise<T | null> => {
      // Prevent duplicate submissions
      if (isSubmitting) {
        console.warn(
          "Transaction already in progress, ignoring duplicate submission",
        );
        return null;
      }

      let loadingToastId: string | number | undefined;

      try {
        setIsSubmitting(true);
        setStatus("pending");
        setError(null);
        setSignature(null);

        // Show loading toast
        loadingToastId = toast.loading("Processing transaction...", {
          description:
            "Please confirm in your wallet and wait for confirmation",
        });

        const result = await fn();

        // Dismiss loading toast
        if (loadingToastId) {
          toast.dismiss(loadingToastId);
        }

        // Extract signature if result is a string (transaction signature)
        if (typeof result === "string") {
          setSignature(result);
          const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
            "devnet") as "devnet" | "testnet" | "mainnet-beta";
          const explorerUrl = getExplorerUrl(result, network);

          toast.success(options?.successMessage || "Transaction successful", {
            description: "View in explorer",
            action: {
              label: "View",
              onClick: () => window.open(explorerUrl, "_blank"),
            },
          });
        } else {
          toast.success(options?.successMessage || "Operation successful");
        }

        setStatus("success");
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err as Error;

        // Dismiss loading toast explicitly by ID
        if (loadingToastId) {
          toast.dismiss(loadingToastId);
        }

        // Check if this is a post-success error (transaction already processed)
        // This happens when the transaction succeeded but confirmation failed
        const isPostSuccessError =
          error.message.toLowerCase().includes("already been processed") ||
          error.message.toLowerCase().includes("duplicate transaction");

        if (isPostSuccessError) {
          // Transaction actually succeeded, treat as success
          setStatus("success");
          toast.success(options?.successMessage || "Transaction successful", {
            description: "The transaction was processed successfully",
          });
          options?.onSuccess?.(null as T);
          return null;
        }

        // Real error - handle normally
        setError(error);
        setStatus("error");

        // Parse error into user-friendly message
        const parsedError = parseError(error);
        const recoverable = isRecoverableError(error);

        // Use custom error message if provided, otherwise use parsed title
        const errorTitle = options?.errorMessage || parsedError.title;

        // Build description with retry hint for recoverable errors
        const description = recoverable
          ? `${parsedError.description}\n\nThis error is usually temporary. Please try again.`
          : parsedError.description;

        // Show toast with description and action buttons
        toast.error(errorTitle, {
          description,
          action: {
            label: "Details",
            onClick: () => {
              toast.info("Full Error Details", {
                description: error.message,
                duration: 10000,
              });
            },
          },
          duration: parsedError.severity === "info" ? 4000 : 6000,
        });

        options?.onError?.(error);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  return {
    submit,
    status,
    signature,
    error,
    isLoading: status === "pending",
  };
}
