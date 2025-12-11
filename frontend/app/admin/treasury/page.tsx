"use client";

import {
  Activity,
  Calendar,
  ChevronDown,
  Copy,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin } from "@/hooks/use-admin";
import { usePlatformConfig } from "@/hooks/use-platform-config";

import { useActivityLogs } from "@/hooks/use-activity-logs";
import { useAllowedTokens } from "@/hooks/use-allowed-tokens";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { useTreasuryBalances } from "@/hooks/use-treasury-balances";
import {
  formatCurrency,
  formatTokenAmount,
  getAddressExplorerUrl,
} from "@/lib/formatters";

export default function TreasuryPage() {
  const { config, loading, refetch } = usePlatformConfig();
  const { isAdmin } = useAdmin();

  const { tokens, isLoading: tokensLoading } = useAllowedTokens();
  const {
    balances,
    nonZeroBalances,
    isLoading: balancesLoading,
    refetchAll: refetchBalances,
    assetsWithBalance,
  } = useTreasuryBalances();
  const { data: tokenMetadata, isLoading: tokenMetadataLoading } =
    useTokenMetadata(config?.usdcMint || null);
  const {
    logs: activityLogs,
    loading: logsLoading,
    refetch: refetchLogs,
  } = useActivityLogs();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );

  // Track when initial load is complete
  useEffect(() => {
    if (
      !loading &&
      !tokenMetadataLoading &&
      !balancesLoading &&
      !tokensLoading &&
      config
    ) {
      setHasInitiallyLoaded(true);
    }
  }, [loading, tokenMetadataLoading, balancesLoading, tokensLoading, config]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchBalances(), refetchLogs()]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Helper functions for activity display
  const formatActionType = (actionType: string): string => {
    // Handle camelCase and PascalCase conversion
    const formatted = actionType
      .replace(/([A-Z])/g, " $1") // Add space before capital letters
      .replace(/_/g, " ") // Replace underscores with spaces
      .trim() // Remove leading/trailing spaces
      .toLowerCase() // Convert to lowercase
      .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize first letter of each word

    // Special cases for better readability
    if (formatted === "Donation To Pool") return "Pool Donation";
    if (formatted === "Donation Direct") return "Direct Donation";
    if (formatted === "Fee Collection") return "Platform Fee";

    return formatted;
  };

  const toggleExpanded = (activityKey: string) => {
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activityKey)) {
        next.delete(activityKey);
      } else {
        next.add(activityKey);
      }
      return next;
    });
  };

  const getExplorerUrl = (address: string): string => {
    return `https://explorer.solana.com/address/${address}?cluster=devnet`;
  };

  // Format timestamp with relative time
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Format full timestamp for expanded view
  const formatFullTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Format address with truncation
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Parse metadata string to extract treasury info
  const parseMetadata = (
    metadata: string,
  ): { pool?: string; amount?: number; fee?: number } | null => {
    // Format: "Pool: Name | Amount: 500000000 | Fee: 10000000"
    const poolMatch = metadata.match(/Pool:\s*([^|]+)/);
    const amountMatch = metadata.match(/Amount:\s*(\d+)/);
    const feeMatch = metadata.match(/Fee:\s*(\d+)/);

    if (poolMatch || amountMatch || feeMatch) {
      return {
        pool: poolMatch?.[1]?.trim(),
        amount: amountMatch ? Number.parseInt(amountMatch[1], 10) : undefined,
        fee: feeMatch ? Number.parseInt(feeMatch[1], 10) : undefined,
      };
    }
    return null;
  };

  if (
    (loading || tokenMetadataLoading || balancesLoading || tokensLoading) &&
    !hasInitiallyLoaded
  ) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="h-6 w-40 bg-theme-border rounded animate-pulse" />
                <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
              </div>
              <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-10 w-48 bg-theme-border rounded animate-pulse" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="h-6 w-40 bg-theme-border rounded animate-pulse" />
                <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-6 w-full bg-theme-border rounded animate-pulse" />
              <div className="h-6 w-full bg-theme-border rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>

        {/* Wallet Details Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-theme-border rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-20 w-full bg-theme-border rounded animate-pulse" />
            <div className="h-20 w-full bg-theme-border rounded animate-pulse" />
          </CardContent>
        </Card>
      </>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Platform Not Initialized</h2>
        <p className="text-muted-foreground mb-4">
          Please initialize the platform first.
        </p>
        <Button asChild>
          <Link href="/admin/initialize">Initialize Platform</Link>
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">
          Only platform administrators can access this page.
        </p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const unverifiedFeePercentage = config.unverifiedNgoFeePercentage / 100;
  const verifiedFeePercentage = config.verifiedNgoFeePercentage / 100;

  // Create a combined list of all tokens (whitelisted) with their balances
  const allTokensWithBalances = tokens.map((token) => {
    const balance = balances.find((b) => b.mintAddress === token.mintAddress);
    return {
      mint: token.mint,
      mintAddress: token.mintAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
      image: token.image,
      balance: balance?.balance || 0,
      formattedBalance: balance?.formattedBalance || `0.00 ${token.symbol}`,
    };
  });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Platform Treasury
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage platform fees and treasury wallet
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Treasury Overview */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Assets Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Treasury Assets</CardTitle>
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>
              {tokens.length} supported assets, {assetsWithBalance} with balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balancesLoading || isRefreshing ? (
              <div className="animate-pulse space-y-2">
                <div className="h-6 w-full bg-theme-border rounded" />
                <div className="h-6 w-3/4 bg-theme-border rounded" />
                <div className="h-6 w-1/2 bg-theme-border rounded" />
              </div>
            ) : nonZeroBalances.length > 0 ? (
              <div className="space-y-2">
                {nonZeroBalances.slice(0, 3).map((balance) => (
                  <div
                    key={balance.mintAddress}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {balance.logoURI || balance.image ? (
                        <img
                          src={balance.logoURI || balance.image}
                          alt={balance.symbol}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => {
                            // Fallback to letter avatar if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const fallback =
                              target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-6 h-6 bg-theme-primary/10 rounded-full flex items-center justify-center ${
                          balance.logoURI || balance.image ? "hidden" : ""
                        }`}
                      >
                        <span className="text-xs font-bold text-theme-primary">
                          {balance.symbol.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {balance.symbol}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-theme-primary">
                      {balance.formattedBalance}
                    </span>
                  </div>
                ))}
                {nonZeroBalances.length > 3 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    +{nonZeroBalances.length - 3} more assets
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl font-bold text-muted-foreground mb-1">
                  0
                </div>
                <div className="text-sm text-muted-foreground">
                  No assets in treasury
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Fee Configuration</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>Platform fee settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Unverified NGO Fee:
              </span>
              {isRefreshing ? (
                <div className="h-6 w-16 bg-theme-border rounded animate-pulse" />
              ) : (
                <Badge variant="secondary" className="text-base">
                  {unverifiedFeePercentage}%
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Verified NGO Fee:
              </span>
              {isRefreshing ? (
                <div className="h-6 w-16 bg-theme-border rounded animate-pulse" />
              ) : (
                <Badge variant="default" className="text-base">
                  {verifiedFeePercentage}%
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Fees Collected:
              </span>
              {isRefreshing ? (
                <div className="h-5 w-24 bg-theme-border rounded animate-pulse" />
              ) : (
                <span className="text-sm font-semibold text-theme-text-highlight">
                  {tokenMetadata
                    ? formatTokenAmount(
                        config.totalFeesCollected,
                        tokenMetadata.decimals,
                        tokenMetadata.symbol,
                      )
                    : formatCurrency(config.totalFeesCollected / 1_000_000)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* All Assets List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>All Supported Assets</CardTitle>
          <CardDescription>
            Complete list of all supported tokens and their balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balancesLoading || isRefreshing ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => `asset-skeleton-${i}`).map(
                (key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 border border-theme-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-theme-border rounded-full animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-4 w-20 bg-theme-border rounded animate-pulse" />
                        <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-5 w-24 bg-theme-border rounded animate-pulse" />
                  </div>
                ),
              )}
            </div>
          ) : allTokensWithBalances.length > 0 ? (
            <div className="space-y-3">
              {allTokensWithBalances.map((token) => {
                const isExpanded = expandedTokens.has(token.mintAddress);
                return (
                  <div
                    key={token.mintAddress}
                    className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                      token.balance > 0
                        ? "border-theme-primary/20 bg-theme-primary/5"
                        : "border-theme-border"
                    }`}
                  >
                    {/* Main Token Row */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {token.logoURI || token.image ? (
                          <img
                            src={token.logoURI || token.image}
                            alt={token.symbol}
                            className="w-10 h-10 rounded-full"
                            onError={(e) => {
                              // Fallback to letter avatar if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 bg-theme-primary/10 rounded-full flex items-center justify-center ${
                            token.logoURI || token.image ? "hidden" : ""
                          }`}
                        >
                          <span className="text-sm font-bold text-theme-primary">
                            {token.symbol.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{token.symbol}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {token.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div
                            className={`font-semibold ${
                              token.balance > 0
                                ? "text-theme-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {token.formattedBalance}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {token.decimals} decimals
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedTokens((prev) => {
                              const next = new Set(prev);
                              if (next.has(token.mintAddress)) {
                                next.delete(token.mintAddress);
                              } else {
                                next.add(token.mintAddress);
                              }
                              return next;
                            });
                          }}
                          className="shrink-0 hover:bg-theme-primary/10 rounded p-1 transition-colors cursor-pointer"
                        >
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{
                              duration: 0.3,
                              ease: "easeInOut",
                            }}
                          >
                            <ChevronDown className="h-5 w-5 text-theme-text" />
                          </motion.div>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: 0.3,
                            ease: "easeInOut",
                          }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-0 border-t border-theme-border/50 space-y-4">
                            {/* Contract Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Contract Address
                                </p>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-primary break-all">
                                    {token.mintAddress}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        token.mintAddress,
                                      );
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      window.open(
                                        getAddressExplorerUrl(
                                          token.mint,
                                          "devnet",
                                        ),
                                        "_blank",
                                      );
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm font-medium mb-2">
                                  Token Details
                                </p>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Decimals:
                                    </span>
                                    <span>{token.decimals}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Raw Balance:
                                    </span>
                                    <span className="font-mono text-xs">
                                      {token.balance.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Status:
                                    </span>
                                    <Badge
                                      variant={
                                        token.balance > 0
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {token.balance > 0
                                        ? "Has Balance"
                                        : "Zero Balance"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Balance History or Additional Info */}
                            <div>
                              <p className="text-sm font-medium mb-2">
                                Treasury Account
                              </p>
                              <div className="bg-theme-background rounded-lg p-3 border border-theme-border">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Associated Token Account (ATA)
                                </div>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 text-xs font-mono text-theme-text break-all">
                                    {/* Show a placeholder for ATA - in a real implementation we'd calculate this */}
                                    {token.mintAddress.slice(0, 8)}...
                                    {token.mintAddress.slice(-8)}_ATA
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `Associated Token Account for ${token.symbol}`,
                                      );
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Owner:{" "}
                                  {config?.platformFeeRecipient
                                    .toBase58()
                                    .slice(0, 8)}
                                  ...
                                  {config?.platformFeeRecipient
                                    .toBase58()
                                    .slice(-8)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No whitelisted tokens found
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Add tokens to the platform's allowed tokens list to see them
                here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Details & Activity Tabs */}
      <Card>
        <Tabs defaultValue="wallet" className="w-full">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wallet">Wallet Details</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="wallet">
            <CardContent className="space-y-6 pt-0">
              {/* Fee Recipient Address */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Fee Recipient Address:
                </div>
                {isRefreshing ? (
                  <div className="h-12 bg-theme-border rounded-lg animate-pulse" />
                ) : (
                  <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 bg-theme-card-bg border border-theme-border rounded-lg text-sm font-mono text-theme-primary break-all">
                      {config.platformFeeRecipient.toBase58()}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          config.platformFeeRecipient.toBase58(),
                        );
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(
                          getAddressExplorerUrl(
                            config.platformFeeRecipient,
                            "devnet",
                          ),
                          "_blank",
                        );
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Token Mint */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  {tokenMetadata?.name || "Token"} Mint:
                </div>
                {isRefreshing ? (
                  <div className="h-12 bg-theme-border rounded-lg animate-pulse" />
                ) : (
                  <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 bg-theme-card-bg border border-theme-border rounded-lg text-sm font-mono text-theme-text break-all">
                      {config.usdcMint.toBase58()}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          config.usdcMint.toBase58(),
                        );
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(
                          getAddressExplorerUrl(config.usdcMint, "devnet"),
                          "_blank",
                        );
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-theme-border">
                <div className="p-4 bg-theme-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Total Aid Distributed
                  </div>
                  {isRefreshing ? (
                    <div className="h-7 w-32 bg-theme-border rounded animate-pulse" />
                  ) : (
                    <div className="text-lg font-semibold text-theme-text-highlight">
                      {tokenMetadata
                        ? formatTokenAmount(
                            config.totalAidDistributed,
                            tokenMetadata.decimals,
                            tokenMetadata.symbol,
                          )
                        : formatCurrency(config.totalAidDistributed)}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-theme-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Total Fees Collected
                  </div>
                  {isRefreshing ? (
                    <div className="h-7 w-32 bg-theme-border rounded animate-pulse" />
                  ) : (
                    <div className="text-lg font-semibold text-theme-primary">
                      {tokenMetadata
                        ? formatTokenAmount(
                            config.totalFeesCollected,
                            tokenMetadata.decimals,
                            tokenMetadata.symbol,
                          )
                        : formatCurrency(config.totalFeesCollected / 1_000_000)}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-theme-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    Total Donations
                  </div>
                  {isRefreshing ? (
                    <div className="h-7 w-32 bg-theme-border rounded animate-pulse" />
                  ) : (
                    <div className="text-lg font-semibold text-theme-text-highlight">
                      {tokenMetadata
                        ? formatTokenAmount(
                            config.totalDonations,
                            tokenMetadata.decimals,
                            tokenMetadata.symbol,
                          )
                        : `${(config.totalDonations / 1e6).toFixed(2)} USDC`}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="activity">
            <CardContent className="pt-0">
              {logsLoading || isRefreshing ? (
                <div className="space-y-2">
                  {Array.from(
                    { length: 3 },
                    (_, i) => `activity-skeleton-${i}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="border border-theme-border rounded-lg p-3 animate-pulse"
                    >
                      <div className="flex items-center gap-4">
                        {/* Chevron */}
                        <div className="h-4 w-4 bg-theme-border rounded shrink-0" />
                        {/* Badge */}
                        <div className="h-6 w-36 bg-theme-border rounded shrink-0" />
                        {/* Addresses */}
                        <div className="flex items-center gap-3 flex-1 min-w-0 justify-center">
                          <div className="h-6 w-32 bg-theme-border rounded" />
                          <div className="h-4 w-4 bg-theme-border rounded shrink-0" />
                          <div className="h-6 w-32 bg-theme-border rounded" />
                        </div>
                        {/* Timestamp and Status */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="h-4 w-24 bg-theme-border rounded" />
                          <div className="w-px h-4 bg-theme-border" />
                          <div className="h-6 w-20 bg-theme-border rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityLogs && activityLogs.length > 0 ? (
                <div className="space-y-2">
                  {activityLogs
                    .filter(
                      (log) =>
                        // Filter for treasury-related activities (fees, donations, distributions)
                        log.actionType === "donation" ||
                        log.actionType === "DonationToPool" ||
                        log.actionType === "distribution" ||
                        log.actionType === "fee_collection" ||
                        (log.metadata &&
                          (log.metadata.includes("fee") ||
                            log.metadata.includes("Fee") ||
                            log.metadata.includes("donation") ||
                            log.metadata.includes("distribution"))),
                    )
                    .slice(0, 10) // Show only recent 10 activities
                    .map((activity, index) => {
                      const activityKey = `${activity.publicKey.toBase58()}-${index}`;
                      const isExpanded = expandedActivities.has(activityKey);

                      return (
                        <div
                          key={activityKey}
                          className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                        >
                          {/* Collapsed View */}
                          <button
                            type="button"
                            className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                            onClick={() => toggleExpanded(activityKey)}
                          >
                            {/* Mobile: Top Row */}
                            <div className="flex items-center gap-3 md:hidden">
                              <ChevronDown
                                className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <Badge variant="default" className="shrink-0">
                                {formatActionType(activity.actionType)}
                              </Badge>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground ml-auto cursor-help">
                                    {formatTimestamp(activity.timestamp)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {formatFullTimestamp(activity.timestamp)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Desktop: Single Row */}
                            <ChevronDown
                              className={`hidden md:block h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />

                            <Badge
                              variant="default"
                              className="hidden md:flex shrink-0 min-w-[140px] justify-center"
                            >
                              {formatActionType(activity.actionType)}
                            </Badge>

                            <div className="flex items-center gap-4 flex-1 min-w-0 md:justify-center">
                              <code className="px-2 py-0.5 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-text-highlight">
                                {formatAddress(activity.target.toString())}
                              </code>
                              <span className="text-xs text-muted-foreground shrink-0">
                                →
                              </span>
                              <code className="px-2 py-0.5 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-text-highlight">
                                {formatAddress(activity.actor.toString())}
                              </code>
                            </div>

                            <div className="hidden md:flex items-center gap-3 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                                    <Calendar className="h-3 w-3" />
                                    {formatTimestamp(activity.timestamp)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {formatFullTimestamp(activity.timestamp)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>

                              <div className="w-px h-4 bg-theme-border" />

                              <Badge
                                variant="default"
                                className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30"
                              >
                                Success
                              </Badge>
                            </div>
                          </button>

                          {/* Expanded View */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-theme-border bg-[hsl(var(--input))] p-2">
                                  <div className="bg-theme-background p-4 rounded-md">
                                    {/* Activity Summary */}
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Treasury Activity:
                                    </div>
                                    <div className="mb-4 p-4 bg-theme-card-bg border border-theme-border rounded-lg space-y-3">
                                      <div className="text-sm text-theme-text-highlight font-medium">
                                        <span className="text-theme-primary font-semibold">
                                          {formatActionType(
                                            activity.actionType,
                                          )}
                                        </span>{" "}
                                        from{" "}
                                        <code className="px-1.5 py-0.5 bg-theme-card-bg rounded text-xs font-mono text-theme-primary">
                                          {formatAddress(
                                            activity.actor.toString(),
                                          )}
                                        </code>{" "}
                                        to{" "}
                                        <code className="px-1.5 py-0.5 bg-theme-card-bg rounded text-xs font-mono text-theme-primary">
                                          {formatAddress(
                                            activity.target.toString(),
                                          )}
                                        </code>
                                      </div>

                                      {activity.metadata &&
                                        (() => {
                                          const parsed = parseMetadata(
                                            activity.metadata,
                                          );
                                          if (parsed) {
                                            return (
                                              <div className="pt-3">
                                                <div className="text-xs text-muted-foreground mb-2">
                                                  Transaction Details:
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                  {parsed.pool && (
                                                    <div className="p-3 bg-theme-background rounded-lg">
                                                      <div className="text-xs text-muted-foreground mb-1">
                                                        Pool:
                                                      </div>
                                                      <div className="text-sm font-semibold text-theme-text-highlight">
                                                        {parsed.pool}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {parsed.amount !==
                                                    undefined && (
                                                    <div className="p-3 bg-theme-background rounded-lg">
                                                      <div className="text-xs text-muted-foreground mb-1">
                                                        Amount:
                                                      </div>
                                                      <div className="text-base font-semibold text-theme-primary">
                                                        {tokenMetadata
                                                          ? formatTokenAmount(
                                                              parsed.amount,
                                                              tokenMetadata.decimals,
                                                              tokenMetadata.symbol,
                                                            )
                                                          : `$${(
                                                              parsed.amount /
                                                                1e6
                                                            ).toFixed(2)} USDC`}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {parsed.fee !== undefined && (
                                                    <div className="p-3 bg-theme-background rounded-lg">
                                                      <div className="text-xs text-muted-foreground mb-1">
                                                        Platform Fee:
                                                      </div>
                                                      <div className="text-base font-semibold text-theme-primary">
                                                        {tokenMetadata
                                                          ? formatTokenAmount(
                                                              parsed.fee,
                                                              tokenMetadata.decimals,
                                                              tokenMetadata.symbol,
                                                            )
                                                          : `$${(
                                                              parsed.fee / 1e6
                                                            ).toFixed(2)} USDC`}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="pt-2">
                                              <div className="text-xs text-muted-foreground mb-1.5">
                                                Details:
                                              </div>
                                              <div className="text-sm text-theme-text-highlight">
                                                {activity.metadata}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                      {activity.amount !== null &&
                                        activity.amount !== undefined && (
                                          <div className="pt-2">
                                            <div className="text-xs text-muted-foreground mb-1.5">
                                              Total Amount:
                                            </div>
                                            <div className="text-lg font-semibold text-theme-primary">
                                              {tokenMetadata
                                                ? formatTokenAmount(
                                                    activity.amount,
                                                    tokenMetadata.decimals,
                                                    tokenMetadata.symbol,
                                                  )
                                                : `$${(
                                                    activity.amount / 1e6
                                                  ).toFixed(2)} USDC`}
                                            </div>
                                          </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                      {/* Left Column */}
                                      <div className="space-y-4">
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-1">
                                            Target Address:
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-primary flex-1 break-all">
                                              {activity.target.toString()}
                                            </code>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="shrink-0 h-7 w-7 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(
                                                  getExplorerUrl(
                                                    activity.target.toString(),
                                                  ),
                                                  "_blank",
                                                );
                                              }}
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-1">
                                            Actor Address:
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-primary flex-1 break-all">
                                              {activity.actor.toString()}
                                            </code>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="shrink-0 h-7 w-7 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(
                                                  getExplorerUrl(
                                                    activity.actor.toString(),
                                                  ),
                                                  "_blank",
                                                );
                                              }}
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right Column */}
                                      <div className="space-y-4">
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-1">
                                            Activity Account:
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <code className="px-2 py-1 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-primary flex-1 break-all">
                                              {activity.publicKey.toString()}
                                            </code>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="shrink-0 h-7 w-7 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(
                                                  getExplorerUrl(
                                                    activity.publicKey.toString(),
                                                  ),
                                                  "_blank",
                                                );
                                              }}
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-1">
                                            Timestamp:
                                          </div>
                                          <div className="text-sm text-theme-text-highlight">
                                            {formatFullTimestamp(
                                              activity.timestamp,
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {formatTimestamp(
                                              activity.timestamp,
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}

                  {activityLogs.filter(
                    (log) =>
                      log.actionType === "donation" ||
                      log.actionType === "distribution" ||
                      log.actionType === "fee_collection" ||
                      (log.metadata &&
                        (log.metadata.includes("fee") ||
                          log.metadata.includes("Fee") ||
                          log.metadata.includes("donation") ||
                          log.metadata.includes("distribution"))),
                  ).length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No treasury activity found
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Fee collections and donations will appear here
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No activity logs available
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Treasury activity will appear here as transactions occur
                  </p>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
}
