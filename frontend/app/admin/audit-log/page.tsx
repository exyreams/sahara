"use client";

import type { PublicKey } from "@solana/web3.js";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { useAdmin } from "@/hooks/use-admin";
import { useAdminActions } from "@/hooks/use-admin-actions";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { ActivityTypeLabels } from "@/types/activity";
import { AdminActionType } from "@/types/admin";

// Combined log entry type
interface CombinedLogEntry {
  publicKey: PublicKey;
  actionType: string;
  actor: PublicKey;
  target: PublicKey;
  amount?: number | null;
  timestamp: number;
  metadata?: string;
  reason?: string;
  category: "admin" | "activity";
}

export default function AuditLogPage() {
  const { loading: adminLoading } = useAdmin();
  const {
    actions,
    loading: actionsLoading,
    refetch: refetchActions,
  } = useAdminActions();
  const {
    logs: activityLogs,
    loading: activityLoading,
    refetch: refetchLogs,
  } = useActivityLogs();
  const { config } = usePlatformConfig();

  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const itemsPerPage = 20;

  const loading = adminLoading || actionsLoading || activityLoading;

  // Track when initial load is complete
  useEffect(() => {
    if (!loading) {
      setHasInitiallyLoaded(true);
    }
  }, [loading]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchActions(), refetchLogs()]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Combine admin actions and activity logs
  const combinedLogs = useMemo<CombinedLogEntry[]>(() => {
    const adminEntries: CombinedLogEntry[] = actions.map((action) => ({
      publicKey: action.publicKey,
      actionType: action.actionType, // Already a string from the hook
      actor: action.admin,
      target: action.target,
      timestamp: action.timestamp,
      reason: action.reason,
      category: "admin" as const,
    }));

    const activityEntries: CombinedLogEntry[] = activityLogs.map((log) => ({
      publicKey: log.publicKey,
      actionType: log.actionType,
      actor: log.actor,
      target: log.target,
      amount: log.amount,
      timestamp: log.timestamp,
      metadata: log.metadata,
      category: "activity" as const,
    }));

    // Combine and sort by timestamp (newest first)
    return [...adminEntries, ...activityEntries].sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }, [actions, activityLogs]);

  // Handle window resize for dynamic address truncation
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Map frontend enum values to Rust enum variants (camelCase)
  const toRustEnumVariant = useCallback((frontendEnum: string): string => {
    const mapping: Record<string, string> = {
      VerifyNGO: "verifyNgo",
      RevokeVerification: "revokeVerification",
      ActivateNGO: "activateNgo",
      DeactivateNGO: "deactivateNgo",
      BlacklistNGO: "blacklistNgo",
      RemoveBlacklist: "removeBlacklist",
      InitiateAdminTransfer: "initiateAdminTransfer",
      AcceptAdminTransfer: "acceptAdminTransfer",
      CancelAdminTransfer: "cancelAdminTransfer",
      UpdatePlatformConfig: "updatePlatformConfig",
      PausePlatform: "pausePlatform",
      UnpausePlatform: "unpausePlatform",
    };
    return mapping[frontendEnum] || frontendEnum;
  }, []);

  // Filter combined logs
  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((log) => {
      // Search filter (by target or actor address)
      const matchesSearch =
        searchQuery === "" ||
        log.target
          .toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        log.actor.toString().toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        categoryFilter === "all" || log.category === categoryFilter;

      // Action type filter
      const matchesActionType =
        actionTypeFilter === "all" ||
        log.actionType.toLowerCase() === actionTypeFilter.toLowerCase() ||
        log.actionType === toRustEnumVariant(actionTypeFilter);

      return matchesSearch && matchesCategory && matchesActionType;
    });
  }, [
    combinedLogs,
    searchQuery,
    categoryFilter,
    actionTypeFilter,
    toRustEnumVariant,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

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

  // Format address with dynamic truncation based on screen size
  const formatAddress = (
    address: string,
    mode: "collapsed" | "full" = "collapsed"
  ): string => {
    if (mode === "full") return address;

    // Show more characters on larger screens
    // Mobile: 6...4, Tablet: 8...6, Desktop: 12...8, XL: 16...10
    if (windowWidth >= 1536) {
      // Extra large screens - show even more
      return `${address.slice(0, 16)}...${address.slice(-10)}`;
    } else if (windowWidth >= 1280) {
      // Desktop - show more
      return `${address.slice(0, 12)}...${address.slice(-8)}`;
    } else if (windowWidth >= 768) {
      // Tablet
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }
    // Mobile - show less
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Parse metadata string to extract pool info
  const parseMetadata = (
    metadata: string
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

  // Format action type to be user-friendly
  const formatActionType = (actionType: string, category: string): string => {
    // For admin actions - convert camelCase from Rust to readable format
    if (category === "admin") {
      // Map of Rust enum variants (camelCase) to display names
      const typeMap: Record<string, string> = {
        verifyNgo: "Verify NGO",
        revokeVerification: "Revoke Verification",
        activateNgo: "Activate NGO",
        deactivateNgo: "Deactivate NGO",
        blacklistNgo: "Blacklist NGO",
        removeBlacklist: "Remove Blacklist",
        initiateAdminTransfer: "Initiate Admin Transfer",
        acceptAdminTransfer: "Accept Admin Transfer",
        cancelAdminTransfer: "Cancel Admin Transfer",
        updatePlatformConfig: "Update Platform Config",
        pausePlatform: "Pause Platform",
        unpausePlatform: "Unpause Platform",
      };

      // Also handle PascalCase variants (from enum)
      const pascalMap: Record<string, string> = {
        VerifyNGO: "Verify NGO",
        RevokeVerification: "Revoke Verification",
        ActivateNGO: "Activate NGO",
        DeactivateNGO: "Deactivate NGO",
        BlacklistNGO: "Blacklist NGO",
        RemoveBlacklist: "Remove Blacklist",
        InitiateAdminTransfer: "Initiate Admin Transfer",
        AcceptAdminTransfer: "Accept Admin Transfer",
        CancelAdminTransfer: "Cancel Admin Transfer",
        UpdatePlatformConfig: "Update Platform Config",
        PausePlatform: "Pause Platform",
        UnpausePlatform: "Unpause Platform",
      };

      return typeMap[actionType] || pascalMap[actionType] || actionType;
    }

    // For activity logs, use the labels from ActivityTypeLabels
    return (
      ActivityTypeLabels[actionType as keyof typeof ActivityTypeLabels] ||
      actionType
    );
  };

  // Expanded state for actions
  const [expandedActions, setExpandedActions] = useState<Set<string>>(
    new Set()
  );

  const toggleExpanded = (actionKey: string) => {
    setExpandedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionKey)) {
        next.delete(actionKey);
      } else {
        next.add(actionKey);
      }
      return next;
    });
  };

  if (loading && !hasInitiallyLoaded) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
        </div>

        {/* Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="h-6 w-32 bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
              </div>
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
              <div className="h-9 w-full md:w-64 bg-theme-border rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Action Row Skeletons */}
              {Array.from({ length: 5 }, (_, i) => `audit-skeleton-${i}`).map(
                (key) => (
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
                )
              )}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Platform Pause Alert */}
      {config?.isPaused && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader className="pb-3">
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-2">
            View all platform activities and administrative actions
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

      {/* Unified Filters and Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-lg">
                All Activities ({filteredLogs.length})
              </CardTitle>
              <CardDescription>
                Showing {paginatedLogs.length} of {filteredLogs.length} entries
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9"
              />
            </div>

            <Dropdown
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
              placeholder="Category"
              options={[
                { value: "all", label: "All Categories" },
                { value: "admin", label: "Admin Actions" },
                { value: "activity", label: "User Activities" },
              ]}
              className="w-full md:w-48"
            />

            <Dropdown
              value={actionTypeFilter}
              onValueChange={(value) => {
                setActionTypeFilter(value);
                setCurrentPage(1);
              }}
              placeholder="Action Type"
              options={[
                { value: "all", label: "All Types" },
                { value: "DisasterCreated", label: "Disaster Created" },
                { value: "DisasterUpdated", label: "Disaster Updated" },
                { value: "DisasterClosed", label: "Disaster Closed" },
                { value: "FundPoolCreated", label: "Fund Pool Created" },
                { value: "FundPoolClosed", label: "Fund Pool Closed" },
                { value: "DonationToPool", label: "Donation to Pool" },
                { value: "FundsDistributed", label: "Funds Distributed" },
                { value: "FundsClaimed", label: "Funds Claimed" },
                {
                  value: "BeneficiaryRegistered",
                  label: "Beneficiary Registered",
                },
                {
                  value: "BeneficiaryVerified",
                  label: "Beneficiary Verified",
                },
                { value: "NGOUpdated", label: "NGO Updated" },
                {
                  value: "FieldWorkerUpdated",
                  label: "Field Worker Updated",
                },
                { value: AdminActionType.VerifyNGO, label: "Verify NGO" },
                {
                  value: AdminActionType.RevokeVerification,
                  label: "Revoke Verification",
                },
                { value: AdminActionType.ActivateNGO, label: "Activate NGO" },
                {
                  value: AdminActionType.DeactivateNGO,
                  label: "Deactivate NGO",
                },
                {
                  value: AdminActionType.BlacklistNGO,
                  label: "Blacklist NGO",
                },
              ]}
              className="w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {paginatedLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-theme-text-highlight mb-2">
                No activities found
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery ||
                actionTypeFilter !== "all" ||
                categoryFilter !== "all"
                  ? "Try adjusting your filters to see more results"
                  : "Platform activities will appear here once they are performed"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedLogs.map((log) => {
                const logKey = log.publicKey.toString();
                const isExpanded = expandedActions.has(logKey);

                return (
                  <div
                    key={logKey}
                    className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                  >
                    {/* Collapsed View */}
                    <button
                      type="button"
                      className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                      onClick={() => toggleExpanded(logKey)}
                    >
                      {/* Mobile: Top Row */}
                      <div className="flex items-center gap-3 md:hidden">
                        <ChevronDown
                          className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                        <Badge
                          variant={
                            log.category === "admin" ? "log_action" : "default"
                          }
                          className="shrink-0"
                        >
                          {formatActionType(log.actionType, log.category)}
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground ml-auto cursor-help">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {formatFullTimestamp(log.timestamp)}
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
                        variant={
                          log.category === "admin" ? "log_action" : "default"
                        }
                        className="hidden md:flex shrink-0 min-w-[140px] justify-center"
                      >
                        {formatActionType(log.actionType, log.category)}
                      </Badge>

                      <div className="flex items-center gap-4 flex-1 min-w-0 md:justify-center">
                        <code className="px-2 py-0.5 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-text-highlight">
                          {formatAddress(log.target.toString())}
                        </code>
                        <span className="text-xs text-muted-foreground shrink-0">
                          →
                        </span>
                        <code className="px-2 py-0.5 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-text-highlight">
                          {formatAddress(log.actor.toString())}
                        </code>
                      </div>

                      <div className="hidden md:flex items-center gap-3 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                              <Calendar className="h-3 w-3" />
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {formatFullTimestamp(log.timestamp)}
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
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-theme-border bg-[hsl(var(--input))] p-2">
                            <div className="bg-theme-background p-4 rounded-md">
                              {/* Action Summary */}
                              <div className="text-xs text-muted-foreground mb-1">
                                {log.category === "admin"
                                  ? "Admin Action:"
                                  : "Activity:"}
                              </div>
                              <div className="mb-4 p-4 bg-theme-card-bg border border-theme-border rounded-lg space-y-3">
                                <div className="text-sm text-theme-text-highlight font-medium">
                                  <span className="text-theme-primary font-semibold">
                                    {formatActionType(
                                      log.actionType,
                                      log.category
                                    )}
                                  </span>{" "}
                                  of{" "}
                                  <code className="px-1.5 py-0.5 bg-theme-card-bg rounded text-xs font-mono text-theme-primary">
                                    {formatAddress(log.target.toString())}
                                  </code>{" "}
                                  by{" "}
                                  <code className="px-1.5 py-0.5 bg-theme-card-bg rounded text-xs font-mono text-theme-primary">
                                    {formatAddress(log.actor.toString())}
                                  </code>
                                </div>
                                {log.metadata &&
                                  (() => {
                                    const parsed = parseMetadata(log.metadata);
                                    if (parsed) {
                                      return (
                                        <div className="pt-3">
                                          <div className="text-xs text-muted-foreground mb-2">
                                            Details:
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
                                            {parsed.amount !== undefined && (
                                              <div className="p-3 bg-theme-background rounded-lg">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                  Donated Amount:
                                                </div>
                                                <div className="text-base font-semibold text-theme-primary">
                                                  $
                                                  {(
                                                    parsed.amount / 1e6
                                                  ).toFixed(2)}{" "}
                                                  USDC
                                                </div>
                                              </div>
                                            )}
                                            {parsed.fee !== undefined && (
                                              <div className="p-3 bg-theme-background rounded-lg">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                  Platform Fee:
                                                </div>
                                                <div className="text-base font-semibold text-theme-primary">
                                                  $
                                                  {(parsed.fee / 1e6).toFixed(
                                                    2
                                                  )}{" "}
                                                  USDC
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
                                          {log.metadata}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                {log.amount !== null &&
                                  log.amount !== undefined && (
                                    <div className="pt-2">
                                      <div className="text-xs text-muted-foreground mb-1.5">
                                        Amount:
                                      </div>
                                      <div className="text-lg font-semibold text-theme-primary">
                                        ${(log.amount / 1e6).toFixed(2)} USDC
                                      </div>
                                    </div>
                                  )}
                                {log.reason && (
                                  <div className="pt-2">
                                    <div className="text-xs text-muted-foreground mb-1.5">
                                      Reason:
                                    </div>
                                    <div className="text-sm text-theme-text-highlight">
                                      {log.reason}
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
                                        {log.target.toString()}
                                      </code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="shrink-0 h-7 w-7 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(
                                            `https://explorer.solana.com/address/${log.target.toString()}?cluster=devnet`,
                                            "_blank"
                                          );
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      {log.category === "admin"
                                        ? "Admin Address:"
                                        : "Actor Address:"}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <code className="px-2 py-1 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-primary flex-1 break-all">
                                        {log.actor.toString()}
                                      </code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="shrink-0 h-7 w-7 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(
                                            `https://explorer.solana.com/address/${log.actor.toString()}?cluster=devnet`,
                                            "_blank"
                                          );
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Log Account Address:
                                    </div>
                                    <code className="px-2 py-1 bg-theme-card-bg border border-theme-border rounded text-xs font-mono text-theme-text block break-all">
                                      {log.publicKey.toString()}
                                    </code>
                                  </div>
                                </div>
                                {/* Right Column */}
                                <div className="space-y-4 md:border-l md:border-theme-border md:pl-6">
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Category:
                                    </div>
                                    <div className="text-sm text-theme-text-highlight">
                                      {log.category === "admin"
                                        ? "Admin Action"
                                        : "User Activity"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                      Timestamp:
                                    </div>
                                    <div className="text-sm text-theme-text-highlight">
                                      {formatFullTimestamp(log.timestamp)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {formatTimestamp(log.timestamp)}
                                    </div>
                                  </div>

                                  <div className="pt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(
                                          `https://explorer.solana.com/address/${log.publicKey.toString()}?cluster=devnet`,
                                          "_blank"
                                        );
                                      }}
                                    >
                                      <ExternalLink className="h-3 w-3 mr-2" />
                                      View on Explorer
                                    </Button>
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
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
