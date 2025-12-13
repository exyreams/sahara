"use client";

import { PublicKey } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit,
  Flag,
  MapPin,
  RefreshCw,
  Search,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FieldWorkerCreationModal } from "@/components/field-workers/field-worker-creation-modal";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAdmin } from "@/hooks/use-admin";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { useNGO } from "@/hooks/use-ngo";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { deriveFieldWorkerPDA, deriveNGOPDA } from "@/lib/anchor/pdas";
import { formatDate } from "@/lib/formatters";
import type { Beneficiary, FieldWorker } from "@/types/program";

// Verification Activity Component
function VerificationActivity({
  fieldWorker,
  beneficiaries,
}: {
  fieldWorker: FieldWorker;
  beneficiaries: Beneficiary[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVerification, setExpandedVerification] = useState<
    string | null
  >(null);

  // Filter verified beneficiaries
  const verifiedBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) =>
      b.verifierApprovals.some((v) => v.equals(fieldWorker.authority)),
    );
  }, [beneficiaries, fieldWorker.authority]);

  // Filter by search
  const filteredVerifications = useMemo(() => {
    return verifiedBeneficiaries.filter(
      (b) =>
        searchQuery === "" ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.authority
          .toBase58()
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  }, [verifiedBeneficiaries, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedVerification(expandedVerification === id ? null : id);
  };

  return (
    <Card className="bg-theme-card-bg border-theme-border">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-lg">
              Verification Activity ({verifiedBeneficiaries.length})
            </CardTitle>
            <CardDescription>
              Showing {filteredVerifications.length} of{" "}
              {verifiedBeneficiaries.length} verifications
            </CardDescription>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="min-h-[500px]">
        {filteredVerifications.length === 0 ? (
          <div className="flex items-center justify-center h-[450px]">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No verifications found matching your search"
                  : "No verifications performed yet"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {filteredVerifications.map((beneficiary) => {
              const isExpanded =
                expandedVerification === beneficiary.publicKey.toBase58();
              return (
                <div
                  key={beneficiary.publicKey.toBase58()}
                  className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-colors"
                >
                  {/* Collapsed View */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleExpand(beneficiary.publicKey.toBase58())
                    }
                    className="w-full p-3 cursor-pointer hover:bg-theme-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="shrink-0"
                      >
                        <ChevronDown className="h-4 w-4 text-theme-text" />
                      </motion.div>
                      <Badge variant="default" className="shrink-0">
                        Verified
                      </Badge>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium truncate">
                          {beneficiary.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {beneficiary.location.city ||
                            beneficiary.location.region ||
                            beneficiary.location.district}
                          ,{" "}
                          {beneficiary.location.area ||
                            beneficiary.location.ward ||
                            ""}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {beneficiary.verifiedAt
                          ? formatDate(beneficiary.verifiedAt)
                          : formatDate(beneficiary.registeredAt)}
                      </div>
                    </div>
                  </button>

                  {/* Expanded View */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-theme-border bg-muted/20 p-4">
                          <div className="bg-theme-background rounded-md p-1 grid gap-3 text-sm">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2">
                              <div>
                                <span className="text-muted-foreground">
                                  Beneficiary Address:
                                </span>
                                <p className="font-mono text-xs break-all mt-0.5">
                                  {beneficiary.authority.toBase58()}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Phone:
                                </span>
                                <p className="mt-0.5">
                                  {beneficiary.phoneNumber}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Family Size:
                                </span>
                                <p className="mt-0.5">
                                  {beneficiary.familySize} members
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Damage Severity:
                                </span>
                                <p className="mt-0.5">
                                  {beneficiary.damageSeverity}/10
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Verification Status:{" "}
                                </span>
                                <Badge variant="default" className="mt-0.5">
                                  {beneficiary.verificationStatus}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Approvals:
                                </span>
                                <p className="mt-0.5">
                                  {beneficiary.verifierApprovals.length}{" "}
                                  verifier(s)
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end pt-2 p-2">
                              <Button asChild size="sm">
                                <Link
                                  href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                                >
                                  View Full Details
                                </Link>
                              </Button>
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
      </CardContent>
    </Card>
  );
}

// Beneficiaries List Component with Search and Filters
function BeneficiariesList({
  beneficiaries,
}: {
  beneficiaries: Beneficiary[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [expandedBeneficiary, setExpandedBeneficiary] = useState<string | null>(
    null,
  );

  // Get unique districts
  const districts = useMemo(() => {
    const uniqueDistricts = new Set(
      beneficiaries.map((b) => b.location.district || b.location.region),
    );
    return Array.from(uniqueDistricts).sort();
  }, [beneficiaries]);

  // Filter beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((beneficiary) => {
      const matchesSearch =
        searchQuery === "" ||
        beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.authority
          .toBase58()
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        beneficiary.verificationStatus === statusFilter;

      const matchesDistrict =
        districtFilter === "all" ||
        (beneficiary.location.district || beneficiary.location.region) ===
          districtFilter;

      return matchesSearch && matchesStatus && matchesDistrict;
    });
  }, [beneficiaries, searchQuery, statusFilter, districtFilter]);

  const toggleExpand = (id: string) => {
    setExpandedBeneficiary(expandedBeneficiary === id ? null : id);
  };

  if (beneficiaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No beneficiaries registered yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-theme-card-bg border-theme-border">
      <CardContent className="p-6 space-y-4 min-h-[600px]">
        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or wallet address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Verified">Verified</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Flagged">Flagged</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filteredBeneficiaries.length} of {beneficiaries.length}{" "}
          beneficiaries
        </p>

        {/* Beneficiaries List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {filteredBeneficiaries.map((beneficiary) => {
            const isExpanded =
              expandedBeneficiary === beneficiary.publicKey.toBase58();
            return (
              <div
                key={beneficiary.publicKey.toBase58()}
                className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-colors"
              >
                {/* Collapsed View */}
                <button
                  type="button"
                  onClick={() => toggleExpand(beneficiary.publicKey.toBase58())}
                  className="w-full px-4 py-3 text-left cursor-pointer hover:bg-theme-card-bg/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="shrink-0"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                    <Badge
                      variant={
                        beneficiary.verificationStatus === "Verified"
                          ? "default"
                          : beneficiary.verificationStatus === "Pending"
                            ? "secondary"
                            : beneficiary.verificationStatus === "Flagged"
                              ? "destructive"
                              : "outline"
                      }
                      className="shrink-0"
                    >
                      {beneficiary.verificationStatus}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{beneficiary.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {beneficiary.location.city ||
                          beneficiary.location.region ||
                          beneficiary.location.district}
                        ,{" "}
                        {beneficiary.location.area ||
                          beneficiary.location.ward ||
                          ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Family: {beneficiary.familySize}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                      >
                        View Details
                      </Link>
                    </Button>
                  </div>
                </button>

                {/* Expanded View */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-theme-border bg-muted/20 px-4 py-3">
                        <div className="bg-theme-background p- rounded-md grid gap-3 text-sm">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4">
                            <div>
                              <span className="text-muted-foreground">
                                Wallet Address:
                              </span>
                              <p className="font-mono text-xs break-all mt-0.5">
                                {beneficiary.authority.toBase58()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Phone:
                              </span>
                              <p className="mt-0.5">
                                {beneficiary.phoneNumber}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                National ID:
                              </span>
                              <p className="mt-0.5">{beneficiary.nationalId}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Registered:
                              </span>
                              <p className="mt-0.5">
                                {formatDate(beneficiary.registeredAt)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Damage Severity:
                              </span>
                              <p className="mt-0.5">
                                {beneficiary.damageSeverity}/10
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Total Donation Received:
                              </span>
                              <p className="mt-0.5">
                                $
                                {(
                                  beneficiary.totalReceived / 1_000_000
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </div>
                          {beneficiary.damageDescription && (
                            <div className="p-4">
                              <span className="text-muted-foreground">
                                Damage Description:
                              </span>
                              <p className="mt-0.5">
                                {beneficiary.damageDescription}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FieldWorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { program, wallet } = useProgram();
  const { ngo } = useNGO();
  const { isAdmin } = useAdmin();
  const { beneficiaries } = useBeneficiaries();
  const { fieldWorkers, loading, refetch } = useFieldWorkers();
  const { submit, isLoading: isUpdating } = useTransaction();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const id = params.id as string;
  const activeTab = searchParams.get("tab") || "overview";

  // Set default tab in URL on initial load
  useEffect(() => {
    if (!searchParams.get("tab")) {
      router.replace(`/ngo/field-workers/${id}?tab=overview`, {
        scroll: false,
      });
    }
  }, [searchParams, router, id]);

  const handleTabChange = (value: string) => {
    router.push(`/ngo/field-workers/${id}?tab=${value}`, { scroll: false });
  };

  // Get field worker from cached data
  const fieldWorker = fieldWorkers.find((fw) => fw.authority.toBase58() === id);

  // Only show loading skeleton if we don't have the field worker data yet (first load)
  const isLoading = !fieldWorker && loading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Get beneficiaries registered by this field worker
  const registeredBeneficiaries = beneficiaries.filter((b) =>
    b.registeredBy.equals(fieldWorker?.authority || PublicKey.default),
  );

  // Get flagged beneficiaries by this field worker (only visible to NGO and admin)
  const flaggedBeneficiaries = beneficiaries.filter((b) =>
    b.flaggedBy?.equals(fieldWorker?.authority || PublicKey.default),
  );

  const canViewFlags =
    isAdmin || (ngo && fieldWorker?.ngo?.equals(ngo.publicKey));

  const handleToggleStatus = async () => {
    if (!program || !wallet.publicKey || !fieldWorker || !ngo) return;

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        const [fieldWorkerPDA] = deriveFieldWorkerPDA(fieldWorker.authority);
        const [ngoPDA] = deriveNGOPDA(wallet.publicKey);

        const tx = await program.methods
          .updateFieldWorkerStatus({
            isActive: !fieldWorker.isActive,
            notes: null,
          })
          .accounts({
            fieldWorker: fieldWorkerPDA,
            ngo: ngoPDA,
            ngoAuthority: wallet.publicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: `Field worker ${
          fieldWorker.isActive ? "deactivated" : "activated"
        } successfully`,
        onSuccess: () => {
          // Refetch to update cached data
          refetch();
        },
      },
    );
  };

  if (isLoading || isRefreshing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Back Button Skeleton */}
            <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />

            {/* Header Skeleton */}
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-64 bg-theme-border rounded animate-pulse" />
                  <div className="h-6 w-16 bg-theme-border rounded animate-pulse" />
                </div>
                <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 bg-theme-border rounded animate-pulse" />
                <div className="h-9 w-40 bg-theme-border rounded animate-pulse" />
                <div className="h-9 w-28 bg-theme-border rounded animate-pulse" />
              </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              {Array.from({ length: 3 }, (_, i) => `stats-skeleton-${i}`).map(
                (key) => (
                  <Card
                    key={key}
                    className="bg-theme-card-bg border-theme-border"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 w-16 bg-theme-border rounded animate-pulse mb-2" />
                      <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ),
              )}
            </div>

            {/* Tabs Skeleton */}
            <div className="space-y-6">
              {/* Tab triggers skeleton */}
              <div className="h-11 bg-theme-card-bg border border-theme-border rounded-lg p-1 flex gap-1">
                <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
                <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
                <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
                <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
              </div>

              {/* Tab content skeleton - Single large card */}
              <Card className="bg-theme-card-bg border-theme-border">
                <CardHeader>
                  <div className="h-6 w-48 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
                </CardHeader>
                <CardContent className="min-h-[600px] space-y-6">
                  {/* Section skeleton */}
                  {Array.from(
                    { length: 3 },
                    (_, i) => `section-skeleton-${i}`,
                  ).map((key, index) => (
                    <div key={key} className="space-y-4">
                      <div className="h-5 w-40 bg-theme-border rounded animate-pulse" />
                      <div className="grid gap-4 md:grid-cols-2 pl-7">
                        {Array.from(
                          { length: 4 },
                          (_, j) => `field-skeleton-${key}-${j}`,
                        ).map((fieldKey) => (
                          <div key={fieldKey} className="space-y-2">
                            <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                            <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                      {index < 2 && (
                        <div className="border-t border-theme-border" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!fieldWorker) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/ngo/field-workers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Field Workers
            </Link>
          </Button>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="text-center py-12">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-lg font-semibold mb-2 text-theme-text-highlight">
                Field Worker Not Found
              </CardTitle>
              <CardDescription className="text-theme-text/60">
                The field worker you're looking for doesn't exist or has been
                removed.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/ngo/field-workers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Field Workers
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold tracking-tight">
                {fieldWorker.name}
              </h1>
              <Badge variant={fieldWorker.isActive ? "default" : "log_action"}>
                {fieldWorker.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-theme-text/60 font-mono text-sm">
              {fieldWorker.authority.toBase58()}
            </p>
          </div>
          {ngo && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Field Worker
              </Button>
              <Button
                onClick={handleToggleStatus}
                disabled={isUpdating}
                size="sm"
                variant={fieldWorker.isActive ? "destructive" : "default"}
              >
                {isUpdating
                  ? "Updating..."
                  : fieldWorker.isActive
                    ? "Deactivate"
                    : "Activate"}
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Beneficiaries Registered
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registeredBeneficiaries.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total registered by this worker
              </p>
            </CardContent>
          </Card>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Verifications
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fieldWorker.verificationsCount}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Flags Raised
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fieldWorker.flagsRaised}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 h-11">
            <TabsTrigger value="overview" className="cursor-pointer">
              Overview
            </TabsTrigger>
            <TabsTrigger value="beneficiaries" className="cursor-pointer">
              Beneficiaries ({registeredBeneficiaries.length})
            </TabsTrigger>
            <TabsTrigger value="verifications" className="cursor-pointer">
              Verifications ({fieldWorker.verificationsCount})
            </TabsTrigger>
            <TabsTrigger value="flags" className="cursor-pointer">
              Flags ({fieldWorker.flagsRaised})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="p-12 bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Field Worker Information</CardTitle>
                <CardDescription>
                  Complete profile and activity details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 min-h-[600px] mt-4">
                {/* Contact Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Contact Information
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 pl-7">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Organization
                      </p>
                      <p className="font-medium">{fieldWorker.organization}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{fieldWorker.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{fieldWorker.phoneNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-theme-border" />

                {/* Activity Timeline Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Activity Timeline
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 pl-7">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Registered
                      </p>
                      <p className="font-medium">
                        {new Date(
                          fieldWorker.registeredAt * 1000,
                        ).toLocaleString()}
                      </p>
                    </div>
                    {fieldWorker.activatedAt && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Activated
                        </p>
                        <p className="font-medium">
                          {new Date(
                            fieldWorker.activatedAt * 1000,
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Last Activity
                      </p>
                      <p className="font-medium">
                        {new Date(
                          fieldWorker.lastActivityAt * 1000,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-theme-border" />

                {/* Assigned Districts Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Assigned Districts
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({fieldWorker.assignedDistricts.length} district
                      {fieldWorker.assignedDistricts.length !== 1 ? "s" : ""})
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-2 pl-7">
                    {fieldWorker.assignedDistricts.map((district) => (
                      <Badge
                        key={district}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        {district}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="border-t border-theme-border" />

                {/* Credentials Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Credentials</h3>
                  <p className="text-sm whitespace-pre-wrap pl-7">
                    {fieldWorker.credentials}
                  </p>
                </div>

                {/* Notes Section (if any) */}
                {fieldWorker.notes && (
                  <>
                    <div className="border-t border-theme-border" />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Notes</h3>
                      <p className="text-sm whitespace-pre-wrap pl-7">
                        {fieldWorker.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Beneficiaries Registered Tab */}
          <TabsContent value="beneficiaries" className="space-y-4">
            <BeneficiariesList beneficiaries={registeredBeneficiaries} />
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications" className="space-y-4">
            <VerificationActivity
              fieldWorker={fieldWorker}
              beneficiaries={beneficiaries}
            />
          </TabsContent>

          {/* Flags Tab */}
          <TabsContent value="flags" className="space-y-4">
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Flagged Beneficiaries</CardTitle>
                <CardDescription>
                  Beneficiaries flagged by this field worker for review
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[600px]">
                {canViewFlags && flaggedBeneficiaries.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {flaggedBeneficiaries.map((beneficiary) => (
                      <Link
                        key={beneficiary.publicKey.toBase58()}
                        href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                        className="block"
                      >
                        <div className="border border-theme-border rounded-lg p-4 hover:border-theme-primary/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Flag className="h-4 w-4 text-yellow-500" />
                                <h3 className="font-semibold">
                                  {beneficiary.name}
                                </h3>
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Flagged
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {beneficiary.location.city ||
                                  beneficiary.location.region ||
                                  beneficiary.location.district}
                                ,{" "}
                                {beneficiary.location.area ||
                                  beneficiary.location.ward ||
                                  ""}
                              </p>
                              {beneficiary.flaggedReason && (
                                <p className="text-sm text-yellow-600 mt-2">
                                  Reason: {beneficiary.flaggedReason}
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {beneficiary.flaggedAt
                                ? formatDate(beneficiary.flaggedAt)
                                : ""}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {canViewFlags
                          ? "No flags raised by this field worker"
                          : "You don't have permission to view flags"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Modal */}
        {fieldWorker && (
          <FieldWorkerCreationModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            fieldWorker={fieldWorker}
            mode="edit"
            onSuccess={() => {
              // Refetch field worker data after successful update
              refetch();
            }}
          />
        )}
      </main>
    </div>
  );
}
