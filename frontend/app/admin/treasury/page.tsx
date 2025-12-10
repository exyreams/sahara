"use client";

import { ExternalLink, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdmin } from "@/hooks/use-admin";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { formatCurrency, getAddressExplorerUrl } from "@/lib/formatters";

export default function TreasuryPage() {
  const { config, loading, refetch } = usePlatformConfig();
  const { isAdmin } = useAdmin();
  const { connection } = useProgram();
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Fetch USDC balance of platform fee recipient
  const fetchBalance = useCallback(async () => {
    if (!config || !connection) {
      setLoadingBalance(false);
      return;
    }

    try {
      setLoadingBalance(true);

      // Get the token account for the platform fee recipient
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const tokenAccount = await getAssociatedTokenAddress(
        config.usdcMint,
        config.platformFeeRecipient,
      );

      // Fetch the account info
      const accountInfo = await connection.getAccountInfo(tokenAccount);

      if (accountInfo) {
        // Parse token account data (amount is at bytes 64-72)
        const data = accountInfo.data;
        const amount = Number(data.readBigUInt64LE(64));
        setBalance(amount);
      } else {
        setBalance(0);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  }, [config, connection]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Track when initial load is complete
  useEffect(() => {
    if (!loading && config) {
      setHasInitiallyLoaded(true);
    }
  }, [loading, config]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), fetchBalance()]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  if (loading && !hasInitiallyLoaded) {
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
        {/* Current Balance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Treasury Balance</CardTitle>
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>
              Current USDC balance in platform wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBalance || isRefreshing ? (
              <div className="animate-pulse">
                <div className="h-10 w-48 bg-theme-border rounded" />
              </div>
            ) : (
              <div className="text-4xl font-bold text-theme-primary">
                {formatCurrency(balance)}
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
                  {formatCurrency(config.totalFeesCollected / 1_000_000)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Details */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Details</CardTitle>
          <CardDescription>
            Platform fee recipient wallet information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* USDC Mint */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              USDC Token Mint:
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
                    navigator.clipboard.writeText(config.usdcMint.toBase58());
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
                  {formatCurrency(config.totalAidDistributed)}
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
                  {formatCurrency(config.totalFeesCollected / 1_000_000)}
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
                  ${(config.totalDonations / 1e6).toFixed(2)} USDC
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
