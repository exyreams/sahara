"use client";

import {
  AlertTriangle,
  Grid3x3,
  List,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BeneficiaryRegistrationModal } from "@/components/beneficiaries/beneficiary-registration-modal";
import { Header } from "@/components/layout/header";
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
import { WalletButton } from "@/components/wallet/wallet-button";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { deriveFieldWorkerPDA } from "@/lib/anchor/pdas";
import { VERIFICATION_STATUSES, VERIFICATION_THRESHOLD } from "@/lib/constants";
import { formatDate, formatVerificationStatus } from "@/lib/formatters";

export default function BeneficiariesPage() {
  const { beneficiaries, loading } = useBeneficiaries();
  const { config } = usePlatformConfig();
  const { wallet, program } = useProgram();

  // Get verification threshold from platform config, fallback to constant
  const verificationThreshold =
    config?.verificationThreshold || VERIFICATION_THRESHOLD;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isFieldWorker, setIsFieldWorker] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all");

  // Check if user is a field worker
  useEffect(() => {
    const checkFieldWorker = async () => {
      if (!program || !wallet.publicKey) {
        setIsFieldWorker(false);
        return;
      }

      try {
        const [fieldWorkerPDA] = deriveFieldWorkerPDA(wallet.publicKey);
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        await (program.account as any).fieldWorker.fetch(fieldWorkerPDA);
        setIsFieldWorker(true);
      } catch {
        setIsFieldWorker(false);
      }
    };

    checkFieldWorker();
  }, [program, wallet.publicKey]);

  const filteredBeneficiaries = beneficiaries.filter((beneficiary) => {
    const matchesSearch =
      !searchQuery ||
      beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      beneficiary.disasterId
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      beneficiary.location.district
        .toLowerCase()
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

  // Wallet not connected - Show particle hero
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
              <ParticleSystem text="Beneficiaries" />
            </div>

            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center pointer-events-none">
              <div className="flex-1" />

              <div className="max-w-3xl mx-auto text-center space-y-6 pb-16 pointer-events-auto">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                  Beneficiaries
                </h1>
                <p className="text-lg md:text-xl text-theme-text max-w-2xl mx-auto">
                  Verified disaster victims receiving direct aid through
                  blockchain transparency. Every beneficiary is verified by
                  field workers to ensure aid reaches those who need it most.
                </p>
                <div className="flex flex-col items-center gap-4 pt-6">
                  <div className="scale-110">
                    <WalletButton />
                  </div>
                  <p className="text-sm text-theme-text/80">
                    Connect your wallet to register or view details
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Beneficiaries List Section */}
          <section className="py-16 bg-theme-bg">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-theme-text-highlight">
                    Registered Beneficiaries
                  </h2>
                  <p className="text-theme-text/60 mt-2">
                    View verified disaster victims
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {
                    beneficiaries.filter(
                      (b) => b.verificationStatus === "Verified",
                    ).length
                  }{" "}
                  Verified
                </Badge>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
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
              ) : filteredBeneficiaries.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col gap-3"
                  }
                >
                  {filteredBeneficiaries.map((beneficiary) => (
                    <Link
                      key={beneficiary.publicKey.toBase58()}
                      href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                    >
                      <Card className="group hover:shadow-xl hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              <CardTitle className="text-lg text-theme-primary group-hover:text-theme-primary transition-colors">
                                {beneficiary.name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {beneficiary.location.district}, Ward{" "}
                                {beneficiary.location.ward}
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
                              Registered {formatDate(beneficiary.registeredAt)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
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

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Beneficiaries</h1>
            <p className="text-muted-foreground mt-2">
              Registered disaster victims
            </p>
          </div>
          {isFieldWorker && (
            <Button onClick={() => setShowRegisterModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Beneficiary
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <SearchInput
            placeholder="Search by name, disaster, or location..."
            onSearch={setSearchQuery}
            className="flex-1"
          />

          {isFieldWorker && (
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
            options={VERIFICATION_STATUSES.map((status) => ({
              value: status.value,
              label: status.label,
            }))}
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

        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary">
            {filteredBeneficiaries.length}{" "}
            {filteredBeneficiaries.length === 1 ? "result" : "results"}
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
        ) : filteredBeneficiaries.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-3"
            }
          >
            {filteredBeneficiaries.map((beneficiary) => (
              <Link
                key={beneficiary.publicKey.toBase58()}
                href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
              >
                <Card className="group hover:shadow-xl hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <CardTitle className="text-lg text-theme-primary group-hover:text-theme-primary transition-colors">
                          {beneficiary.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {beneficiary.location.district}, Ward{" "}
                          {beneficiary.location.ward}
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
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Disaster:</span>
                      <span className="font-medium">
                        {beneficiary.disasterId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Family Size:
                      </span>
                      <span className="font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {beneficiary.familySize}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Approvals:</span>
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
        ) : (
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="text-center py-24">
              <CardTitle className="text-xl font-semibold mb-3 text-theme-text-highlight">
                {ownerFilter === "mine"
                  ? "You haven't registered any beneficiaries"
                  : "No beneficiaries found"}
              </CardTitle>
              <CardDescription className="text-base text-theme-text/60 mb-4">
                {ownerFilter === "mine"
                  ? "Register your first beneficiary to get started"
                  : searchQuery || statusFilters.length > 0
                    ? "Try adjusting your filters"
                    : "No beneficiaries have been registered yet"}
              </CardDescription>
              {isFieldWorker && (
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setShowRegisterModal(true)}>
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
        />
      </main>
    </div>
  );
}
