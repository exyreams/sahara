"use client";

import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  SendHorizontal,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { BeneficiaryRegistrationModal } from "@/components/beneficiaries/beneficiary-registration-modal";
import { DisasterCreationModal } from "@/components/disasters/disaster-creation-modal";
import { DonationIcon } from "@/components/icons/donation-icon";
import { FundIcon } from "@/components/icons/fund-icon";
import { VerifiedIcon } from "@/components/icons/verified-icon";
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
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useDisasterCreator } from "@/hooks/use-disaster-creator";
import { useDisasters } from "@/hooks/use-disasters";
import { useDistributions } from "@/hooks/use-distributions";
import { useDonations } from "@/hooks/use-donations";
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { usePools } from "@/hooks/use-pools";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveActivityLogPDA,
  deriveDisasterPDA,
  derivePlatformConfigPDA,
} from "@/lib/anchor/pdas";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatSeverity,
} from "@/lib/formatters";

export default function DisasterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const { wallet, program } = useProgram();
  const { fieldWorkers } = useFieldWorkers();
  const {
    disasters,
    loading: disastersLoading,
    refetch: refetchDisasters,
  } = useDisasters();
  const {
    beneficiaries,
    loading: beneficiariesLoading,
    refetch: refetchBeneficiaries,
  } = useBeneficiaries();
  const { pools, loading: poolsLoading, refetch: refetchPools } = usePools();
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );

  const toggleActivityExpanded = (activityKey: string) => {
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activityKey)) {
        next.delete(activityKey);
      } else {
        next.add(activityKey);
      }
      return next;
    });
  };

  const getExplorerUrl = (signature: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  };

  // Check if current wallet is a field worker
  const currentFieldWorker = fieldWorkers.find(
    (fw) => fw.authority.toBase58() === wallet.publicKey?.toBase58(),
  );

  // Check if user can register beneficiaries (admin, verified NGO, or active field worker)
  // Only active field workers can register beneficiaries
  const canRegisterBeneficiary = currentFieldWorker?.isActive;

  const disaster = disasters.find((d) => d.eventId === id);
  const disasterBeneficiaries = beneficiaries.filter(
    (b) => b.disasterId === id,
  );
  const disasterPools = pools.filter((p) => p.disasterId === id);

  // Filter donations for this disaster (both direct and pool donations)
  const disasterDonations = donations.filter((d) => d.disasterId === id);

  // Filter distributions for this disaster
  const disasterDistributions = distributions.filter((dist) => {
    const pool = pools.find((p) => p.publicKey.equals(dist.pool));
    return pool?.disasterId === id;
  });

  // Combine and sort all activities by timestamp
  const allActivities = [
    ...disasterDonations.map((d) => ({
      type: "donation" as const,
      timestamp: d.timestamp,
      data: d,
    })),
    ...disasterDistributions.map((d) => ({
      type: "distribution" as const,
      timestamp: d.createdAt,
      data: d,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const loading =
    disastersLoading ||
    beneficiariesLoading ||
    poolsLoading ||
    donationsLoading ||
    distributionsLoading;

  // Get creator information
  const creatorInfo = useDisasterCreator(disaster?.authority);

  // Check if user can manage disaster (close/reopen)
  // Only the creator can close/reopen their disaster (not admin)
  const canManageDisaster =
    disaster && wallet.publicKey?.toBase58() === disaster.authority.toBase58();

  const { submit, isLoading: isUpdating } = useTransaction();
  const [showEditModal, setShowEditModal] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchDisasters(),
      refetchBeneficiaries(),
      refetchPools(),
      refetchDonations(),
      refetchDistributions(),
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Toggle disaster status
  const handleToggleStatus = async () => {
    if (!disaster || !wallet.publicKey || !program) return;

    await submit(
      async () => {
        // Generate timestamp for activity log
        const timestamp = Math.floor(Date.now() / 1000);

        const [disasterPDA] = deriveDisasterPDA(disaster.eventId);
        const [_configPDA] = derivePlatformConfigPDA();
        const [activityLogPDA] = deriveActivityLogPDA(
          wallet.publicKey as PublicKey,
          timestamp,
        );

        const tx = disaster.isActive
          ? await program.methods
              .closeDisaster(disaster.eventId, new BN(timestamp))
              .accounts({
                disaster: disasterPDA,
                activityLog: activityLogPDA,
                authority: wallet.publicKey as PublicKey,
              })
              .rpc()
          : await program.methods
              .reopenDisaster(disaster.eventId, new BN(timestamp))
              .accounts({
                disaster: disasterPDA,
                activityLog: activityLogPDA,
                authority: wallet.publicKey as PublicKey,
              })
              .rpc();

        return tx;
      },
      {
        successMessage: `Disaster ${
          disaster.isActive ? "closed" : "reopened"
        } successfully`,
        onSuccess: () => {
          window.location.reload();
        },
      },
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            {/* Back button */}
            <div className="h-10 w-32 bg-theme-border rounded" />

            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Title with badges */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 bg-theme-border rounded w-1/2" />
                    <div className="h-6 w-16 bg-theme-border rounded" />
                    <div className="h-6 w-20 bg-theme-border rounded" />
                  </div>
                  {/* Location and date */}
                  <div className="h-4 bg-theme-border rounded w-1/3" />
                  {/* Description */}
                  <div className="space-y-2">
                    <div className="h-4 bg-theme-border rounded w-full" />
                    <div className="h-4 bg-theme-border rounded w-3/4" />
                  </div>
                  {/* Creator info skeleton */}
                  <div className="border-t border-theme-border pt-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 bg-theme-border rounded w-20" />
                      <div className="h-5 bg-theme-border rounded w-24" />
                      <div className="h-4 bg-theme-border rounded w-4" />
                      <div className="h-4 bg-theme-border rounded w-16" />
                      <div className="h-4 bg-theme-border rounded w-64" />
                    </div>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex gap-3">
                  <div className="h-10 w-48 bg-theme-border rounded" />
                  <div className="h-10 w-40 bg-theme-border rounded" />
                </div>
              </div>
            </div>

            {/* Statistics cards */}
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={`stat-card-${i}`}
                  className="h-32 bg-theme-card-bg border border-theme-border rounded-lg p-6"
                >
                  <div className="space-y-3">
                    <div className="h-4 bg-theme-border rounded w-2/3" />
                    <div className="h-8 bg-theme-border rounded w-1/2" />
                    <div className="h-3 bg-theme-border rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>

            {/* Beneficiaries and Pools Lists */}
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div
                  key={`detail-card-${i}`}
                  className="bg-theme-card-bg border border-theme-border rounded-lg"
                >
                  <div className="p-6 border-b border-theme-border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-5 bg-theme-border rounded w-32" />
                        <div className="h-4 bg-theme-border rounded w-40" />
                      </div>
                      <div className="h-8 w-20 bg-theme-border rounded" />
                    </div>
                  </div>
                  <div className="p-6 space-y-2">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="flex items-center gap-3 p-3 rounded-lg border border-theme-border"
                      >
                        <div className="h-10 w-10 bg-theme-border rounded-full animate-pulse shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Feed */}
            <div className="bg-theme-card-bg border border-theme-border rounded-lg">
              <div className="p-6 border-b border-theme-border">
                <div className="space-y-2">
                  <div className="h-5 bg-theme-border rounded w-32" />
                  <div className="h-4 bg-theme-border rounded w-64" />
                </div>
              </div>
              <div className="p-6 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={`activity-skeleton-${i}`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-theme-border"
                  >
                    <div className="h-4 w-4 bg-theme-border rounded-full animate-pulse shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-theme-border rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-theme-border rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!disaster) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Disaster Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The disaster event you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link href="/disasters">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Disasters
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const severity = formatSeverity(disaster.severity);
  const verifiedBeneficiaries = disasterBeneficiaries.filter(
    (b) => b.verificationStatus === "Verified",
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/disasters">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Disasters
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl font-bold tracking-tight text-theme-primary">
                  {disaster.name}
                </h1>
                <Badge variant={disaster.isActive ? "default" : "log_action"}>
                  {disaster.isActive ? "Active" : "Closed"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    severity.color === "red"
                      ? "border-red-500 text-red-500 bg-red-500/10"
                      : severity.color === "orange"
                        ? "border-orange-500 text-orange-500 bg-orange-500/10"
                        : severity.color === "yellow"
                          ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                          : "border-green-500 text-green-500 bg-green-500/10"
                  }
                >
                  {severity.label} Severity
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span>
                  {disaster.location.district}, Ward {disaster.location.ward}
                </span>
                <span>•</span>
                <Calendar className="h-4 w-4" />
                <span>{formatDate(disaster.declaredAt)}</span>
              </div>
              {disaster.description && (
                <p className="text-muted-foreground mb-4">
                  {disaster.description}
                </p>
              )}
              {disaster.affectedAreas.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Affected Areas:</span>{" "}
                  {disaster.affectedAreas.join(", ")}
                </div>
              )}
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
              {canRegisterBeneficiary && (
                <Button onClick={() => setShowRegisterModal(true)} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Register Beneficiary
                </Button>
              )}
              {canManageDisaster && (
                <Button
                  onClick={() => setShowEditModal(true)}
                  size="lg"
                  variant="outline"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Disaster
                </Button>
              )}
              {canManageDisaster && (
                <Button
                  onClick={() => setShowCloseConfirmation(true)}
                  size="lg"
                  variant={disaster.isActive ? "destructive" : "default"}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {disaster.isActive ? "Close Disaster" : "Reopen Disaster"}
                </Button>
              )}
            </div>
          </div>

          {/* Creator Information - Full Width Border */}
          {!creatorInfo.loading && (
            <div className="text-sm text-muted-foreground border-t border-theme-border pt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Created by:</span>
                {creatorInfo.type === "admin" ? (
                  <Badge variant="default" className="text-xs">
                    Platform Admin
                  </Badge>
                ) : creatorInfo.type === "ngo" && creatorInfo.name ? (
                  <>
                    <span className="font-medium text-theme-text">
                      {creatorInfo.name}
                    </span>
                    <VerifiedIcon className="w-4 h-4" tooltip="Verified NGO" />
                  </>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Unknown
                  </Badge>
                )}
                <span>|</span>
                <span>Address:</span>
                <span className="text-xs font-mono text-theme-primary break-all">
                  {creatorInfo.address}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Beneficiary Registration Modal */}
        <BeneficiaryRegistrationModal
          open={showRegisterModal}
          onOpenChange={setShowRegisterModal}
          disasterId={id}
        />

        {/* Close/Reopen Confirmation Modal */}
        <ConfirmationModal
          isOpen={showCloseConfirmation}
          onClose={() => setShowCloseConfirmation(false)}
          onConfirm={() => {
            handleToggleStatus();
            setShowCloseConfirmation(false);
          }}
          title={disaster.isActive ? "Close Disaster" : "Reopen Disaster"}
          description={
            disaster.isActive
              ? "Closing this disaster will stop new beneficiary registrations and donations. Existing beneficiaries and fund pools will remain accessible."
              : "Reopening this disaster will allow new beneficiary registrations and donations again."
          }
          itemTitle={disaster.name}
          itemDescription={`${disaster.location.district}, Ward ${disaster.location.ward}`}
          confirmText={disaster.isActive ? "Close Disaster" : "Reopen Disaster"}
          type={disaster.isActive ? "warning" : "info"}
          isLoading={isUpdating}
        />

        {/* Edit Disaster Modal */}
        <DisasterCreationModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          disaster={disaster}
          mode="edit"
          onSuccess={handleRefresh}
        />

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Aid</CardTitle>
              <FundIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing && !loading ? (
                <div className="h-9 w-36 bg-theme-border rounded animate-pulse" />
              ) : (
                <div className="text-3xl font-bold text-theme-primary">
                  {formatCurrency(disaster.totalAidDistributed)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Beneficiaries
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing && !loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatNumber(disaster.totalBeneficiaries)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(disaster.verifiedBeneficiaries)} verified
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fund Pools</CardTitle>
              <FundIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing && !loading ? (
                <div className="space-y-2">
                  <div className="h-8 w-12 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-20 bg-theme-border rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {disasterPools.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {disasterPools.filter((p) => p.isActive).length} active
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Affected Population
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isRefreshing && !loading ? (
                <div className="h-8 w-24 bg-theme-border rounded animate-pulse" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatNumber(disaster.estimatedAffectedPopulation)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Beneficiaries and Pools */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Beneficiaries List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Beneficiaries</CardTitle>
                  <CardDescription>
                    {verifiedBeneficiaries.length} verified of{" "}
                    {disasterBeneficiaries.length} total
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/beneficiaries?disaster=${id}`}>
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isRefreshing && !loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, i) => `pool-refresh-${i}`).map(
                    (key) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-theme-border"
                      >
                        <div className="h-10 w-10 bg-theme-border rounded-full animate-pulse shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : disasterBeneficiaries.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No beneficiaries registered yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {disasterBeneficiaries.slice(0, 5).map((beneficiary) => (
                    <Link
                      key={beneficiary.publicKey.toBase58()}
                      href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-theme-border hover:border-theme-primary/50 hover:bg-theme-primary/5 transition-all cursor-pointer">
                        <div className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-theme-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {beneficiary.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {beneficiary.location.district}, Ward{" "}
                            {beneficiary.location.ward}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {beneficiary.verificationStatus === "Verified" ? (
                            <Badge variant="default" className="text-xs">
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="pending" className="text-xs">
                              Pending
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {disasterBeneficiaries.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/beneficiaries?disaster=${id}`}>
                        View {disasterBeneficiaries.length - 5} more
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pools List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fund Pools</CardTitle>
                  <CardDescription>
                    {disasterPools.filter((p) => p.isActive).length} active of{" "}
                    {disasterPools.length} total
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/pools?disaster=${id}`}>
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isRefreshing && !loading ? (
                <div className="space-y-2">
                  {Array.from(
                    { length: 3 },
                    (_, i) => `beneficiary-refresh-${i}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-theme-border"
                    >
                      <div className="h-10 w-10 bg-theme-border rounded-full animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                        <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : disasterPools.length === 0 ? (
                <div className="text-center py-8">
                  <FundIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No fund pools created yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {disasterPools.slice(0, 5).map((pool) => (
                    <Link
                      key={pool.publicKey.toBase58()}
                      href={`/pools/${pool.publicKey.toBase58()}`}
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-theme-border hover:border-theme-primary/50 hover:bg-theme-primary/5 transition-all cursor-pointer">
                        <div className="h-10 w-10 rounded-full bg-theme-primary/10 flex items-center justify-center shrink-0">
                          <FundIcon className="h-5 w-5 text-theme-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {pool.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(pool.totalDeposited)} raised
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pool.isActive ? (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Closed
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {disasterPools.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/pools?disaster=${id}`}>
                        View {disasterPools.length - 5} more
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Donations and aid distributions for this disaster
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isRefreshing && !loading) ||
            (donationsLoading && !loading) ||
            (distributionsLoading && !loading) ? (
              <div className="space-y-3">
                {Array.from(
                  { length: 5 },
                  (_, i) => `distribution-skeleton-${i}`,
                ).map((key) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-theme-border"
                  >
                    <div className="h-4 w-4 bg-theme-border rounded-full animate-pulse shrink-0 mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-theme-border rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-theme-border rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : allActivities.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <DonationIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                <p className="text-sm text-muted-foreground">
                  Donations and distributions will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {allActivities.slice(0, 20).map((activity, index) => {
                  const activityKey = `${activity.type}-${index}`;
                  const isExpanded = expandedActivities.has(activityKey);

                  if (activity.type === "donation") {
                    const donation = activity.data;
                    const amount = donation.amount / 1_000_000;
                    const beneficiary = beneficiaries.find((b) =>
                      b.publicKey.equals(donation.recipient),
                    );
                    const pool = pools.find(
                      (p) => donation.pool && p.publicKey.equals(donation.pool),
                    );

                    return (
                      <div
                        key={activityKey}
                        className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                      >
                        {/* Collapsed View */}
                        <button
                          type="button"
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                          onClick={() => toggleActivityExpanded(activityKey)}
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                          <DonationIcon className="h-4 w-4 text-theme-primary shrink-0" />
                          <span className="text-sm text-theme-text/60">
                            {donation.isAnonymous
                              ? "Anonymous"
                              : `${donation.donor
                                  .toBase58()
                                  .slice(0, 8)}...${donation.donor
                                  .toBase58()
                                  .slice(-6)}`}
                          </span>
                          <span className="text-sm text-theme-text/60">
                            donated
                          </span>
                          <span className="font-semibold text-theme-primary">
                            ${amount.toFixed(2)} USDC
                          </span>
                          {pool && (
                            <>
                              <span className="text-sm text-theme-text/60">
                                to
                              </span>
                              <span className="text-sm font-medium text-theme-text truncate">
                                {pool.name}
                              </span>
                            </>
                          )}
                          {beneficiary && !pool && (
                            <>
                              <span className="text-sm text-theme-text/60">
                                to
                              </span>
                              <span className="text-sm font-medium text-theme-text truncate">
                                {beneficiary.name}
                              </span>
                            </>
                          )}
                          <div className="flex-1" />
                          <span className="text-xs text-theme-text/60 shrink-0">
                            {new Date(
                              donation.timestamp * 1000,
                            ).toLocaleDateString()}
                          </span>
                        </button>

                        {/* Expanded View */}
                        {isExpanded && (
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
                                  ${amount.toFixed(2)} USDC
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Recipient
                                </p>
                                {pool ? (
                                  <Link
                                    href={`/pools/${pool.publicKey.toBase58()}`}
                                    className="text-sm text-theme-primary hover:underline flex items-center gap-1"
                                  >
                                    {pool.name}
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ) : beneficiary ? (
                                  <Link
                                    href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                                    className="text-sm text-theme-primary hover:underline flex items-center gap-1"
                                  >
                                    {beneficiary.name}
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ) : (
                                  <p className="text-sm text-theme-text">
                                    Unknown
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Date
                                </p>
                                <p className="text-sm text-theme-text">
                                  {new Date(
                                    donation.timestamp * 1000,
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Platform Fee
                                </p>
                                <p className="text-sm text-theme-text">
                                  $
                                  {(donation.platformFee / 1_000_000).toFixed(
                                    2,
                                  )}{" "}
                                  USDC
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Transaction
                                </p>
                                <a
                                  href={getExplorerUrl(
                                    donation.publicKey.toBase58(),
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-theme-primary hover:underline flex items-center gap-1"
                                >
                                  View on Explorer
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    const distribution = activity.data;
                    const amount = distribution.amountAllocated / 1_000_000;
                    const beneficiary = beneficiaries.find((b) =>
                      b.publicKey.equals(distribution.beneficiary),
                    );
                    const pool = pools.find((p) =>
                      p.publicKey.equals(distribution.pool),
                    );

                    return (
                      <div
                        key={activityKey}
                        className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                      >
                        {/* Collapsed View */}
                        <button
                          type="button"
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                          onClick={() => toggleActivityExpanded(activityKey)}
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                          <SendHorizontal className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-sm text-theme-text/60">
                            Distributed
                          </span>
                          <span className="font-semibold text-green-500">
                            ${amount.toFixed(2)} USDC
                          </span>
                          <span className="text-sm text-theme-text/60">
                            from
                          </span>
                          <span className="text-sm font-medium text-theme-text truncate">
                            {pool?.name || "Pool"}
                          </span>
                          <span className="text-sm text-theme-text/60">to</span>
                          <span className="text-sm font-medium text-theme-text truncate">
                            {beneficiary?.name || "Beneficiary"}
                          </span>
                          <div className="flex-1" />
                          <span className="text-xs text-theme-text/60 shrink-0">
                            {new Date(
                              distribution.createdAt * 1000,
                            ).toLocaleDateString()}
                          </span>
                        </button>

                        {/* Expanded View */}
                        {isExpanded && (
                          <div className="border-t border-theme-border bg-theme-background/50 p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  From Pool
                                </p>
                                {pool ? (
                                  <Link
                                    href={`/pools/${pool.publicKey.toBase58()}`}
                                    className="text-sm text-theme-primary hover:underline flex items-center gap-1"
                                  >
                                    {pool.name}
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ) : (
                                  <p className="text-sm text-theme-text">
                                    Unknown Pool
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  To Beneficiary
                                </p>
                                {beneficiary ? (
                                  <Link
                                    href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                                    className="text-sm text-theme-primary hover:underline flex items-center gap-1"
                                  >
                                    {beneficiary.name}
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ) : (
                                  <p className="text-sm text-theme-text">
                                    Unknown Beneficiary
                                  </p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Amount Allocated
                                </p>
                                <p className="text-sm text-theme-text">
                                  ${amount.toFixed(2)} USDC
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Amount Claimed
                                </p>
                                <p className="text-sm text-theme-text">
                                  $
                                  {(
                                    distribution.amountClaimed / 1_000_000
                                  ).toFixed(2)}{" "}
                                  USDC
                                </p>
                              </div>
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
                                    : "Pending"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Date
                                </p>
                                <p className="text-sm text-theme-text">
                                  {new Date(
                                    distribution.createdAt * 1000,
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {distribution.notes && (
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Notes
                                </p>
                                <p className="text-sm text-theme-text">
                                  {distribution.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
