"use client";

import {
  AlertTriangle,
  Clock,
  Grid3x3,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Table,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BeneficiaryRegistrationModal } from "@/components/beneficiaries/beneficiary-registration-modal";
import { BeneficiaryTable } from "@/components/beneficiaries/beneficiary-table";
import { BeneficiaryTimeline } from "@/components/beneficiaries/beneficiary-timeline";
import { Header } from "@/components/layout/header";
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
import { WalletButton } from "@/components/wallet/wallet-button";
import { useAdmin } from "@/hooks/use-admin";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useFieldWorker } from "@/hooks/use-field-worker";
import { useNGO } from "@/hooks/use-ngo";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { VERIFICATION_STATUSES, VERIFICATION_THRESHOLD } from "@/lib/constants";
import { formatDate, formatVerificationStatus } from "@/lib/formatters";

export default function BeneficiariesPage() {
  const {
    beneficiaries,
    loading,
    refetch: refetchBeneficiaries,
  } = useBeneficiaries();
  const { config } = usePlatformConfig();
  const { wallet } = useProgram();
  const { isAdmin } = useAdmin();
  const { ngo } = useNGO();
  const { isFieldWorker } = useFieldWorker();

  // Get verification threshold from platform config, fallback to constant
  const verificationThreshold =
    config?.verificationThreshold || VERIFICATION_THRESHOLD;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<
    "grid" | "list" | "table" | "timeline"
  >("grid");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all");
  const [sortBy, setSortBy] = useState<
    | "newest"
    | "oldest"
    | "name-asc"
    | "name-desc"
    | "severity-high"
    | "severity-low"
  >("newest");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchBeneficiaries();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const filteredAndSortedBeneficiaries = useMemo(() => {
    // Filter beneficiaries
    const filtered = beneficiaries.filter((beneficiary) => {
      const matchesSearch =
        !searchQuery ||
        beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.disasterId
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (beneficiary.location.district || beneficiary.location.region)
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilters.length === 0 ||
        statusFilters.includes(beneficiary.verificationStatus);

      const matchesOwner =
        ownerFilter === "all" ||
        (ownerFilter === "mine" &&
          wallet.publicKey &&
          beneficiary.registeredBy.equals(wallet.publicKey));

      return matchesSearch && matchesStatus && matchesOwner;
    });

    // Sort beneficiaries
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
        case "severity-high":
          return b.damageSeverity - a.damageSeverity;
        case "severity-low":
          return a.damageSeverity - b.damageSeverity;
        default:
          return b.registeredAt - a.registeredAt;
      }
    });

    return sorted;
  }, [
    beneficiaries,
    searchQuery,
    statusFilters,
    ownerFilter,
    wallet.publicKey,
    sortBy,
  ]);

  // Wallet not connected - Show particle hero
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

              <div className="relative z-10 container mx-auto px-4 h-full flex flex-col pointer-events-none">
                {/* Top spacer */}
                <div className="flex-1" />

                {/* Main content centered */}
                <div className="max-w-2xl mx-auto text-center space-y-4 pointer-events-auto">
                  <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-theme-text-highlight">
                    Beneficiaries
                  </h1>
                  <p className="text-base md:text-lg text-theme-text max-w-xl mx-auto">
                    Verified disaster victims receiving direct aid through
                    blockchain transparency. Every beneficiary is verified by
                    field workers to ensure aid reaches those who need it most.
                  </p>

                  {/* Wallet connection below text */}
                  <div className="flex flex-col items-center gap-3 pt-4">
                    <WalletButton />
                    <p className="text-xs text-theme-text/80">
                      Connect your wallet to register or view details
                    </p>
                  </div>
                </div>

                {/* Bottom spacer */}
                <div className="flex-1" />
              </div>
            </section>
          </div>

          {/* Beneficiaries List Section */}
          <section className="py-12 bg-theme-bg">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-theme-text-highlight">
                    Registered Beneficiaries
                  </h2>
                  <p className="text-theme-text/60 mt-1 text-sm">
                    View verified disaster victims
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {
                    beneficiaries.filter(
                      (b) => b.verificationStatus === "Verified",
                    ).length
                  }{" "}
                  Verified
                </Badge>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <SearchInput
                  placeholder="Search by name, disaster, or location..."
                  onSearch={setSearchQuery}
                  className="flex-1"
                />
                <FilterDropdown
                  label="Status"
                  options={VERIFICATION_STATUSES.map((status) => ({
                    value: status.value,
                    label: status.label,
                  }))}
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
                    { value: "severity-high", label: "Severity (High)" },
                    { value: "severity-low", label: "Severity (Low)" },
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

              {loading && beneficiaries.length === 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => {
                    const uniqueId = `beneficiary-skeleton-${Date.now()}-${i}`;
                    return (
                      <Card
                        key={uniqueId}
                        className="bg-theme-card-bg border-theme-border"
                      >
                        <CardHeader>
                          <div className="space-y-2">
                            <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                            <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : filteredAndSortedBeneficiaries.length > 0 ? (
                <>
                  {viewMode === "grid" && (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {filteredAndSortedBeneficiaries.map((beneficiary) => (
                        <Link
                          key={beneficiary.publicKey.toBase58()}
                          href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                        >
                          <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 space-y-1">
                                  <CardTitle className="text-base text-theme-primary group-hover:text-theme-primary transition-colors">
                                    {beneficiary.name}
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-1 text-xs">
                                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                                    {beneficiary.location.city ||
                                      beneficiary.location.region ||
                                      beneficiary.location.district}
                                    ,{" "}
                                    {beneficiary.location.area ||
                                      beneficiary.location.ward}
                                  </CardDescription>
                                </div>
                                <Badge
                                  variant={
                                    formatVerificationStatus(
                                      beneficiary.verificationStatus,
                                    ) === "Verified"
                                      ? "default"
                                      : formatVerificationStatus(
                                            beneficiary.verificationStatus,
                                          ) === "Flagged"
                                        ? "outline"
                                        : formatVerificationStatus(
                                              beneficiary.verificationStatus,
                                            ) === "Rejected"
                                          ? "outline"
                                          : "pending"
                                  }
                                  className={`shrink-0 ${
                                    formatVerificationStatus(
                                      beneficiary.verificationStatus,
                                    ) === "Flagged"
                                      ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                      : formatVerificationStatus(
                                            beneficiary.verificationStatus,
                                          ) === "Rejected"
                                        ? "border-red-500 text-red-500 bg-red-500/10"
                                        : ""
                                  }`}
                                >
                                  {formatVerificationStatus(
                                    beneficiary.verificationStatus,
                                  )}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent
                              className={
                                viewMode === "grid"
                                  ? "space-y-2"
                                  : "flex items-center gap-6 flex-wrap"
                              }
                            >
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-theme-text/60">
                                  Disaster:
                                </span>
                                <span className="font-medium text-theme-text">
                                  {beneficiary.disasterId}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-theme-text/60">
                                  Family Size:
                                </span>
                                <span className="font-medium flex items-center gap-1 text-theme-text">
                                  <Users className="h-3 w-3" />
                                  {beneficiary.familySize}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-theme-text/60">
                                  Damage Severity:
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    beneficiary.damageSeverity >= 8
                                      ? "border-red-500 text-red-500 bg-red-500/10"
                                      : beneficiary.damageSeverity >= 6
                                        ? "border-orange-500 text-orange-500 bg-orange-500/10"
                                        : beneficiary.damageSeverity >= 4
                                          ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                          : "border-green-500 text-green-500 bg-green-500/10"
                                  }
                                >
                                  {beneficiary.damageSeverity >= 8
                                    ? "Critical"
                                    : beneficiary.damageSeverity >= 6
                                      ? "Severe"
                                      : beneficiary.damageSeverity >= 4
                                        ? "Moderate"
                                        : "Minor"}{" "}
                                  ({beneficiary.damageSeverity}/10)
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-theme-text/60">
                                  Approvals:
                                </span>
                                <span className="font-medium text-theme-text">
                                  {beneficiary.verifierApprovals.length}/
                                  {verificationThreshold}
                                </span>
                              </div>
                              {viewMode === "grid" && (
                                <div className="text-xs text-theme-text/60 pt-2 border-t border-theme-border">
                                  Registered{" "}
                                  {formatDate(beneficiary.registeredAt)}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                  {viewMode === "list" && (
                    <div className="flex flex-col gap-2">
                      {filteredAndSortedBeneficiaries.map((beneficiary) => (
                        <Link
                          key={beneficiary.publicKey.toBase58()}
                          href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                        >
                          <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer bg-theme-card-bg border-theme-border">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base font-semibold text-theme-primary group-hover:text-theme-primary transition-colors">
                                      {beneficiary.name}
                                    </h3>
                                    <Badge
                                      variant={
                                        formatVerificationStatus(
                                          beneficiary.verificationStatus,
                                        ) === "Verified"
                                          ? "default"
                                          : formatVerificationStatus(
                                                beneficiary.verificationStatus,
                                              ) === "Flagged"
                                            ? "outline"
                                            : formatVerificationStatus(
                                                  beneficiary.verificationStatus,
                                                ) === "Rejected"
                                              ? "outline"
                                              : "pending"
                                      }
                                      className={`shrink-0 text-xs px-2 py-0.5 ${
                                        formatVerificationStatus(
                                          beneficiary.verificationStatus,
                                        ) === "Flagged"
                                          ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                          : formatVerificationStatus(
                                                beneficiary.verificationStatus,
                                              ) === "Rejected"
                                            ? "border-red-500 text-red-500 bg-red-500/10"
                                            : ""
                                      }`}
                                    >
                                      {formatVerificationStatus(
                                        beneficiary.verificationStatus,
                                      )}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-theme-text/60">
                                    <MapPin className="h-2.5 w-2.5" />
                                    {beneficiary.location.district ||
                                      beneficiary.location.region}
                                    ,{" "}
                                    {beneficiary.location.ward ||
                                      beneficiary.location.area}
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 text-xs shrink-0 ml-4">
                                  <div className="text-center">
                                    <div className="text-theme-text/60">
                                      Disaster
                                    </div>
                                    <div className="font-semibold text-theme-text">
                                      {beneficiary.disasterId}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-theme-text/60">
                                      Family
                                    </div>
                                    <div className="font-semibold text-theme-text flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {beneficiary.familySize}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-theme-text/60">
                                      Approvals
                                    </div>
                                    <div className="font-semibold text-theme-text">
                                      {beneficiary.verifierApprovals.length}/
                                      {verificationThreshold}
                                    </div>
                                  </div>
                                  <div className="text-center min-w-[80px]">
                                    <div className="text-theme-text/60">
                                      Registered
                                    </div>
                                    <div className="text-xs">
                                      {formatDate(beneficiary.registeredAt)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                  {viewMode === "table" && (
                    <BeneficiaryTable
                      beneficiaries={filteredAndSortedBeneficiaries}
                      verificationThreshold={verificationThreshold}
                    />
                  )}
                  {viewMode === "timeline" && (
                    <BeneficiaryTimeline
                      beneficiaries={filteredAndSortedBeneficiaries}
                      verificationThreshold={verificationThreshold}
                    />
                  )}
                </>
              ) : (
                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader className="text-center py-12">
                    <CardTitle className="text-lg font-semibold mb-2 text-theme-text-highlight">
                      No beneficiaries found
                    </CardTitle>
                    <CardDescription className="text-theme-text/60">
                      {searchQuery || statusFilters.length > 0
                        ? "Try adjusting your filters"
                        : "No beneficiaries have been registered yet"}
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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Beneficiaries</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Registered disaster victims
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              className="text-xs px-3 py-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            {isFieldWorker && (
              <Button
                onClick={() => setShowRegisterModal(true)}
                size="sm"
                className="text-xs px-3 py-1.5"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Register Beneficiary
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <SearchInput
            placeholder="Search by name, disaster, or location..."
            onSearch={setSearchQuery}
            className="flex-1"
          />

          {isFieldWorker && (
            <div className="flex gap-1">
              <Button
                variant={ownerFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setOwnerFilter("all")}
                className="gap-1.5 text-xs px-3 py-1.5"
              >
                All
              </Button>
              <Button
                variant={ownerFilter === "mine" ? "default" : "outline"}
                size="sm"
                onClick={() => setOwnerFilter("mine")}
                className="gap-1.5 text-xs px-3 py-1.5"
              >
                Mine
              </Button>
            </div>
          )}

          <FilterDropdown
            label="Status"
            options={VERIFICATION_STATUSES.map((status) => ({
              value: status.value,
              label: status.label,
            }))}
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
              { value: "severity-high", label: "Severity (High)" },
              { value: "severity-low", label: "Severity (Low)" },
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

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary">
            {filteredAndSortedBeneficiaries.length}{" "}
            {filteredAndSortedBeneficiaries.length === 1 ? "result" : "results"}
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

        {loading && beneficiaries.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => {
              const uniqueId = `beneficiary-skeleton-${Date.now()}-${i}`;
              return (
                <Card
                  key={uniqueId}
                  className="bg-theme-card-bg border-theme-border"
                >
                  <CardHeader>
                    <div className="space-y-2">
                      <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                      <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : filteredAndSortedBeneficiaries.length > 0 ? (
          <>
            {viewMode === "grid" && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedBeneficiaries.map((beneficiary) => (
                  <Link
                    key={beneficiary.publicKey.toBase58()}
                    href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                  >
                    <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-1">
                            <CardTitle className="text-base text-theme-primary group-hover:text-theme-primary transition-colors">
                              {beneficiary.name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 text-xs">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {beneficiary.location.district ||
                                beneficiary.location.region}
                              ,{" "}
                              {beneficiary.location.ward ||
                                beneficiary.location.area}
                            </CardDescription>
                          </div>
                          <Badge
                            variant={
                              formatVerificationStatus(
                                beneficiary.verificationStatus,
                              ) === "Verified"
                                ? "default"
                                : formatVerificationStatus(
                                      beneficiary.verificationStatus,
                                    ) === "Flagged"
                                  ? "outline"
                                  : formatVerificationStatus(
                                        beneficiary.verificationStatus,
                                      ) === "Rejected"
                                    ? "outline"
                                    : "pending"
                            }
                            className={`shrink-0 ${
                              formatVerificationStatus(
                                beneficiary.verificationStatus,
                              ) === "Flagged"
                                ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                : formatVerificationStatus(
                                      beneficiary.verificationStatus,
                                    ) === "Rejected"
                                  ? "border-red-500 text-red-500 bg-red-500/10"
                                  : ""
                            }`}
                          >
                            {formatVerificationStatus(
                              beneficiary.verificationStatus,
                            )}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Disaster:
                          </span>
                          <span className="font-medium">
                            {beneficiary.disasterId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Family Size:
                          </span>
                          <span className="font-medium flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {beneficiary.familySize}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Damage Severity:
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              beneficiary.damageSeverity >= 8
                                ? "border-red-500 text-red-500 bg-red-500/10"
                                : beneficiary.damageSeverity >= 6
                                  ? "border-orange-500 text-orange-500 bg-orange-500/10"
                                  : beneficiary.damageSeverity >= 4
                                    ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                    : "border-green-500 text-green-500 bg-green-500/10"
                            }
                          >
                            {beneficiary.damageSeverity >= 8
                              ? "Critical"
                              : beneficiary.damageSeverity >= 6
                                ? "Severe"
                                : beneficiary.damageSeverity >= 4
                                  ? "Moderate"
                                  : "Minor"}{" "}
                            ({beneficiary.damageSeverity}/10)
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Approvals:
                          </span>
                          <span className="font-medium">
                            {beneficiary.verifierApprovals.length}/
                            {verificationThreshold}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Registered {formatDate(beneficiary.registeredAt)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
            {viewMode === "list" && (
              <div className="flex flex-col gap-2">
                {filteredAndSortedBeneficiaries.map((beneficiary) => (
                  <Link
                    key={beneficiary.publicKey.toBase58()}
                    href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                  >
                    <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer bg-theme-card-bg border-theme-border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-semibold text-theme-primary group-hover:text-theme-primary transition-colors">
                                {beneficiary.name}
                              </h3>
                              <Badge
                                variant={
                                  formatVerificationStatus(
                                    beneficiary.verificationStatus,
                                  ) === "Verified"
                                    ? "default"
                                    : formatVerificationStatus(
                                          beneficiary.verificationStatus,
                                        ) === "Flagged"
                                      ? "outline"
                                      : formatVerificationStatus(
                                            beneficiary.verificationStatus,
                                          ) === "Rejected"
                                        ? "outline"
                                        : "pending"
                                }
                                className={`shrink-0 text-xs px-2 py-0.5 ${
                                  formatVerificationStatus(
                                    beneficiary.verificationStatus,
                                  ) === "Flagged"
                                    ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                    : formatVerificationStatus(
                                          beneficiary.verificationStatus,
                                        ) === "Rejected"
                                      ? "border-red-500 text-red-500 bg-red-500/10"
                                      : ""
                                }`}
                              >
                                {formatVerificationStatus(
                                  beneficiary.verificationStatus,
                                )}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-theme-text/60">
                              <MapPin className="h-2.5 w-2.5" />
                              {beneficiary.location.district ||
                                beneficiary.location.region}
                              ,{" "}
                              {beneficiary.location.ward ||
                                beneficiary.location.area}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-xs shrink-0 ml-4">
                            <div className="text-center">
                              <div className="text-theme-text/60">Disaster</div>
                              <div className="font-semibold text-theme-text">
                                {beneficiary.disasterId}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-theme-text/60">Family</div>
                              <div className="font-semibold text-theme-text flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {beneficiary.familySize}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-theme-text/60">
                                Approvals
                              </div>
                              <div className="font-semibold text-theme-text">
                                {beneficiary.verifierApprovals.length}/
                                {verificationThreshold}
                              </div>
                            </div>
                            <div className="text-center min-w-[80px]">
                              <div className="text-theme-text/60">
                                Registered
                              </div>
                              <div className="text-xs">
                                {formatDate(beneficiary.registeredAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
            {viewMode === "table" && (
              <BeneficiaryTable
                beneficiaries={filteredAndSortedBeneficiaries}
                verificationThreshold={verificationThreshold}
              />
            )}
            {viewMode === "timeline" && (
              <BeneficiaryTimeline
                beneficiaries={filteredAndSortedBeneficiaries}
                verificationThreshold={verificationThreshold}
              />
            )}
          </>
        ) : (
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="text-center py-16">
              <CardTitle className="text-base font-semibold mb-2 text-theme-text-highlight">
                {ownerFilter === "mine"
                  ? "You haven't registered any beneficiaries"
                  : "No beneficiaries found"}
              </CardTitle>
              <CardDescription className="text-sm text-theme-text/60 mb-4">
                {ownerFilter === "mine"
                  ? "Register your first beneficiary to get started"
                  : searchQuery || statusFilters.length > 0
                    ? "Try adjusting your filters"
                    : "No beneficiaries have been registered yet"}
              </CardDescription>
              {isFieldWorker && (
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setShowRegisterModal(true)} size="sm">
                    Register First Beneficiary
                  </Button>
                </div>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Registration Modal */}
        <BeneficiaryRegistrationModal
          open={showRegisterModal}
          onOpenChange={setShowRegisterModal}
          onSuccess={() => {
            setShowRegisterModal(false);
          }}
        />
      </main>
    </div>
  );
}
