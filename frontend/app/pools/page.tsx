"use client";

import { AlertTriangle, Grid3x3, List, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { PoolCard } from "@/components/pools/pool-card";
import { PoolCreationModal } from "@/components/pools/pool-creation-modal";
import { FilterDropdown } from "@/components/search/filter-dropdown";
import { SearchInput } from "@/components/search/search-input";
import { SortDropdown } from "@/components/search/sort-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GridBackground } from "@/components/ui/grid-background";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useAdmin } from "@/hooks/use-admin";
import { useNGO } from "@/hooks/use-ngo";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { usePools } from "@/hooks/use-pools";
import { useProgram } from "@/hooks/use-program";

export default function PoolsPage() {
  const { wallet } = useProgram();
  const { pools, loading, error, refetch: refetchPools } = usePools();
  const { config } = usePlatformConfig();
  const { ngo } = useNGO();
  const { isAdmin } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<
    | "newest"
    | "oldest"
    | "name-asc"
    | "name-desc"
    | "raised-high"
    | "raised-low"
  >("newest");

  // Only verified, active, non-blacklisted NGOs can create pools
  const canCreatePool = ngo?.isVerified && ngo?.isActive && !ngo?.isBlacklisted;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchPools();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Public view filtered and sorted pools
  const publicFilteredAndSortedPools = useMemo(() => {
    // Filter pools
    const filtered = pools.filter((pool) => {
      const matchesSearch =
        !searchQuery ||
        pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.poolId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.disasterId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilters.length === 0 ||
        (statusFilters.includes("active") && pool.isActive) ||
        (statusFilters.includes("closed") && !pool.isActive);

      return matchesSearch && matchesStatus;
    });

    // Sort pools
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "raised-high":
          return b.totalDeposited - a.totalDeposited;
        case "raised-low":
          return a.totalDeposited - b.totalDeposited;
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return sorted;
  }, [pools, searchQuery, statusFilters, sortBy]);

  // Authenticated view filtered and sorted pools
  const filteredAndSortedPools = useMemo(() => {
    // Filter pools
    const filtered = pools.filter((pool) => {
      const matchesSearch =
        !searchQuery ||
        pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.poolId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.disasterId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilters.length === 0 ||
        (statusFilters.includes("active") && pool.isActive) ||
        (statusFilters.includes("closed") && !pool.isActive);

      const matchesOwner =
        ownerFilter === "all" ||
        (ownerFilter === "mine" &&
          wallet.publicKey &&
          pool.authority.equals(wallet.publicKey));

      return matchesSearch && matchesStatus && matchesOwner;
    });

    // Sort pools
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "raised-high":
          return b.totalDeposited - a.totalDeposited;
        case "raised-low":
          return a.totalDeposited - b.totalDeposited;
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return sorted;
  }, [
    pools,
    searchQuery,
    statusFilters,
    ownerFilter,
    wallet.publicKey,
    sortBy,
  ]);

  // Wallet not connected - Show pools publicly with particle hero
  if (!wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col bg-theme-background">
        <Header />
        <main className="flex-1">
          {/* Particle Hero Section - Full Width */}
          <div className="-mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20 -mt-20">
            <section
              className="relative w-full bg-theme-background overflow-hidden border-b border-theme-border"
              style={{ height: "100vh" }}
            >
              <div className="absolute inset-0 z-0">
                <GridBackground />
              </div>

              <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center pointer-events-none">
                <div className="flex-1" />

                <div className="max-w-3xl mx-auto text-center space-y-6 pb-16 pointer-events-auto">
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                    Fund Pools
                  </h1>
                  <p className="text-lg md:text-xl text-theme-text max-w-2xl mx-auto">
                    Transparent disaster relief fund pools on the blockchain.
                    Track donations, distributions, and ensure every dollar
                    reaches those in need.
                  </p>
                  <div className="flex flex-col items-center gap-4 pt-6">
                    <div className="scale-110">
                      <WalletButton />
                    </div>
                    <p className="text-sm text-theme-text/80">
                      Connect your wallet to take action
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Active Pools Section */}
          <section className="py-16 bg-theme-bg">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-theme-text-highlight">
                    Active Pools
                  </h2>
                  <p className="text-theme-text/60 mt-2">
                    View ongoing disaster relief fund pools
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {pools.filter((p) => p.isActive).length} Active
                </Badge>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1">
                  <SearchInput
                    onSearch={setSearchQuery}
                    placeholder="Search by name, pool ID, or disaster..."
                  />
                </div>
                <FilterDropdown
                  label="Status"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "closed", label: "Closed" },
                  ]}
                  selectedValues={statusFilters}
                  onSelectionChange={setStatusFilters}
                />
                <SortDropdown
                  label="Sort By"
                  options={[
                    { value: "newest", label: "Newest First" },
                    { value: "oldest", label: "Oldest First" },
                    { value: "name-asc", label: "Name (A-Z)" },
                    { value: "name-desc", label: "Name (Z-A)" },
                    { value: "raised-high", label: "Most Raised" },
                    { value: "raised-low", label: "Least Raised" },
                  ]}
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as typeof sortBy)}
                />
                <div className="flex gap-1 border border-theme-border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="px-3"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => {
                    const uniqueId = `pool-skeleton-${Date.now()}-${i}`;
                    return (
                      <Card
                        key={uniqueId}
                        className="bg-theme-card-bg border-theme-border"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                                <div className="h-5 w-16 bg-theme-border rounded-full animate-pulse" />
                              </div>
                              <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                            </div>
                          </div>
                        </CardHeader>
                        <div className="px-6 pb-6 space-y-4">
                          <div className="space-y-2">
                            <div className="h-3 w-full bg-theme-border rounded animate-pulse" />
                            <div className="h-3 w-3/4 bg-theme-border rounded animate-pulse" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                              <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 w-20 bg-theme-border rounded animate-pulse" />
                              <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-2 w-full bg-theme-border rounded-full animate-pulse" />
                            <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="h-4 w-28 bg-theme-border rounded animate-pulse" />
                            <div className="h-4 w-20 bg-theme-border rounded animate-pulse" />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                            <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : publicFilteredAndSortedPools.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col gap-3"
                  }
                >
                  {publicFilteredAndSortedPools.map((pool) => (
                    <PoolCard key={pool.publicKey.toBase58()} pool={pool} />
                  ))}
                </div>
              ) : (
                <Card className="bg-theme-card-bg border-theme-border h-full">
                  <CardHeader className="text-center py-12">
                    <CardTitle className="text-lg font-semibold mb-2 text-theme-text-highlight">
                      No fund pools found
                    </CardTitle>
                    <CardDescription className="text-theme-text/60">
                      {searchQuery || statusFilters.length > 0
                        ? "Try adjusting your filters"
                        : "No pools available yet"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Wallet connected - Show full interface
  return (
    <div className="min-h-screen flex flex-col bg-theme-bg">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
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

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Loading Pools
              </CardTitle>
              <CardDescription className="text-red-600/90">
                {error.message}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Fund Pools</h1>
            <p className="text-muted-foreground mt-2">
              Disaster relief fund pools
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            {canCreatePool && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Pool
              </Button>
            )}
          </div>
        </div>

        {/* Create Pool Modal */}
        <PoolCreationModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={() => {
            setShowCreateModal(false);
          }}
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SearchInput
            placeholder="Search by name, pool ID, or disaster..."
            onSearch={setSearchQuery}
            className="flex-1"
          />

          {(isAdmin || ngo) && (
            <div className="flex gap-1 border border-theme-border rounded-lg p-1">
              <Button
                variant={ownerFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setOwnerFilter("all")}
                className="px-4"
              >
                All
              </Button>
              <Button
                variant={ownerFilter === "mine" ? "default" : "ghost"}
                size="sm"
                onClick={() => setOwnerFilter("mine")}
                className="px-4"
              >
                Mine
              </Button>
            </div>
          )}

          <FilterDropdown
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "closed", label: "Closed" },
            ]}
            selectedValues={statusFilters}
            onSelectionChange={setStatusFilters}
          />

          <SortDropdown
            label="Sort By"
            options={[
              { value: "newest", label: "Newest First" },
              { value: "oldest", label: "Oldest First" },
              { value: "name-asc", label: "Name (A-Z)" },
              { value: "name-desc", label: "Name (Z-A)" },
              { value: "raised-high", label: "Most Raised" },
              { value: "raised-low", label: "Least Raised" },
            ]}
            value={sortBy}
            onValueChange={(value) => setSortBy(value as typeof sortBy)}
          />

          <div className="flex gap-1 border border-theme-border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="px-3"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary">
            {filteredAndSortedPools.length}{" "}
            {filteredAndSortedPools.length === 1 ? "result" : "results"}
          </Badge>
          {(searchQuery ||
            statusFilters.length > 0 ||
            ownerFilter === "mine") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilters([]);
                setOwnerFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => {
              const uniqueId = `pool-skeleton-${Date.now()}-${i}`;
              return (
                <Card
                  key={uniqueId}
                  className="bg-theme-card-bg border-theme-border"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                          <div className="h-5 w-16 bg-theme-border rounded-full animate-pulse" />
                        </div>
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      </div>
                    </div>
                  </CardHeader>
                  <div className="px-6 pb-6 space-y-4">
                    {/* Description skeleton */}
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-theme-border rounded animate-pulse" />
                      <div className="h-3 w-3/4 bg-theme-border rounded animate-pulse" />
                    </div>

                    {/* Statistics skeleton */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                        <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-20 bg-theme-border rounded animate-pulse" />
                        <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                      </div>
                    </div>

                    {/* Progress bar skeleton */}
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-theme-border rounded-full animate-pulse" />
                      <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                    </div>

                    {/* Beneficiaries/Donors skeleton */}
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-28 bg-theme-border rounded animate-pulse" />
                      <div className="h-4 w-20 bg-theme-border rounded animate-pulse" />
                    </div>

                    {/* Footer skeleton */}
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                      <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : filteredAndSortedPools.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-3"
            }
          >
            {filteredAndSortedPools.map((pool) => (
              <PoolCard key={pool.publicKey.toBase58()} pool={pool} />
            ))}
          </div>
        ) : (
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="text-center py-32">
              <CardTitle className="text-2xl font-semibold mb-3 text-theme-text-highlight">
                {ownerFilter === "mine"
                  ? "You haven't created any pools"
                  : "No fund pools found"}
              </CardTitle>
              <CardDescription className="text-lg text-theme-text/60 mb-6">
                {ownerFilter === "mine"
                  ? "Create your first pool to get started"
                  : searchQuery || statusFilters.length > 0
                    ? "Try adjusting your filters"
                    : "Create the first fund pool"}
              </CardDescription>
              {canCreatePool && (
                <div className="flex justify-center mt-6">
                  <Button onClick={() => setShowCreateModal(true)} size="lg">
                    Create Pool
                  </Button>
                </div>
              )}
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
