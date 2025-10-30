"use client";

import { AlertTriangle, Grid3x3, List, Plus } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { PoolCard } from "@/components/pools/pool-card";
import { PoolCreationModal } from "@/components/pools/pool-creation-modal";
import { FilterDropdown } from "@/components/search/filter-dropdown";
import { SearchInput } from "@/components/search/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParticleSystem } from "@/components/ui/particle-system";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useNGO } from "@/hooks/use-ngo";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { usePools } from "@/hooks/use-pools";
import { useProgram } from "@/hooks/use-program";

export default function PoolsPage() {
  const { wallet } = useProgram();
  const { pools, loading } = usePools();
  const { config } = usePlatformConfig();
  const { ngo } = useNGO();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Only verified, active, non-blacklisted NGOs can create pools
  const canCreatePool = ngo?.isVerified && ngo?.isActive && !ngo?.isBlacklisted;

  const filteredPools = pools.filter((pool) => {
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

  // Wallet not connected - Show pools publicly with particle hero
  if (!wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col bg-theme-background">
        <Header />
        <main className="flex-1">
          {/* Particle Hero Section */}
          <section
            className="relative w-full bg-theme-background overflow-hidden border-b border-theme-border"
            style={{ height: "100vh" }}
          >
            <div className="absolute inset-0 z-0">
              <ParticleSystem text="Pools" />
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
                <Badge variant="secondary" className="text-lg px-4 py-2">
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
              ) : filteredPools.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col gap-3"
                  }
                >
                  {filteredPools.map((pool) => (
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

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Fund Pools</h1>
            <p className="text-muted-foreground mt-2">
              Disaster relief fund pools
            </p>
          </div>
          {canCreatePool && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Pool
            </Button>
          )}
        </div>

        {/* Create Pool Modal */}
        <PoolCreationModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SearchInput
            placeholder="Search by name, pool ID, or disaster..."
            onSearch={setSearchQuery}
            className="flex-1"
          />

          <FilterDropdown
            label="Status"
            options={[
              { value: "active", label: "Active" },
              { value: "closed", label: "Closed" },
            ]}
            selectedValues={statusFilters}
            onSelectionChange={setStatusFilters}
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
            {filteredPools.length}{" "}
            {filteredPools.length === 1 ? "result" : "results"}
          </Badge>
          {(searchQuery || statusFilters.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilters([]);
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
        ) : filteredPools.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-3"
            }
          >
            {filteredPools.map((pool) => (
              <PoolCard key={pool.publicKey.toBase58()} pool={pool} />
            ))}
          </div>
        ) : (
          <Card className="bg-theme-card-bg border-theme-border h-full">
            <CardHeader className="text-center py-12">
              <CardTitle className="text-lg font-semibold mb-2 text-theme-text-highlight">
                No fund pools found
              </CardTitle>
              <CardDescription className="text-theme-text/60 mb-4">
                {searchQuery || statusFilters.length > 0
                  ? "Try adjusting your filters"
                  : "Create the first fund pool"}
              </CardDescription>
              {canCreatePool && (
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setShowCreateModal(true)}>
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
