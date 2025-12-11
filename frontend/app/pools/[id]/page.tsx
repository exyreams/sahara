"use client";

import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ExternalLink,
  Pencil,
  RefreshCw,
  SendHorizontal,
  TrendingDown,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { DonationIcon } from "@/components/icons/donation-icon";
import { FundIcon } from "@/components/icons/fund-icon";
import { VerifiedIcon } from "@/components/icons/verified-icon";
import { DistributionForm } from "@/components/pools/distribution-form";
import { DonateModal } from "@/components/pools/donate-modal";
import { LockRegistrationButton } from "@/components/pools/lock-registration-button";
import { PoolCreationModal } from "@/components/pools/pool-creation-modal";
import { ReclaimExpiredButton } from "@/components/pools/reclaim-expired-button";
import { RegisterBeneficiaryModal } from "@/components/pools/register-beneficiary-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WideModal,
  WideModalContent,
  WideModalTitle,
} from "@/components/ui/wide-modal";
import { useAllNGOs } from "@/hooks/use-all-ngos";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useDistributions } from "@/hooks/use-distributions";
import { useDonations } from "@/hooks/use-donations";
import { usePoolRegistrations } from "@/hooks/use-pool-registrations";
import { usePools } from "@/hooks/use-pools";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { deriveActivityLogPDA, deriveFundPoolPDA } from "@/lib/anchor/pdas";
import { formatDate } from "@/lib/formatters";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import type { DistributionType } from "@/types/program";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Helper to format distribution type for display
function formatDistributionType(type: DistributionType): string {
  switch (type) {
    case "Equal":
      return "Equal Distribution";
    case "WeightedFamily":
      return "Weighted by Family";
    case "WeightedDamage":
      return "Weighted by Damage";
    case "Milestone":
      return "Milestone Based";
    default:
      return String(type);
  }
}

export default function PoolDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pools, loading, error, refetch } = usePools();
  const { wallet, program } = useProgram();
  const { ngos } = useAllNGOs();
  const { submit, isLoading: isClosing } = useTransaction();
  const { config } = usePlatformConfig();
  const { data: tokenMetadata } = useTokenMetadata(config?.usdcMint || null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Find pool directly from pools array using useMemo
  const pool = useMemo(() => {
    if (pools.length === 0) return null;
    try {
      const poolPubkey = new PublicKey(resolvedParams.id);
      return pools.find((p) => p.publicKey.equals(poolPubkey)) || null;
    } catch (err) {
      console.error("Invalid pool ID:", err);
      return null;
    }
  }, [pools, resolvedParams.id]);
  const {
    donations,
    loading: donationsLoading,
    refetch: refetchDonations,
  } = useDonations();
  const {
    distributions,
    loading: distributionsLoading,
    refetch: refetchDistributions,
  } = useDistributions();
  const {
    registrations,
    loading: registrationsLoading,
    refetch: refetchRegistrations,
  } = usePoolRegistrations();
  const { beneficiaries } = useBeneficiaries();
  const [expandedDonations, setExpandedDonations] = useState<Set<string>>(
    new Set(),
  );
  const [expandedDistributions, setExpandedDistributions] = useState<
    Set<string>
  >(new Set());
  const [showDistributeModal, setShowDistributeModal] = useState(false);

  // Get active tab from URL or default to overview
  const activeTab = searchParams.get("tab") || "overview";

  // Set default tab in URL on initial load
  useEffect(() => {
    if (!searchParams.get("tab")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "overview");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Filter donations for this pool
  const poolDonations = pool
    ? donations
        .filter((d) => d.pool?.equals(pool.publicKey))
        .sort((a, b) => b.timestamp - a.timestamp)
    : [];

  // Filter distributions for this pool
  const poolDistributions = pool
    ? distributions
        .filter((d) => d.pool.equals(pool.publicKey))
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  // Filter registrations for this pool
  const poolRegistrations = pool
    ? registrations
        .filter((r) => r.pool.equals(pool.publicKey))
        .sort((a, b) => b.registeredAt - a.registeredAt)
    : [];

  const toggleExpanded = (donationKey: string) => {
    setExpandedDonations((prev) => {
      const next = new Set(prev);
      if (next.has(donationKey)) {
        next.delete(donationKey);
      } else {
        next.add(donationKey);
      }
      return next;
    });
  };

  const toggleDistributionExpanded = (distributionKey: string) => {
    setExpandedDistributions((prev) => {
      const next = new Set(prev);
      if (next.has(distributionKey)) {
        next.delete(distributionKey);
      } else {
        next.add(distributionKey);
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetch(),
      refetchDonations(),
      refetchDistributions(),
      refetchRegistrations(),
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const getExplorerUrl = (signature: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  };

  // Get creator information
  const creatorNGO = pool
    ? ngos.find((ngo) => ngo.authority.toBase58() === pool.authority.toBase58())
    : null;

  // Only show loading skeleton if we don't have the pool data yet (first load)
  const isLoading = !pool && loading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-theme-bg">
        <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
          {/* Back Button Skeleton */}
          <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />

          {/* Header Skeleton */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-64 bg-theme-border rounded animate-pulse" />
                  <div className="h-6 w-20 bg-theme-border rounded-full animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
                </div>
                <div className="border-t border-theme-border pt-3">
                  <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Statistics Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from(
              { length: 4 },
              (_, i) => `stats-card-skeleton-${i}`,
            ).map((key) => (
              <Card key={key} className="bg-theme-card-bg border-theme-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 bg-theme-border rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Card Skeleton */}
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader>
              <div className="h-6 w-48 bg-theme-border rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="w-full h-3 bg-theme-border rounded-full animate-pulse mb-2" />
              <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
            </CardContent>
          </Card>

          {/* Tabs Skeleton */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-12 w-32 bg-theme-border rounded animate-pulse" />
              <div className="h-12 w-32 bg-theme-border rounded animate-pulse" />
            </div>

            {/* Content Card Skeleton */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <div className="h-7 w-48 bg-theme-border rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description skeleton */}
                <div className="space-y-2">
                  <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-theme-border rounded animate-pulse" />
                </div>
                {/* Key details grid skeleton */}
                <div className="grid gap-3 md:grid-cols-3">
                  {Array.from(
                    { length: 3 },
                    (_, i) => `key-detail-skeleton-${i}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="p-3 rounded-lg border border-theme-border"
                    >
                      <div className="h-3 w-24 bg-theme-border rounded animate-pulse mb-2" />
                      <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Eligibility skeleton */}
                <div className="p-4 rounded-lg border border-theme-border space-y-3">
                  <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                    {Array.from(
                      { length: 2 },
                      (_, i) => `pool-stat-skeleton-${i}`,
                    ).map((key) => (
                      <div key={key}>
                        <div className="h-3 w-24 bg-theme-border rounded animate-pulse mb-2" />
                        <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Distribution Schedule skeleton */}
                <div className="p-4 rounded-lg border border-theme-border">
                  <div className="h-3 w-32 bg-theme-border rounded animate-pulse mb-3" />
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                    {Array.from(
                      { length: 3 },
                      (_, i) => `distribution-stat-skeleton-${i}`,
                    ).map((key) => (
                      <div key={key}>
                        <div className="h-3 w-24 bg-theme-border rounded animate-pulse mb-2" />
                        <div className="h-8 w-16 bg-theme-border rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Beneficiaries skeleton */}
                <div className="p-4 rounded-lg border border-theme-border">
                  <div className="h-3 w-32 bg-theme-border rounded animate-pulse mb-3" />
                  <div className="space-y-2">
                    {Array.from(
                      { length: 3 },
                      (_, i) => `beneficiary-skeleton-${i}`,
                    ).map((key) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-theme-border"
                      >
                        <div className="h-10 w-10 rounded-full bg-theme-border animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-3 w-48 bg-theme-border rounded animate-pulse" />
                        </div>
                        <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Only show "not found" if we're done loading and still don't have a pool
  if (!loading && (error || !pool)) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pool Not Found</CardTitle>
            <CardDescription>
              {error ? error.message : "The requested pool could not be found."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/pools")}>Back to Pools</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If still loading and no pool yet, return null (skeleton already shown above)
  if (!pool) {
    return null;
  }

  // Get dynamic token decimals and symbol
  const decimals = tokenMetadata?.decimals ?? 9; // fallback to 9 for your test token
  const tokenSymbol = tokenMetadata?.symbol || "TOKEN";

  // Helper function to format currency amounts
  const formatCurrency = (amount: number) => {
    const formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // Remove .00 if it's exactly .00, but keep other decimals like .20
    return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
  };

  // Convert from token smallest unit to human readable (dynamic decimals)
  const totalCollected = pool.totalDeposited / 10 ** decimals;
  const totalDistributed = pool.totalDistributed / 10 ** decimals;
  const availableFunds = totalCollected - totalDistributed;
  const targetAmount = pool.targetAmount ? pool.targetAmount / 1_000_000 : null;

  const progressPercentage = targetAmount
    ? Math.min((totalCollected / targetAmount) * 100, 100)
    : 0;
  const isPoolManager = wallet.publicKey?.equals(pool.authority);

  return (
    <div className="min-h-screen flex flex-col bg-theme-bg">
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <a
            href="/pools"
            onClick={(e) => {
              e.preventDefault();
              router.push("/pools");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pools
          </a>
        </Button>

        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl font-bold tracking-tight text-theme-primary">
                  {pool.name}
                </h1>
                <Badge variant={pool.isActive ? "default" : "log_action"}>
                  {pool.isActive ? "Active" : "Closed"}
                </Badge>
                <Badge
                  variant={pool.registrationLocked ? "secondary" : "outline"}
                  className={
                    pool.registrationLocked
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200"
                      : "text-blue-600 border-blue-200 bg-blue-50"
                  }
                >
                  {pool.registrationLocked
                    ? "Registration Locked"
                    : "Registration Open"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <span className="text-sm">
                  Pool ID: <span className="font-mono">{pool.poolId}</span>
                </span>
                <span>•</span>
                <span className="text-sm">
                  Disaster: <span className="font-mono">{pool.disasterId}</span>
                </span>
                <span>•</span>
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{formatDate(pool.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
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
              <DonateModal pool={pool} onSuccess={handleRefresh} />
              {isPoolManager && (
                <>
                  {!pool.registrationLocked && (
                    <>
                      <RegisterBeneficiaryModal
                        pool={pool}
                        onSuccess={handleRefresh}
                      />
                      <LockRegistrationButton
                        pool={pool}
                        onSuccess={handleRefresh}
                      />
                    </>
                  )}
                  {pool.registrationLocked && (
                    <>
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => setShowDistributeModal(true)}
                      >
                        <SendHorizontal className="mr-2 h-4 w-4" />
                        Distribute
                      </Button>
                      <ReclaimExpiredButton
                        pool={pool}
                        onSuccess={handleRefresh}
                      />
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Pool
                  </Button>
                </>
              )}
              {isPoolManager && (
                <Button
                  variant={pool.isActive ? "destructive" : "default"}
                  size="lg"
                  disabled={isClosing}
                  onClick={async () => {
                    if (!pool || !wallet.publicKey || !program) return;

                    const walletPublicKey = wallet.publicKey;

                    await submit(
                      async () => {
                        const [poolPDA] = deriveFundPoolPDA(
                          pool.disasterId,
                          pool.poolId,
                        );

                        if (pool.isActive) {
                          // Close pool
                          const timestamp = Math.floor(Date.now() / 1000);
                          const [activityLogPDA] = deriveActivityLogPDA(
                            walletPublicKey,
                            timestamp,
                          );

                          const tx = await program.methods
                            .closePool(
                              pool.disasterId,
                              pool.poolId,
                              new BN(timestamp),
                            )
                            .accounts({
                              pool: poolPDA,
                              activityLog: activityLogPDA,
                              authority: walletPublicKey,
                              systemProgram: SystemProgram.programId,
                            })
                            .rpc();

                          return tx;
                        }
                        // Reopen pool using updatePoolConfig
                        const tx = await program.methods
                          .updatePoolConfig(pool.disasterId, pool.poolId, {
                            isActive: true,
                            eligibilityCriteria: null,
                            targetAmount: null,
                            description: null,
                          })
                          .accounts({
                            pool: poolPDA,
                            authority: walletPublicKey,
                          })
                          .rpc();

                        return tx;
                      },
                      {
                        successMessage: pool.isActive
                          ? "Pool closed successfully"
                          : "Pool reopened successfully",
                        onSuccess: () => {
                          refetch();
                        },
                      },
                    );
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {isClosing
                    ? pool.isActive
                      ? "Closing..."
                      : "Reopening..."
                    : pool.isActive
                      ? "Close Pool"
                      : "Reopen Pool"}
                </Button>
              )}
            </div>
          </div>

          {/* Creator Information - Full Width Border */}
          <div className="text-sm text-muted-foreground border-t border-theme-border pt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Created by:</span>
              {creatorNGO ? (
                <>
                  <span className="font-medium text-theme-text">
                    {creatorNGO.name}
                  </span>
                  {creatorNGO.isVerified && (
                    <VerifiedIcon className="w-4 h-4" tooltip="Verified NGO" />
                  )}
                </>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Unknown
                </Badge>
              )}
              <span>|</span>
              <span>Address:</span>
              <span className="text-xs font-mono text-theme-primary break-all">
                {pool.authority.toBase58()}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-theme-text/60">
                Total Collected
              </CardDescription>
              <FundIcon className="h-4 w-4 text-theme-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-theme-primary">
                ${formatCurrency(totalCollected)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-theme-text/60">
                Total Distributed
              </CardDescription>
              <TrendingDown className="h-4 w-4 text-theme-primary" />
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <div className="h-8 w-32 bg-theme-border rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-theme-text">
                  ${formatCurrency(totalDistributed)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-theme-text/60">
                Available Funds
              </CardDescription>
              <FundIcon className="h-4 w-4 text-theme-primary" />
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <div className="h-8 w-32 bg-theme-border rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-theme-text">
                  ${formatCurrency(availableFunds)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-theme-text/60">
                Beneficiaries
              </CardDescription>
              <Users className="h-4 w-4 text-theme-primary" />
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <div className="h-8 w-16 bg-theme-border rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-bold text-theme-text">
                  {pool.beneficiaryCount}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Target Progress */}
        {targetAmount && (
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader>
              <CardTitle className="text-theme-text-highlight">
                Fundraising Progress
              </CardTitle>
              <CardDescription className="text-theme-text/60">
                ${formatCurrency(totalCollected)} of $
                {formatCurrency(targetAmount)} raised
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-theme-border rounded-full h-3">
                <div
                  className="bg-theme-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
              <p className="text-sm text-theme-text/60 mt-2">
                {progressPercentage.toFixed(1)}% complete
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="h-12 p-1">
            <TabsTrigger
              value="overview"
              className="text-base px-6 cursor-pointer"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="registered"
              className="text-base px-6 cursor-pointer"
            >
              Registered ({poolRegistrations.length})
            </TabsTrigger>
            <TabsTrigger
              value="donations"
              className="text-base px-6 cursor-pointer"
            >
              Donations
            </TabsTrigger>
            <TabsTrigger
              value="distributions"
              className="text-base px-6 cursor-pointer"
            >
              Distributions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle className="text-2xl text-theme-primary">
                  Pool Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                {pool.description && (
                  <div>
                    <p className="text-theme-text leading-relaxed">
                      {pool.description}
                    </p>
                  </div>
                )}

                {/* Key Details Grid */}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                    <p className="text-xs text-theme-text/60 mb-1">
                      Distribution Type
                    </p>
                    <p className="text-sm font-medium text-theme-text">
                      {formatDistributionType(pool.distributionType)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                    <p className="text-xs text-theme-text/60 mb-1">Created</p>
                    <p className="text-sm font-medium text-theme-text">
                      {formatDate(pool.createdAt)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                    <p className="text-xs text-theme-text/60 mb-1">
                      Pool Manager
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-theme-text truncate">
                        {creatorNGO ? creatorNGO.name : "Unknown"}
                      </p>
                      {creatorNGO?.isVerified && (
                        <VerifiedIcon
                          className="w-3.5 h-3.5 shrink-0"
                          tooltip="Verified NGO"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Eligibility & Requirements */}
                {(pool.eligibilityCriteria ||
                  pool.minimumFamilySize ||
                  pool.minimumDamageSeverity) && (
                  <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                    <p className="text-xs font-medium text-theme-text/60 mb-3">
                      Eligibility Criteria
                    </p>
                    {pool.eligibilityCriteria && (
                      <p className="text-sm text-theme-text leading-relaxed mb-4">
                        {pool.eligibilityCriteria}
                      </p>
                    )}
                    {(pool.minimumFamilySize || pool.minimumDamageSeverity) && (
                      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                        {pool.minimumFamilySize && (
                          <div>
                            <p className="text-xs text-theme-text/60 mb-1">
                              Min Family Size
                            </p>
                            <p className="text-lg font-semibold text-theme-text">
                              {pool.minimumFamilySize} members
                            </p>
                          </div>
                        )}
                        {pool.minimumDamageSeverity && (
                          <div>
                            <p className="text-xs text-theme-text/60 mb-1">
                              Min Damage Severity
                            </p>
                            <p className="text-lg font-semibold text-theme-text">
                              {pool.minimumDamageSeverity}/10
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Distribution Schedule */}
                {pool.distributionPercentageImmediate < 100 && (
                  <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                    <p className="text-xs font-medium text-theme-text/60 mb-3">
                      Distribution Schedule
                    </p>
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-theme-text/60 mb-1">
                          Immediate Release
                        </p>
                        <p className="text-2xl font-bold text-theme-primary">
                          {pool.distributionPercentageImmediate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-theme-text/60 mb-1">
                          Time-Locked
                        </p>
                        <p className="text-2xl font-bold text-theme-text">
                          {pool.distributionPercentageLocked}%
                        </p>
                      </div>
                      {pool.timeLockDuration && (
                        <div>
                          <p className="text-xs text-theme-text/60 mb-1">
                            Lock Duration
                          </p>
                          <p className="text-2xl font-bold text-theme-text">
                            {Math.floor(pool.timeLockDuration / 86400)} days
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Beneficiaries List */}
                {poolDistributions.length > 0 && (
                  <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                    <p className="text-xs font-medium text-theme-text/60 mb-3">
                      Beneficiaries ({poolDistributions.length})
                    </p>
                    {isRefreshing ? (
                      <div className="space-y-2">
                        {Array.from(
                          { length: 3 },
                          (_, i) => `disaster-skeleton-${i}`,
                        ).map((key) => (
                          <div
                            key={key}
                            className="flex items-center gap-3 p-3 rounded-lg border border-theme-border"
                          >
                            <div className="h-10 w-10 rounded-full bg-theme-border animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                              <div className="h-3 w-48 bg-theme-border rounded animate-pulse" />
                            </div>
                            <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {poolDistributions.map((distribution) => {
                          const beneficiary = beneficiaries.find((b) =>
                            b.publicKey.equals(distribution.beneficiary),
                          );
                          const allocated =
                            distribution.amountAllocated / 1_000_000_000;

                          return (
                            <a
                              key={distribution.publicKey.toString()}
                              href={`/beneficiaries/${distribution.beneficiary.toBase58()}`}
                              onClick={(e) => {
                                e.preventDefault();
                                router.push(
                                  `/beneficiaries/${distribution.beneficiary.toBase58()}`,
                                );
                              }}
                              className="flex items-center gap-3 p-3 rounded-lg border border-theme-border hover:border-theme-primary/50 hover:bg-theme-primary/5 transition-all cursor-pointer"
                            >
                              <div className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center shrink-0">
                                <Users className="h-5 w-5 text-theme-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {beneficiary?.name || "Unnamed Beneficiary"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {beneficiary
                                    ? `Family: ${beneficiary.familySize} | Damage: ${beneficiary.damageSeverity}/10`
                                    : `${distribution.beneficiary
                                        .toBase58()
                                        .slice(0, 16)}...`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-theme-primary">
                                    ${formatCurrency(allocated)} {tokenSymbol}
                                  </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registered Beneficiaries Tab */}
          <TabsContent value="registered" className="space-y-4">
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle className="text-theme-text-highlight">
                  Registered Beneficiaries
                </CardTitle>
                <CardDescription className="text-theme-text/60">
                  Beneficiaries registered to receive funds from this pool
                </CardDescription>
              </CardHeader>
              <CardContent>
                {registrationsLoading || (isRefreshing && !loading) ? (
                  <div className="space-y-2">
                    {Array.from(
                      { length: 3 },
                      (_, i) => `registration-skeleton-${i}`,
                    ).map((key) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-theme-border"
                      >
                        <div className="h-10 w-10 rounded-full bg-theme-border animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-3 w-48 bg-theme-border rounded animate-pulse" />
                        </div>
                        <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : poolRegistrations.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-theme-text-highlight mb-2">
                      No beneficiaries registered yet
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      {pool.registrationLocked
                        ? "Registration is locked for this pool"
                        : "Register verified beneficiaries to this pool before distribution"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {poolRegistrations.map((registration) => {
                      const beneficiary = beneficiaries.find((b) =>
                        b.publicKey.equals(registration.beneficiary),
                      );

                      return (
                        <a
                          key={registration.publicKey.toString()}
                          href={`/beneficiaries/${registration.beneficiary.toBase58()}`}
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(
                              `/beneficiaries/${registration.beneficiary.toBase58()}`,
                            );
                          }}
                          className="flex items-center gap-3 p-3 rounded-lg border border-theme-border hover:border-theme-primary/50 hover:bg-theme-primary/5 transition-all cursor-pointer"
                        >
                          <div className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-theme-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {beneficiary?.name || "Unnamed Beneficiary"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {beneficiary
                                ? `Family: ${beneficiary.familySize} | Damage: ${beneficiary.damageSeverity}/10`
                                : `${registration.beneficiary
                                    .toBase58()
                                    .slice(0, 16)}...`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-theme-text">
                                Weight: {registration.allocationWeight}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  registration.registeredAt * 1000,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant={
                                registration.isDistributed
                                  ? "default"
                                  : "pending"
                              }
                            >
                              {registration.isDistributed
                                ? "Distributed"
                                : "Pending"}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Donations Tab */}
          <TabsContent value="donations" className="space-y-4">
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle className="text-theme-text-highlight">
                  Donation Activity
                </CardTitle>
                <CardDescription className="text-theme-text/60">
                  All donations made to this fund pool
                </CardDescription>
              </CardHeader>
              <CardContent>
                {donationsLoading || (isRefreshing && !loading) ? (
                  <div className="space-y-2">
                    {Array.from(
                      { length: 5 },
                      (_, i) => `donation-skeleton-${i}`,
                    ).map((key) => (
                      <div
                        key={key}
                        className="border border-theme-border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                          <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : poolDonations.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                      <DonationIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-theme-text-highlight mb-2">
                      No donations yet
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Be the first to support this relief effort by making a
                      donation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {poolDonations.map((donation) => {
                      const donationKey = donation.publicKey.toString();
                      const isExpanded = expandedDonations.has(donationKey);
                      const amount = donation.amount / 10 ** decimals;

                      return (
                        <div
                          key={donationKey}
                          className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                        >
                          <button
                            type="button"
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                            onClick={() => toggleExpanded(donationKey)}
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                            <DonationIcon className="h-4 w-4 text-theme-primary shrink-0" />
                            <span className="font-bold text-theme-text font-mono text-sm">
                              {donation.isAnonymous
                                ? "Anonymous Donor"
                                : donation.donor.toBase58()}
                            </span>
                            <span className="text-theme-text/60">donated</span>
                            <span className="font-semibold text-theme-primary">
                              ${formatCurrency(amount)} {tokenSymbol}
                            </span>
                            <div className="flex-1" />
                            <span className="text-xs text-theme-text/60 shrink-0">
                              {new Date(
                                donation.timestamp * 1000,
                              ).toLocaleDateString()}
                            </span>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-theme-border bg-theme-background/50 p-4 space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Donor
                                      </p>
                                      <p className="text-sm font-mono text-theme-text break-all">
                                        {donation.isAnonymous
                                          ? "Anonymous (hidden for privacy)"
                                          : donation.donor.toBase58()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Amount
                                      </p>
                                      <p className="text-sm text-theme-text">
                                        ${formatCurrency(amount)} {tokenSymbol}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Platform Fee
                                      </p>
                                      <p className="text-sm text-theme-text">
                                        $
                                        {formatCurrency(
                                          donation.platformFee / 1_000_000_000,
                                        )}{" "}
                                        {tokenSymbol}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Net Amount
                                      </p>
                                      <p className="text-sm text-theme-primary font-semibold">
                                        $
                                        {formatCurrency(
                                          donation.netAmount / 1_000_000_000,
                                        )}{" "}
                                        {tokenSymbol}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Date & Time
                                      </p>
                                      <p className="text-sm text-theme-text">
                                        {new Date(
                                          donation.timestamp * 1000,
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                    {donation.transactionSignature && (
                                      <div>
                                        <p className="text-xs text-theme-text/60 mb-1">
                                          Transaction
                                        </p>
                                        <a
                                          href={getExplorerUrl(
                                            donation.transactionSignature,
                                          )}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-theme-primary hover:underline flex items-center gap-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View on Explorer
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <p className="text-xs text-theme-text/60 mb-1">
                                      Message
                                    </p>
                                    <div className="text-sm bg-theme-card-bg p-3 rounded border border-theme-border">
                                      {donation.message &&
                                      donation.message.trim() !== "" ? (
                                        <p className="text-theme-text italic">
                                          "{donation.message}"
                                        </p>
                                      ) : (
                                        <p className="text-theme-text/60 italic">
                                          No message attached
                                        </p>
                                      )}
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
          </TabsContent>

          {/* Distributions Tab */}
          <TabsContent value="distributions" className="space-y-4">
            {/* Distribution Status Summary */}
            {poolDistributions.length > 0 && (
              <Card className="bg-theme-card-bg border-theme-border">
                <CardHeader>
                  <CardTitle className="text-theme-text-highlight">
                    Distribution Status
                  </CardTitle>
                  <CardDescription className="text-theme-text/60">
                    Overview of all fund allocations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const now = Math.floor(Date.now() / 1000);
                    const totalAllocated =
                      poolDistributions.reduce(
                        (sum, d) => sum + d.amountAllocated,
                        0,
                      ) / 1_000_000_000;
                    const totalClaimed =
                      poolDistributions.reduce(
                        (sum, d) => sum + d.amountClaimed,
                        0,
                      ) / 1_000_000_000;
                    const totalImmediate =
                      poolDistributions.reduce(
                        (sum, d) => sum + d.amountImmediate,
                        0,
                      ) / 1_000_000_000;
                    const totalLocked =
                      poolDistributions.reduce(
                        (sum, d) => sum + d.amountLocked,
                        0,
                      ) / 1_000_000_000;
                    const fullyClaimed = poolDistributions.filter(
                      (d) => d.isFullyClaimed,
                    ).length;
                    const pendingClaim = poolDistributions.filter(
                      (d) => !d.isFullyClaimed,
                    ).length;
                    const lockedDistributions = poolDistributions.filter(
                      (d) =>
                        d.unlockTime &&
                        d.unlockTime > now &&
                        !d.lockedClaimedAt,
                    );
                    const nextUnlock =
                      lockedDistributions.length > 0
                        ? Math.min(
                            ...lockedDistributions.map((d) => d.unlockTime!),
                          )
                        : null;
                    const timeToNextUnlock = nextUnlock ? nextUnlock - now : 0;
                    const days = Math.floor(timeToNextUnlock / 86400);
                    const hours = Math.floor((timeToNextUnlock % 86400) / 3600);

                    return (
                      <div className="space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                            <p className="text-xs text-theme-text/60 mb-1">
                              Total Allocated
                            </p>
                            <p className="text-xl font-bold text-theme-primary">
                              ${formatCurrency(totalAllocated)} {tokenSymbol}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                            <p className="text-xs text-theme-text/60 mb-1">
                              Total Claimed
                            </p>
                            <p className="text-xl font-bold text-green-500">
                              ${formatCurrency(totalClaimed)} {tokenSymbol}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                            <p className="text-xs text-theme-text/60 mb-1">
                              Immediate Funds
                            </p>
                            <p className="text-xl font-bold text-theme-text">
                              ${formatCurrency(totalImmediate)} {tokenSymbol}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                            <p className="text-xs text-theme-text/60 mb-1">
                              Locked Funds
                            </p>
                            <p className="text-xl font-bold text-yellow-500">
                              ${formatCurrency(totalLocked)} {tokenSymbol}
                            </p>
                          </div>
                        </div>

                        {/* Claim Status */}
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-theme-text">
                              {fullyClaimed} Fully Claimed
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <span className="text-sm text-theme-text">
                              {pendingClaim} Pending Claim
                            </span>
                          </div>
                          {lockedDistributions.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500" />
                              <span className="text-sm text-theme-text">
                                {lockedDistributions.length} Time-Locked
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Next Unlock Timer */}
                        {nextUnlock && timeToNextUnlock > 0 && (
                          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-yellow-500">
                                  ⏱️ Next Unlock
                                </p>
                                <p className="text-xs text-yellow-500/70 mt-1">
                                  {formatDate(nextUnlock, true)}
                                </p>
                              </div>
                              <div className="flex gap-3 text-center">
                                {days > 0 && (
                                  <div>
                                    <p className="text-2xl font-bold text-yellow-500">
                                      {days}
                                    </p>
                                    <p className="text-xs text-yellow-500/70">
                                      days
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-2xl font-bold text-yellow-500">
                                    {hours}
                                  </p>
                                  <p className="text-xs text-yellow-500/70">
                                    hours
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Distributions List */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle className="text-theme-text-highlight">
                  Distribution History
                </CardTitle>
                <CardDescription className="text-theme-text/60">
                  Individual fund allocations to beneficiaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {distributionsLoading ? (
                  <div className="space-y-2">
                    {Array.from(
                      { length: 2 },
                      (_, i) => `distribution-skeleton-${i}`,
                    ).map((key) => (
                      <div
                        key={key}
                        className="border border-theme-border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                          <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : poolDistributions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No distributions created yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {poolDistributions.map((distribution) => {
                      const distributionKey = distribution.publicKey.toString();
                      const isExpanded =
                        expandedDistributions.has(distributionKey);
                      const allocated =
                        distribution.amountAllocated / 1_000_000;
                      const immediate =
                        distribution.amountImmediate / 1_000_000;
                      const locked = distribution.amountLocked / 1_000_000;

                      return (
                        <div
                          key={distributionKey}
                          className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                        >
                          <button
                            type="button"
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                            onClick={() =>
                              toggleDistributionExpanded(distributionKey)
                            }
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                            <Users className="h-4 w-4 text-theme-primary shrink-0" />
                            <span className="text-theme-text/60">
                              Allocated
                            </span>
                            <span className="font-semibold text-theme-primary">
                              ${allocated.toFixed(2)} USDC
                            </span>
                            <span className="text-theme-text/60">
                              to beneficiary
                            </span>
                            <div className="flex-1" />
                            <span className="text-xs text-theme-text/60 shrink-0">
                              {new Date(
                                distribution.createdAt * 1000,
                              ).toLocaleDateString()}
                            </span>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-theme-border bg-theme-background/50 p-4 space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Beneficiary
                                      </p>
                                      <p className="text-sm font-mono text-theme-text break-all">
                                        {distribution.beneficiary.toBase58()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Total Allocated
                                      </p>
                                      <p className="text-sm text-theme-text">
                                        ${allocated.toFixed(2)} USDC
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Immediate Amount
                                      </p>
                                      <p className="text-sm text-theme-primary font-semibold">
                                        ${immediate.toFixed(2)} USDC
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Time-Locked Amount
                                      </p>
                                      <p className="text-sm text-theme-text">
                                        ${locked.toFixed(2)} USDC
                                      </p>
                                    </div>
                                    {distribution.unlockTime && (
                                      <div>
                                        <p className="text-xs text-theme-text/60 mb-1">
                                          Unlock Time
                                        </p>
                                        <p className="text-sm text-theme-text">
                                          {new Date(
                                            distribution.unlockTime * 1000,
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Status
                                      </p>
                                      <Badge
                                        variant={
                                          distribution.isFullyClaimed
                                            ? "default"
                                            : "pending"
                                        }
                                      >
                                        {distribution.isFullyClaimed
                                          ? "Fully Claimed"
                                          : "Pending Claim"}
                                      </Badge>
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
          </TabsContent>
        </Tabs>

        {/* Edit Pool Modal */}
        {pool && (
          <PoolCreationModal
            open={showEditModal}
            onOpenChange={(open) => {
              setShowEditModal(open);
              if (!open) {
                refetch();
              }
            }}
            pool={pool}
            mode="edit"
          />
        )}

        {/* Distribute Modal */}
        {pool && (
          <WideModal
            open={showDistributeModal}
            onOpenChange={setShowDistributeModal}
          >
            <WideModalContent>
              <div className="p-6 h-full overflow-y-auto">
                <WideModalTitle className="mb-6">
                  Distribute Funds
                </WideModalTitle>
                <DistributionForm
                  pool={pool}
                  onSuccess={() => {
                    setShowDistributeModal(false);
                    handleRefresh();
                  }}
                />
              </div>
            </WideModalContent>
          </WideModal>
        )}
      </main>
    </div>
  );
}
