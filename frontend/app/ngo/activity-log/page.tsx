"use client";

import type { PublicKey } from "@solana/web3.js";
import {
  Calendar,
  ChevronDown,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { useNGO } from "@/hooks/use-ngo";

// Activity log entry type
interface ActivityLogEntry {
  publicKey: PublicKey;
  actionType: string;
  actor: PublicKey;
  target: PublicKey;
  amount?: number | null;
  timestamp: number;
  metadata?: string;
}

export default function NGOActivityLogPage() {
  const { ngo, loading: ngoLoading } = useNGO();
  const { fieldWorkers, loading: workersLoading } = useFieldWorkers();
  const { logs, loading: logsLoading, refetch } = useActivityLogs();

  const [searchQuery, setSearchQuery] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const itemsPerPage = 20;

  // Only show loading skeleton if we don't have data yet (first load)
  const loading =
    (ngoLoading && !ngo) ||
    (workersLoading && fieldWorkers.length === 0) ||
    (logsLoading && logs.length === 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Handle window resize for dynamic address truncation
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter logs related to this NGO
  const ngoLogs = useMemo<ActivityLogEntry[]>(() => {
    if (!ngo) return [];

    const filtered = logs.filter(
      (log) =>
        // Actions performed by the NGO authority (wallet)
        log.actor.equals(ngo.authority) ||
        // Actions targeting the NGO account
        log.target.equals(ngo.publicKey) ||
        // Actions performed by any of the NGO's field workers
        fieldWorkers.some(
          (fw) =>
            fw.ngo?.equals(ngo.publicKey) && log.actor.equals(fw.authority)
        )
    );

    // Create pseudo-logs for field worker registrations
    const fieldWorkerLogs = fieldWorkers
      .filter((fw) => fw.ngo?.equals(ngo.publicKey))
      .map((fw) => ({
        publicKey: fw.publicKey,
        actionType: "fieldWorkerRegistered",
        actor: fw.registeredBy,
        target: fw.publicKey,
        amount: null,
        timestamp: fw.registeredAt,
        metadata: fw.name,
      }));

    // Combine and sort by timestamp (newest first)
    return [...filtered, ...fieldWorkerLogs].sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }, [ngo, logs, fieldWorkers]);

  // Filter logs based on search and action type
  const filteredLogs = useMemo(() => {
    return ngoLogs.filter((log) => {
      // Search filter (by target or actor address)
      const matchesSearch =
        searchQuery === "" ||
        log.target
          .toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        log.actor.toString().toLowerCase().includes(searchQuery.toLowerCase());

      // Action type filter
      const matchesActionType =
        actionTypeFilter === "all" ||
        log.actionType.toLowerCase() === actionTypeFilter.toLowerCase();

      return matchesSearch && matchesActionType;
    });
  }, [ngoLogs, searchQuery, actionTypeFilter]);

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

    if (windowWidth >= 1536) {
      return `${address.slice(0, 16)}...${address.slice(-10)}`;
    } else if (windowWidth >= 1280) {
      return `${address.slice(0, 12)}...${address.slice(-8)}`;
    } else if (windowWidth >= 768) {
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format action type to be user-friendly
  const formatActionType = (actionType: string): string => {
    const actionMap: Record<string, string> = {
      fieldWorkerRegistered: "Registered Field Worker",
      fieldWorkerActivated: "Activated Field Worker",
      fieldWorkerDeactivated: "Deactivated Field Worker",
      beneficiaryRegistered: "Registered Beneficiary",
      beneficiaryVerified: "Verified Beneficiary",
      beneficiaryUpdated: "Updated Beneficiary",
      fundPoolCreated: "Created Fund Pool",
      fundPoolClosed: "Closed Fund Pool",
      fundsDistributed: "Distributed Funds",
      distributionClaimed: "Claimed Distribution",
      donationToPool: "Donation to Pool",
      directDonation: "Direct Donation",
      disasterCreated: "Created Disaster",
      disasterUpdated: "Updated Disaster",
      disasterClosed: "Closed Disaster",
    };

    return actionMap[actionType] || actionType;
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

  if (loading) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-theme-border rounded animate-pulse" />
            <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
          </div>
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
              {Array.from(
                { length: 5 },
                (_, i) => `activity-log-skeleton-${i}`
              ).map((key) => (
                <div
                  key={key}
                  className="border border-theme-border rounded-lg p-3 animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-4 bg-theme-border rounded shrink-0" />
                    <div className="h-6 w-36 bg-theme-border rounded shrink-0" />
                    <div className="flex items-center gap-3 flex-1 min-w-0 justify-center">
                      <div className="h-6 w-32 bg-theme-border rounded" />
                      <div className="h-4 w-4 bg-theme-border rounded shrink-0" />
                      <div className="h-6 w-32 bg-theme-border rounded" />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="h-4 w-24 bg-theme-border rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!ngo) {
    return (
      <div className="flex-1 flex -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20 -my-8">
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No NGO Registered</h2>
            <p className="text-muted-foreground mb-4">
              You need to register your NGO to view activity logs.
            </p>
            <Button asChild>
              <Link href="/ngo">Register NGO</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Activity Log</h1>
          <p className="text-muted-foreground mt-2">
            View all activities related to {ngo.name}
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button asChild variant="outline">
            <Link href="/ngo/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Activity Log */}
      <Card
        className={`transition-opacity duration-200 ${
          isRefreshing ? "opacity-50" : "opacity-100"
        }`}
      >
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
                disabled={isRefreshing}
              />
            </div>

            <Dropdown
              value={actionTypeFilter}
              onValueChange={(value) => {
                setActionTypeFilter(value);
                setCurrentPage(1);
              }}
              placeholder="Action Type"
              options={[
                { value: "all", label: "All Types" },
                {
                  value: "fieldWorkerRegistered",
                  label: "Field Worker Registered",
                },
                { value: "disasterCreated", label: "Disaster Created" },
                { value: "disasterUpdated", label: "Disaster Updated" },
                { value: "disasterClosed", label: "Disaster Closed" },
                { value: "fundPoolCreated", label: "Fund Pool Created" },
                { value: "fundPoolClosed", label: "Fund Pool Closed" },
                { value: "donationToPool", label: "Donation to Pool" },
                {
                  value: "beneficiaryRegistered",
                  label: "Beneficiary Registered",
                },
                {
                  value: "beneficiaryVerified",
                  label: "Beneficiary Verified",
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
                {searchQuery || actionTypeFilter !== "all"
                  ? "Try adjusting your filters to see more results"
                  : "Activities will appear here once they are performed"}
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
                        <Badge variant="default" className="shrink-0">
                          {formatActionType(log.actionType)}
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
                        variant="default"
                        className="hidden md:flex shrink-0 min-w-[180px] justify-center"
                      >
                        {formatActionType(log.actionType)}
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
                      </div>
                    </button>

                    {/* Expanded View */}
                    {isExpanded && (
                      <div className="border-t border-theme-border bg-[hsl(var(--input))] p-2">
                        <div className="bg-theme-background p-4 rounded-md">
                          {/* Action Summary */}
                          <div className="text-xs text-muted-foreground mb-1">
                            Activity:
                          </div>
                          <div className="mb-4 p-3 bg-theme-card-bg border border-theme-border rounded-lg">
                            <div className="text-sm text-theme-text-highlight font-medium">
                              <span className="text-theme-primary font-semibold">
                                {formatActionType(log.actionType)}
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
                            {log.metadata && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <span className="font-medium">Details:</span>{" "}
                                {log.metadata}
                              </div>
                            )}
                            {log.amount !== null &&
                              log.amount !== undefined && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <span className="font-medium">Amount:</span>{" "}
                                  {(log.amount / 1e6).toFixed(2)} USDC
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
                                        `https://explorer.solana.com/address/${log.target.toString()}?cluster=${
                                          process.env
                                            .NEXT_PUBLIC_SOLANA_NETWORK ||
                                          "devnet"
                                        }`,
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
                                  Actor Address:
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
                                        `https://explorer.solana.com/address/${log.actor.toString()}?cluster=${
                                          process.env
                                            .NEXT_PUBLIC_SOLANA_NETWORK ||
                                          "devnet"
                                        }`,
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
                                      `https://explorer.solana.com/address/${log.publicKey.toString()}?cluster=${
                                        process.env
                                          .NEXT_PUBLIC_SOLANA_NETWORK ||
                                        "devnet"
                                      }`,
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
                    )}
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
