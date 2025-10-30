/**
 * Parse Solana/Anchor errors into user-friendly messages
 */

export interface ParsedError {
  title: string;
  description: string;
  severity: "error" | "warning" | "info";
}

/**
 * Common Solana error patterns and their user-friendly messages
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  title: string;
  description: string;
  severity?: "error" | "warning" | "info";
}> = [
  // User actions
  {
    pattern: /user rejected|user denied|user cancelled/i,
    title: "Transaction Cancelled",
    description: "You rejected the transaction in your wallet",
    severity: "info",
  },

  // Insufficient funds
  {
    pattern:
      /insufficient funds|insufficient lamports|attempt to debit an account but found no record/i,
    title: "Insufficient Funds",
    description:
      "Your wallet doesn't have enough SOL or wSOL to complete this transaction. Please add funds and try again.",
  },
  {
    pattern: /insufficient balance/i,
    title: "Insufficient Balance",
    description:
      "Not enough tokens in your account. For SOL donations, you need wrapped SOL (wSOL).",
  },

  // Network issues
  {
    pattern: /blockhash not found|transaction expired/i,
    title: "Transaction Expired",
    description: "The transaction took too long. Please try again.",
  },
  {
    pattern: /network request failed|failed to fetch/i,
    title: "Network Error",
    description:
      "Unable to connect to the Solana network. Check your connection.",
  },
  {
    pattern: /timeout|timed out/i,
    title: "Request Timeout",
    description: "The request took too long. Please try again.",
  },
  {
    pattern: /already been processed|duplicate transaction/i,
    title: "Transaction Successful",
    description:
      "The transaction was processed successfully. Refresh the page to see the updated data.",
    severity: "info",
  },

  // Account issues
  {
    pattern: /account does not exist|account not found/i,
    title: "Account Not Found",
    description: "The required account doesn't exist on-chain yet",
  },
  {
    pattern: /already in use|already exists/i,
    title: "Already Exists",
    description: "This record already exists in the system",
  },
  {
    pattern: /allocate.*already in use/i,
    title: "Already Initialized",
    description:
      "The platform has already been initialized. You can proceed to the admin dashboard.",
    severity: "info",
  },
  {
    pattern: /invalid account data/i,
    title: "Invalid Account",
    description: "The account data is corrupted or invalid",
  },

  // Permission issues
  {
    pattern: /unauthorized|not authorized|permission denied/i,
    title: "Unauthorized",
    description: "You don't have permission to perform this action",
  },
  {
    pattern: /invalid signer|signature verification failed/i,
    title: "Invalid Signature",
    description: "Transaction signature verification failed",
  },

  // Program-specific errors
  {
    pattern: /not verified|verification required/i,
    title: "Verification Required",
    description: "This account needs to be verified before proceeding",
  },
  {
    pattern: /not active|inactive/i,
    title: "Inactive Account",
    description: "This account is not currently active",
  },
  {
    pattern: /platform paused/i,
    title: "Platform Paused",
    description: "The platform is temporarily paused by administrators",
  },
  {
    pattern: /below minimum|minimum amount/i,
    title: "Amount Too Low",
    description: "The amount is below the minimum required",
  },
  {
    pattern: /exceeds maximum|maximum amount/i,
    title: "Amount Too High",
    description: "The amount exceeds the maximum allowed",
  },

  // Admin-specific errors
  {
    pattern: /ngo.*blacklisted|blacklisted.*ngo/i,
    title: "NGO Blacklisted",
    description:
      "This NGO has been blacklisted and cannot perform any operations on the platform",
  },
  {
    pattern: /transfer.*already.*pending|pending.*transfer/i,
    title: "Transfer Already Pending",
    description:
      "An admin transfer is already in progress. Cancel it before initiating a new one.",
  },
  {
    pattern: /no.*transfer.*pending|transfer.*not.*pending/i,
    title: "No Transfer Pending",
    description: "There is no pending admin transfer to accept or cancel",
  },
  {
    pattern: /transfer.*expired|expired.*transfer/i,
    title: "Transfer Expired",
    description:
      "The admin transfer has expired. Please initiate a new transfer.",
  },
  {
    pattern: /not.*pending.*admin|pending.*admin.*mismatch/i,
    title: "Not Pending Admin",
    description: "You are not the designated pending admin for this transfer",
  },
  {
    pattern: /batch.*size.*too.*large|too.*many.*batch/i,
    title: "Batch Size Too Large",
    description:
      "Batch operations are limited to 20 items. Please reduce the selection.",
  },
  {
    pattern: /invalid.*operation|operation.*not.*allowed/i,
    title: "Invalid Operation",
    description: "This operation cannot be performed in the current state",
  },

  // Token issues
  {
    pattern: /invalid token mint|wrong token/i,
    title: "Invalid Token",
    description: "The token type is not supported",
  },
  {
    pattern: /token account not found/i,
    title: "Token Account Missing",
    description: "You need to create a token account first",
  },

  // Simulation errors
  {
    pattern: /simulation failed/i,
    title: "Transaction Simulation Failed",
    description:
      "The transaction would fail. Please check your inputs and try again.",
  },
];

/**
 * Parse an error and return user-friendly message
 */
export function parseError(error: Error | string): ParsedError {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorLower = errorMessage.toLowerCase();

  // Check against known patterns
  for (const { pattern, title, description, severity } of ERROR_PATTERNS) {
    const matches =
      typeof pattern === "string"
        ? errorLower.includes(pattern.toLowerCase())
        : pattern.test(errorMessage);

    if (matches) {
      return {
        title,
        description,
        severity: severity || "error",
      };
    }
  }

  // Try to extract custom program error code
  const programErrorMatch = errorMessage.match(
    /custom program error: (0x[0-9a-f]+)/i,
  );
  if (programErrorMatch) {
    return {
      title: "Program Error",
      description: `Error code: ${programErrorMatch[1]}. Please contact support if this persists.`,
      severity: "error",
    };
  }

  // Try to extract Anchor error
  const anchorErrorMatch = errorMessage.match(
    /AnchorError.*?:\s*(.+?)(?:\.|$)/i,
  );
  if (anchorErrorMatch) {
    return {
      title: "Transaction Error",
      description: anchorErrorMatch[1],
      severity: "error",
    };
  }

  // Default fallback
  return {
    title: "Transaction Failed",
    description:
      errorMessage.length > 100
        ? `${errorMessage.substring(0, 100)}...`
        : errorMessage,
    severity: "error",
  };
}

/**
 * Get a short error message suitable for inline display
 */
export function getShortErrorMessage(error: Error | string): string {
  const parsed = parseError(error);
  return parsed.title;
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: Error | string): boolean {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorLower = errorMessage.toLowerCase();

  const recoverablePatterns = [
    /blockhash not found/i,
    /network request failed/i,
    /timeout/i,
    /simulation failed/i,
  ];

  return recoverablePatterns.some((pattern) => pattern.test(errorLower));
}
