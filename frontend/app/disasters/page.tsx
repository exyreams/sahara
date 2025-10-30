"use client";

import { AlertTriangle, Grid3x3, List, Plus } from "lucide-react";
import { useState } from "react";
import { DisasterCard } from "@/components/disasters/disaster-card";
import { DisasterCreationModal } from "@/components/disasters/disaster-creation-modal";
import { Header } from "@/components/layout/header";
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
import { useAdmin } from "@/hooks/use-admin";
import { useDisasters } from "@/hooks/use-disasters";
import { useNGO } from "@/hooks/use-ngo";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { DISASTER_TYPES } from "@/lib/constants";

export default function DisastersPage() {
  const { wallet } = useProgram();
  const { isAdmin } = useAdmin();
  const { ngo } = useNGO();
  const { disasters, loading } = useDisasters();
  const { config } = usePlatformConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Check if user can create disasters (admin or verified NGO)
  const canCreateDisaster =
    isAdmin || (ngo?.isVerified && ngo?.isActive && !ngo?.isBlacklisted);

  const filteredDisasters = disasters.filter((disaster) => {
    const matchesSearch =
      !searchQuery ||
      disaster.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      disaster.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      disaster.location.district
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilters.length === 0 ||
      (statusFilters.includes("active") && disaster.isActive) ||
      (statusFilters.includes("closed") && !disaster.isActive);

    const matchesType =
      typeFilters.length === 0 || typeFilters.includes(disaster.eventType);

    return matchesSearch && matchesStatus && matchesType;
  });

  // Wallet not connected - Show disasters publicly with particle hero
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
              <ParticleSystem text="Disasters" />
            </div>

            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center pointer-events-none">
              <div className="flex-1" />

              <div className="max-w-3xl mx-auto text-center space-y-6 pb-16 pointer-events-auto">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                  Disaster Relief Platform
                </h1>
                <p className="text-lg md:text-xl text-theme-text max-w-2xl mx-auto">
                  Track disaster events, coordinate relief efforts, and ensure
                  transparent aid distribution on the blockchain.
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

          {/* Active Disasters Section */}
          <section className="container mx-auto px-4 py-16">
            {loading ? (
              <div className="space-y-8 animate-pulse">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-8 bg-theme-border rounded w-64" />
                    <div className="h-4 bg-theme-border rounded w-48" />
                  </div>
                  <div className="h-6 w-20 bg-theme-border rounded" />
                </div>
                {/* Filters skeleton */}
                <div className="flex gap-4">
                  <div className="h-10 bg-theme-border rounded flex-1" />
                  <div className="h-10 bg-theme-border rounded w-32" />
                  <div className="h-10 bg-theme-border rounded w-32" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-theme-text-highlight">
                    Active Disasters
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    View ongoing disaster relief efforts
                  </p>
                </div>
                <Badge variant="secondary">
                  {disasters.filter((d) => d.isActive).length} Active
                </Badge>
              </div>
            )}

            {/* Filters */}
            {!loading && (
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <SearchInput
                  placeholder="Search by name, ID, or location..."
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

                <FilterDropdown
                  label="Type"
                  options={DISASTER_TYPES.map((type) => ({
                    value: type.value,
                    label: type.label,
                  }))}
                  selectedValues={typeFilters}
                  onSelectionChange={setTypeFilters}
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
            )}

            {/* Results count */}
            {!loading && (
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  {filteredDisasters.length}{" "}
                  {filteredDisasters.length === 1 ? "result" : "results"}
                </Badge>
                {(searchQuery ||
                  statusFilters.length > 0 ||
                  typeFilters.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilters([]);
                      setTypeFilters([]);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {/* Disasters grid */}
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => {
                  const uniqueId = `disaster-skeleton-${Date.now()}-${i}`;
                  return (
                    <div
                      key={uniqueId}
                      className="h-64 bg-theme-card-bg border border-theme-border rounded-lg p-6 animate-pulse"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-5 bg-theme-border rounded w-2/3" />
                              <div className="h-6 w-16 bg-theme-border rounded" />
                            </div>
                            <div className="h-4 bg-theme-border rounded w-1/2" />
                          </div>
                          <div className="h-6 w-16 bg-theme-border rounded shrink-0" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-theme-border rounded w-1/3" />
                          <div className="h-4 bg-theme-border rounded w-1/4" />
                        </div>
                        <div className="h-4 bg-theme-border rounded w-1/2" />
                        <div className="space-y-2">
                          <div className="h-3 bg-theme-border rounded w-full" />
                          <div className="h-3 bg-theme-border rounded w-5/6" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-6 w-16 bg-theme-border rounded" />
                          <div className="h-6 w-20 bg-theme-border rounded" />
                          <div className="h-6 w-14 bg-theme-border rounded" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : filteredDisasters.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    : "flex flex-col gap-3"
                }
              >
                {filteredDisasters.map((disaster) => (
                  <DisasterCard
                    key={disaster.publicKey.toBase58()}
                    disaster={disaster}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center min-h-64 border rounded-lg border-theme-border bg-theme-card-bg">
                <h3 className="text-lg font-semibold mb-2">
                  No disasters found
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ||
                  statusFilters.length > 0 ||
                  typeFilters.length > 0
                    ? "Try adjusting your filters"
                    : "No disaster events have been created yet"}
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
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
            <h1 className="text-4xl font-bold tracking-tight">
              Disaster Events
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage disaster relief efforts
            </p>
          </div>
          {canCreateDisaster && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Disaster
            </Button>
          )}
        </div>

        {/* Create Disaster Modal */}
        <DisasterCreationModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SearchInput
            placeholder="Search by name, ID, or location..."
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

          <FilterDropdown
            label="Type"
            options={DISASTER_TYPES.map((type) => ({
              value: type.value,
              label: type.label,
            }))}
            selectedValues={typeFilters}
            onSelectionChange={setTypeFilters}
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
            {filteredDisasters.length}{" "}
            {filteredDisasters.length === 1 ? "result" : "results"}
          </Badge>
          {(searchQuery ||
            statusFilters.length > 0 ||
            typeFilters.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilters([]);
                setTypeFilters([]);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Disasters grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => {
              const uniqueId = `disaster-skeleton-${Date.now()}-${i}`;
              return (
                <div
                  key={uniqueId}
                  className="h-64 bg-theme-card-bg border border-theme-border rounded-lg p-6 animate-pulse"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        {/* Title with severity badge */}
                        <div className="flex items-center gap-2">
                          <div className="h-5 bg-theme-border rounded w-2/3" />
                          <div className="h-6 w-16 bg-theme-border rounded" />
                        </div>
                        {/* Location */}
                        <div className="h-4 bg-theme-border rounded w-1/2" />
                      </div>
                      {/* Active/Closed badge */}
                      <div className="h-6 w-16 bg-theme-border rounded shrink-0" />
                    </div>
                    {/* Stats */}
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-theme-border rounded w-1/3" />
                      <div className="h-4 bg-theme-border rounded w-1/4" />
                    </div>
                    {/* Type */}
                    <div className="h-4 bg-theme-border rounded w-1/2" />
                    {/* Description */}
                    <div className="space-y-2">
                      <div className="h-3 bg-theme-border rounded w-full" />
                      <div className="h-3 bg-theme-border rounded w-5/6" />
                    </div>
                    {/* Tags */}
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-theme-border rounded" />
                      <div className="h-6 w-20 bg-theme-border rounded" />
                      <div className="h-6 w-14 bg-theme-border rounded" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : filteredDisasters.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-3"
            }
          >
            {filteredDisasters.map((disaster) => (
              <DisasterCard
                key={disaster.publicKey.toBase58()}
                disaster={disaster}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center min-h-64 border border-theme-border rounded-lg bg-theme-card-bg">
            <h3 className="text-lg font-semibold mb-2">No disasters found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilters.length > 0 || typeFilters.length > 0
                ? "Try adjusting your filters"
                : "No disaster events have been created yet"}
            </p>
            {canCreateDisaster && (
              <Button onClick={() => setShowCreateModal(true)}>
                Create First Disaster
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
