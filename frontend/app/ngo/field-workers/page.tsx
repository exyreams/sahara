"use client";

import { Grid3x3, List, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FieldWorkerCard } from "@/components/field-workers/field-worker-card";
import { FieldWorkerCreationModal } from "@/components/field-workers/field-worker-creation-modal";
import { FilterDropdown } from "@/components/search/filter-dropdown";
import { SearchInput } from "@/components/search/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParticleSystem } from "@/components/ui/particle-system";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loading = ngoLoading || workersLoading;

  const _handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (loading || isRefreshing) {
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      <div className="flex-1 flex -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20 -my-8">
        {/* Left Side - Particle Background (40%) */}
        <div className="hidden lg:flex lg:w-[40%] relative bg-linear-to-br from-theme-background to-theme-card-bg border-r border-theme-border">
          <div className="absolute inset-0">
            <ParticleSystem text="Ngo" />
          </div>
        </div>

        {/* Right Side - Content (60%) */}
        <div className="flex-1 lg:w-[60%] flex items-center justify-center px-6 py-16">
          <div className="max-w-xl w-full space-y-8">
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

  const ngoFieldWorkers = fieldWorkers.filter((fw) =>
    fw.ngo?.equals(ngo.publicKey),
  );

  // Filter field workers based on search and status
  const filteredWorkers = ngoFieldWorkers.filter((worker) => {
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

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Field Workers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's field workers
          </p>
        </div>
        <Button
          onClick={() => setShowRegisterModal(true)}
          disabled={!ngo.isVerified}
        >
          <Plus className="mr-2 h-4 w-4" />
          Register Field Worker
        </Button>
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
      <div className="flex flex-col md:flex-row gap-4 mb-6">
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

      {/* Results Count */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary">
          {filteredWorkers.length}{" "}
          {filteredWorkers.length === 1 ? "worker" : "workers"}
        </Badge>
      </div>

      {filteredWorkers.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredWorkers.map((worker) => (
            <FieldWorkerCard
              key={worker.publicKey.toBase58()}
              worker={worker}
              viewMode={viewMode}
              beneficiaries={beneficiaries}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-theme-card-bg border-theme-border">
          <CardHeader className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-theme-text/40" />
            </div>
            <CardTitle className="text-lg font-semibold mb-2 text-theme-text-highlight">
              {searchQuery || statusFilters.length > 0
                ? "No field workers found"
                : "No Field Workers"}
            </CardTitle>
            <CardDescription className="text-theme-text/60 mb-4">
              {searchQuery || statusFilters.length > 0
                ? "Try adjusting your filters"
                : ngo.isVerified
                  ? "Register your first field worker to start verifying beneficiaries"
                  : "Wait for NGO verification to register field workers"}
            </CardDescription>
            {ngo.isVerified && !searchQuery && statusFilters.length === 0 && (
              <div className="flex justify-center">
                <Button onClick={() => setShowRegisterModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Register Field Worker
                </Button>
              </div>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Registration Modal */}
      <FieldWorkerCreationModal
        open={showRegisterModal}
        onOpenChange={setShowRegisterModal}
      />
    </>
  );
}
