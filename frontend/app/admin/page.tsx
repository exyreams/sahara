"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  FileText,
  Heart,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export default function AdminDashboardPage() {
  const {
    config,
    loading,
    error,
    refetch: refetchConfig,
  } = usePlatformConfig();
  const { wallet } = useProgram();
  const {
    logs,
    loading: logsLoading,
    refetch: refetchLogs,
  } = useActivityLogs();
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const isAdmin =
    config && wallet.publicKey && config.admin.equals(wallet.publicKey);

  // Get recent 10 activities from all logs to fill more space
  const recentActivities = logs.slice(0, 10);

  // Track when initial load is complete
  useEffect(() => {
    if (!loading && !logsLoading && config) {
      setHasInitiallyLoaded(true);
    }
  }, [loading, logsLoading, config]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchConfig(), refetchLogs()]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
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

  const getExplorerUrl = (address: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    return `https://explorer.solana.com/address/${address}?cluster=${network}`;
  };

  // Format action type for display
  const formatActionType = (actionType: string): string => {
    const actionMap: Record<string, string> = {
      // Field Worker actions
      fieldWorkerRegistered: "Registered Field Worker",
      fieldWorkerActivated: "Activated Field Worker",
      fieldWorkerDeactivated: "Deactivated Field Worker",

      // Beneficiary actions
      beneficiaryRegistered: "Registered Beneficiary",
      beneficiaryVerified: "Verified Beneficiary",
      beneficiaryUpdated: "Updated Beneficiary",

      // Fund Pool actions
      fundPoolCreated: "Created Fund Pool",
      fundPoolClosed: "Closed Fund Pool",

      // Distribution actions
      fundsDistributed: "Distributed Funds",
      distributionClaimed: "Claimed Distribution",

      // Donation actions
      donationToPool: "Donation to Pool",
      directDonation: "Direct Donation",

      // Disaster actions
      disasterCreated: "Created Disaster",
      disasterUpdated: "Updated Disaster",
      disasterClosed: "Closed Disaster",

      // Admin actions
      verifyNgo: "Verified NGO",
      revokeVerification: "Revoked Verification",
      activateNgo: "Activated NGO",
      deactivateNgo: "Deactivated NGO",
      blacklistNgo: "Blacklisted NGO",
      removeBlacklist: "Removed Blacklist",
    };

    return actionMap[actionType] || actionType;
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading && !hasInitiallyLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-theme-border rounded animate-pulse" />
              <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
            </div>
            <div className="h-6 w-32 bg-theme-border rounded-full animate-pulse" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {Array.from({ length: 4 }, (_, i) => `stats-skeleton-${i}`).map(
              (key) => (
                <Card key={key}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-32 bg-theme-border rounded animate-pulse mb-2" />
                    <div className="h-3 w-40 bg-theme-border rounded animate-pulse" />
                  </CardContent>
                </Card>
              ),
            )}
          </div>

          {/* Recent Activities & Admin Actions Skeleton */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Activities Skeleton */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-theme-border rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(
                    { length: 5 },
                    (_, i) => `activity-skeleton-${i}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 border border-theme-border rounded-lg"
                    >
                      <div className="h-10 w-10 bg-theme-border rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
                        <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Admin Actions Skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => `action-skeleton-${i}`).map(
                (key) => (
                  <Card key={key}>
                    <CardHeader>
                      <div className="h-5 w-48 bg-theme-border rounded animate-pulse mb-2" />
                      <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="h-10 w-full bg-theme-border rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Platform not initialized - handled by layout
  if (error?.message.includes("Account does not exist")) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have admin permissions to access this page.
            </p>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Platform administration and configuration
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Badge variant={config.isPaused ? "destructive" : "default"}>
              {config.isPaused ? "Platform Paused" : "Platform Active"}
            </Badge>
          </div>
        </div>

        {config.isPaused && (
          <Card className="mb-6 border-red-500/50 bg-red-500/10">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Platform is Paused
              </CardTitle>
              <CardDescription>
                All transactions are currently disabled. Unpause to resume
                operations.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Platform Statistics */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Aid</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <>
                  <div className="h-8 w-32 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="h-3 w-40 bg-theme-border rounded animate-pulse" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(config.totalAidDistributed)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From ${(config.totalDonations / 1e6).toFixed(2)} USDC
                    donated
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Beneficiaries
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <>
                  <div className="h-8 w-16 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(config.totalBeneficiaries)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(config.totalVerifiedBeneficiaries)} verified
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NGOs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <>
                  <div className="h-8 w-16 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(config.totalNgos)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(config.totalFieldWorkers)} field workers
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disasters</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <>
                  <div className="h-8 w-16 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(config.totalDisasters)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(config.totalPools)} pools
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities & Admin Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activities - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activities</CardTitle>
                  <CardDescription>
                    Latest administrative actions on the platform
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/audit-log">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading || isRefreshing ? (
                <div className="space-y-2">
                  {Array.from(
                    { length: 10 },
                    (_, i) => `log-skeleton-${i}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 border border-theme-border rounded-lg animate-pulse"
                    >
                      <div className="h-4 w-4 bg-theme-border rounded" />
                      <div className="h-4 w-4 bg-theme-border rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-theme-border rounded" />
                      </div>
                      <div className="h-4 w-16 bg-theme-border rounded" />
                    </div>
                  ))}
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activities</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivities.map((activity) => {
                    const activityKey = activity.publicKey.toString();
                    const isExpanded = expandedActivities.has(activityKey);

                    return (
                      <div
                        key={activityKey}
                        className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                      >
                        {/* Collapsed View */}
                        <button
                          type="button"
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                          onClick={() => toggleExpanded(activityKey)}
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                          <FileText className="h-4 w-4 text-theme-primary shrink-0" />
                          <span className="font-semibold text-theme-text text-sm">
                            {formatActionType(activity.actionType)}
                          </span>
                          <div className="flex-1" />
                          <span className="text-xs text-theme-text/60 shrink-0">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </button>

                        {/* Expanded View */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-theme-border bg-theme-background/50 p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs text-theme-text/60 mb-1">
                                      Actor
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-mono text-theme-text break-all">
                                        {activity.actor.toString()}
                                      </p>
                                      <a
                                        href={getExplorerUrl(
                                          activity.actor.toString(),
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-theme-primary hover:underline shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-theme-text/60 mb-1">
                                      Target
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-mono text-theme-text break-all">
                                        {activity.target.toString()}
                                      </p>
                                      <a
                                        href={getExplorerUrl(
                                          activity.target.toString(),
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-theme-primary hover:underline shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-theme-text/60 mb-1">
                                      Date & Time
                                    </p>
                                    <p className="text-sm text-theme-text">
                                      {new Date(
                                        activity.timestamp * 1000,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  {activity.amount !== null && (
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Amount
                                      </p>
                                      <p className="text-sm text-theme-primary font-semibold">
                                        $
                                        {(activity.amount / 1_000_000).toFixed(
                                          2,
                                        )}{" "}
                                        USDC
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Parse and display metadata */}
                                {activity.metadata &&
                                  (() => {
                                    // Parse metadata (format: "Key: Value | Key: Value")
                                    const metadataParts =
                                      activity.metadata.split(" | ");
                                    const parsedData: Record<string, string> =
                                      {};

                                    metadataParts.forEach((part) => {
                                      const [key, value] = part.split(": ");
                                      if (key && value) {
                                        parsedData[key] = value;
                                      }
                                    });

                                    return (
                                      <div className="pt-3 border-t border-theme-border">
                                        <p className="text-xs text-theme-text/60 mb-2">
                                          Additional Details
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {parsedData.Pool && (
                                            <div>
                                              <p className="text-xs text-theme-text/60 mb-1">
                                                Pool Name
                                              </p>
                                              <p className="text-sm text-theme-text">
                                                {parsedData.Pool}
                                              </p>
                                            </div>
                                          )}
                                          {parsedData.Amount && (
                                            <div>
                                              <p className="text-xs text-theme-text/60 mb-1">
                                                Donation Amount
                                              </p>
                                              <p className="text-sm text-theme-primary font-semibold">
                                                $
                                                {(
                                                  Number.parseInt(
                                                    parsedData.Amount,
                                                    10,
                                                  ) / 1_000_000
                                                ).toFixed(2)}{" "}
                                                USDC
                                              </p>
                                            </div>
                                          )}
                                          {parsedData.Fee && (
                                            <div>
                                              <p className="text-xs text-theme-text/60 mb-1">
                                                Platform Fee
                                              </p>
                                              <p className="text-sm text-theme-text">
                                                $
                                                {(
                                                  Number.parseInt(
                                                    parsedData.Fee,
                                                    10,
                                                  ) / 1_000_000
                                                ).toFixed(2)}{" "}
                                                USDC
                                              </p>
                                            </div>
                                          )}
                                          {parsedData.Disaster && (
                                            <div>
                                              <p className="text-xs text-theme-text/60 mb-1">
                                                Disaster
                                              </p>
                                              <p className="text-sm text-theme-text">
                                                {parsedData.Disaster}
                                              </p>
                                            </div>
                                          )}
                                          {/* Display any other metadata fields */}
                                          {Object.entries(parsedData).map(
                                            ([key, value]) => {
                                              if (
                                                ![
                                                  "Pool",
                                                  "Amount",
                                                  "Fee",
                                                  "Disaster",
                                                ].includes(key)
                                              ) {
                                                return (
                                                  <div key={key}>
                                                    <p className="text-xs text-theme-text/60 mb-1">
                                                      {key}
                                                    </p>
                                                    <p className="text-sm text-theme-text">
                                                      {value}
                                                    </p>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            },
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Actions - Takes 1 column */}
          <div className="space-y-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Platform Treasury</CardTitle>
                <CardDescription>
                  View fees collected and wallet balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="default" className="w-full">
                  <Link href="/admin/treasury">View Treasury</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Manage Disasters</CardTitle>
                <CardDescription>
                  Create and manage disaster events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/disasters">View Disasters</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">
                  Platform Configuration
                </CardTitle>
                <CardDescription>
                  Manage platform settings and fees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">
                      Unverified NGO Fee:
                    </span>{" "}
                    <span className="font-medium">
                      {config.unverifiedNgoFeePercentage / 100}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Verified NGO Fee:
                    </span>{" "}
                    <span className="font-medium">
                      {config.verifiedNgoFeePercentage / 100}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Verification Threshold:
                    </span>{" "}
                    <span className="font-medium">
                      {config.verificationThreshold}/{config.maxVerifiers}
                    </span>
                  </div>
                </div>
                <Button asChild className="w-full">
                  <Link href="/admin/settings">Configure</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Emergency Controls</CardTitle>
                <CardDescription>
                  Pause/unpause platform operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant={config.isPaused ? "default" : "destructive"}
                  className="w-full"
                  asChild
                >
                  <Link href="/admin/settings">
                    {config.isPaused ? "Unpause Platform" : "Pause Platform"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
