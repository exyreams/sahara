"use client";

import {
  Clock,
  Grid3x3,
  List,
  Plus,
  RefreshCw,
  Table,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FieldWorkerCard } from "@/components/field-workers/field-worker-card";
import { FieldWorkerCreationModal } from "@/components/field-workers/field-worker-creation-modal";
import { FieldWorkerTable } from "@/components/field-workers/field-worker-table";
import { FieldWorkerTimeline } from "@/components/field-workers/field-worker-timeline";
import { FilterDropdown } from "@/components/search/filter-dropdown";
import { SearchInput } from "@/components/search/search-input";
import { SortDropdown } from "@/components/search/sort-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GridBackground } from "@/components/ui/grid-background";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { useNGO } from "@/hooks/use-ngo";

export default function FieldWorkersPage() {
  const { ngo, loading: ngoLoading } = useNGO();
  const { fieldWorkers, loading: workersLoading, refetch } = useFieldWorkers();
  const { beneficiaries } = useBeneficiaries();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<
    "grid" | "list" | "table" | "timeline"
  >("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "name-asc" | "name-desc"
  >("newest");

  const loading = ngoLoading || workersLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Get NGO field workers
  const ngoFieldWorkers = useMemo(() => {
    if (!ngo) return [];
    return fieldWorkers.filter((fw) => fw.ngo?.equals(ngo.publicKey));
  }, [fieldWorkers, ngo]);

  // Filter and sort field workers
  const filteredAndSortedWorkers = useMemo(() => {
    // Filter field workers based on search and status
    const filtered = ngoFieldWorkers.filter((worker) => {
      const matchesSearch =
        !searchQuery ||
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilters.length === 0 ||
        (statusFilters.includes("active") && worker.isActive) ||
        (statusFilters.includes("inactive") && !worker.isActive);

      return matchesSearch && matchesStatus;
    });

    // Sort field workers
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.registeredAt - a.registeredAt;
        case "oldest":
          return a.registeredAt - b.registeredAt;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return b.registeredAt - a.registeredAt;
      }
    });

    return sorted;
  }, [ngoFieldWorkers, searchQuery, statusFilters, sortBy]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-theme-border rounded animate-pulse" />
            <div className="h-10 w-48 bg-theme-border rounded animate-pulse" />
          </div>
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-theme-border rounded animate-pulse" />
          <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />
          <div className="h-10 w-24 bg-theme-border rounded animate-pulse" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from(
            { length: 6 },
            (_, i) => `field-worker-card-skeleton-${i}`,
          ).map((key) => (
            <Card key={key} className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                    <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-theme-border rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-theme-border rounded animate-pulse" />
                <div className="pt-2 border-t border-theme-border">
                  <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                </div>
                <div className="pt-2">
                  <div className="h-3 w-16 bg-theme-border rounded animate-pulse mb-1" />
                  <div className="flex gap-1">
                    <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                    <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                    <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!ngo) {
    return (
      <div className="flex-1 relative -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20 -my-8">
        {/* Full-screen Grid Background */}
        <div className="absolute inset-0">
          <GridBackground />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex items-center justify-center px-6 py-16 min-h-full">
          <div className="max-w-2xl w-full space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-theme-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-theme-text-highlight">
                  NGO Not Registered
                </h1>
              </div>
              <p className="text-lg text-theme-text">
                Register your NGO first to manage field workers.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-theme-text-highlight">
                Get Started in 3 Steps
              </h2>
              <div className="space-y-3">
                <div className="flex gap-4 items-start">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-theme-text">
                      Register your NGO with official documentation
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-theme-text">
                      Wait for platform administrator verification
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-theme-text">
                      Access your dashboard to manage field workers and
                      coordinate relief efforts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-4">
              <Button size="lg" className="w-full text-base" asChild>
                <Link href="/ngo">Go to NGO Portal</Link>
              </Button>

              {/* Additional Help */}
              <p className="text-sm text-center text-theme-text/80">
                Need help?{" "}
                <Link
                  href="/docs"
                  className="text-theme-primary hover:underline font-medium"
                >
                  View Documentation
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Field Workers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your organization's field workers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs px-3 py-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
          <Button
            onClick={() => setShowRegisterModal(true)}
            disabled={!ngo.isVerified}
            size="sm"
            className="text-xs px-3 py-1.5"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Register Field Worker
          </Button>
        </div>
      </div>

      {!ngo.isVerified && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-yellow-600">NGO Not Verified</CardTitle>
            <CardDescription>
              Your NGO must be verified by platform admin before you can
              register field workers.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Search and Filters */}
      <div
        className={`flex flex-col md:flex-row gap-3 mb-4 transition-opacity duration-200 ${
          isRefreshing ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        <SearchInput
          placeholder="Search by name, organization, or email..."
          onSearch={setSearchQuery}
          className="flex-1"
        />
        <FilterDropdown
          label="Status"
          options={statusOptions}
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
          ]}
          value={sortBy}
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
          className="hover:[&_span]:text-black! hover:[&_span]:dark:text-black!"
        />
        <div className="flex gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="gap-1.5 text-xs px-3 py-1.5"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-1.5 text-xs px-3 py-1.5"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-1.5 text-xs px-3 py-1.5"
          >
            <Table className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("timeline")}
            className="gap-1.5 text-xs px-3 py-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div
        className={`flex items-center gap-2 mb-3 transition-opacity duration-200 ${
          isRefreshing ? "opacity-50" : "opacity-100"
        }`}
      >
        <Badge variant="secondary">
          {filteredAndSortedWorkers.length}{" "}
          {filteredAndSortedWorkers.length === 1 ? "worker" : "workers"}
        </Badge>
      </div>

      <div
        className={`transition-opacity duration-200 ${
          isRefreshing ? "opacity-50" : "opacity-100"
        }`}
      >
        {filteredAndSortedWorkers.length > 0 ? (
          <>
            {viewMode === "grid" && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedWorkers.map((worker) => (
                  <FieldWorkerCard
                    key={worker.publicKey.toBase58()}
                    worker={worker}
                    viewMode="grid"
                    beneficiaries={beneficiaries}
                  />
                ))}
              </div>
            )}
            {viewMode === "list" && (
              <div className="flex flex-col gap-2">
                {filteredAndSortedWorkers.map((worker) => (
                  <FieldWorkerCard
                    key={worker.publicKey.toBase58()}
                    worker={worker}
                    viewMode="list"
                    beneficiaries={beneficiaries}
                  />
                ))}
              </div>
            )}
            {viewMode === "table" && (
              <FieldWorkerTable
                workers={filteredAndSortedWorkers}
                beneficiaries={beneficiaries}
              />
            )}
            {viewMode === "timeline" && (
              <FieldWorkerTimeline
                workers={filteredAndSortedWorkers}
                beneficiaries={beneficiaries}
              />
            )}
          </>
        ) : (
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="text-center py-16">
              <div className="flex justify-center mb-3">
                <Users className="h-8 w-8 text-theme-text/40" />
              </div>
              <CardTitle className="text-base font-semibold mb-2 text-theme-text-highlight">
                {searchQuery || statusFilters.length > 0
                  ? "No field workers found"
                  : "No Field Workers"}
              </CardTitle>
              <CardDescription className="text-sm text-theme-text/60 mb-4">
                {searchQuery || statusFilters.length > 0
                  ? "Try adjusting your filters"
                  : ngo.isVerified
                    ? "Register your first field worker to start verifying beneficiaries"
                    : "Wait for NGO verification to register field workers"}
              </CardDescription>
              {ngo.isVerified && !searchQuery && statusFilters.length === 0 && (
                <div className="flex justify-center">
                  <Button onClick={() => setShowRegisterModal(true)} size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Register Field Worker
                  </Button>
                </div>
              )}
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Registration Modal */}
      <FieldWorkerCreationModal
        open={showRegisterModal}
        onOpenChange={setShowRegisterModal}
        onSuccess={() => {
          setShowRegisterModal(false);
        }}
      />
    </>
  );
}
