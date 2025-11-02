"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Flag,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { BeneficiaryRegistrationModal } from "@/components/beneficiaries/beneficiary-registration-modal";
import { DonateModal } from "@/components/beneficiaries/donate-modal";
import { FlagBeneficiaryModal } from "@/components/beneficiaries/flag-beneficiary-modal";
import { VerifyButton } from "@/components/beneficiaries/verify-button";
import { DonationIcon } from "@/components/icons/donation-icon";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useDisasters } from "@/hooks/use-disasters";
import { useDonations } from "@/hooks/use-donations";
import { useFieldWorker } from "@/hooks/use-field-worker";
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { VERIFICATION_THRESHOLD } from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatVerificationStatus,
} from "@/lib/formatters";

export default function BeneficiaryProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    beneficiaries,
    loading,
    refetch: refetchBeneficiaries,
  } = useBeneficiaries();
  const { wallet } = useProgram();
  const { isFieldWorker } = useFieldWorker();
  const { disasters } = useDisasters();
  const { fieldWorkers } = useFieldWorkers();
  const { config } = usePlatformConfig();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    loading: donationsLoading,
    refetch: refetchDonations,
    filterByRecipient,
  } = useDonations();
  const [expandedDonations, setExpandedDonations] = useState<Set<string>>(
    new Set()
  );

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchBeneficiaries(), refetchDonations()]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Get verification threshold from platform config, fallback to constant
  const verificationThreshold =
    config?.verificationThreshold || VERIFICATION_THRESHOLD;

  const beneficiary = beneficiaries.find((b) => b.authority.toBase58() === id);

  // Only show loading skeleton if we don't have the beneficiary data yet (first load)
  const isLoading = !beneficiary && loading;

  // Find the field worker who registered this beneficiary
  const registeredByWorker = beneficiary
    ? fieldWorkers.find(
        (fw) => fw.authority.toBase58() === beneficiary.registeredBy.toBase58()
      )
    : null;

  // Find the disaster this beneficiary is registered for
  const disaster = beneficiary
    ? disasters.find((d) => d.eventId === beneficiary.disasterId)
    : null;

  // Check if current user is the field worker who registered this beneficiary (can edit)
  const canEdit =
    wallet.publicKey?.toBase58() === beneficiary?.registeredBy.toBase58();

  // Field workers can flag beneficiaries that are not yet verified
  const canFlag =
    isFieldWorker &&
    beneficiary &&
    formatVerificationStatus(beneficiary.verificationStatus) !== "Verified";

  // Check if the connected wallet is the beneficiary themselves (hide donate button)
  const isOwnProfile =
    wallet.publicKey?.toBase58() === beneficiary?.authority.toBase58();

  // Filter donations for this beneficiary (fetched from blockchain)
  // Note: recipient is the beneficiary PDA (publicKey), not the authority wallet
  const beneficiaryDonations = beneficiary
    ? filterByRecipient(beneficiary.publicKey).sort(
        (a, b) => b.timestamp - a.timestamp
      )
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

  const getExplorerUrl = (signature: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Back Button Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />
              <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />
            </div>
          </div>

          <div className="space-y-6">
            {/* Action Alert Card Skeleton */}
            <Card className="border-theme-border bg-theme-card-bg">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-full max-w-md bg-theme-border rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-24 bg-theme-border rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-10 w-full bg-theme-border rounded animate-pulse" />
              </CardContent>
            </Card>

            {/* Tabs Skeleton */}
            <div className="space-y-4">
              {/* Tab List Skeleton */}
              <div className="flex gap-2 border-b border-theme-border">
                <div className="h-12 w-32 bg-theme-border rounded-t animate-pulse" />
                <div className="h-12 w-32 bg-theme-border rounded-t animate-pulse" />
              </div>

              {/* Tab Content Skeleton */}
              <Card className="bg-theme-card-bg border-theme-border">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-64 bg-theme-border rounded animate-pulse" />
                        <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Aid Received Skeleton */}
                  <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                    <div className="h-3 w-32 bg-theme-border rounded animate-pulse mb-2" />
                    <div className="h-8 w-40 bg-theme-border rounded animate-pulse" />
                  </div>

                  {/* Quick Stats Grid Skeleton */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from(
                      { length: 4 },
                      (_, i) => `stat-skeleton-${i}`
                    ).map((key) => (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border"
                      >
                        <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-16 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Verification Status Skeleton */}
                  <div className="p-4 rounded-lg bg-theme-background border border-theme-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      <div className="h-6 w-24 bg-theme-border rounded animate-pulse" />
                    </div>
                    <div className="h-2 w-full bg-theme-border rounded-full animate-pulse" />
                    <div className="h-3 w-48 bg-theme-border rounded animate-pulse" />
                  </div>

                  {/* Details Section Skeleton */}
                  <div className="space-y-3">
                    <div className="h-5 w-24 bg-theme-border rounded animate-pulse" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Array.from(
                        { length: 4 },
                        (_, i) => `detail-skeleton-${i}`
                      ).map((key) => (
                        <div
                          key={key}
                          className="flex justify-between items-center p-3 rounded-lg bg-theme-background border border-theme-border"
                        >
                          <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Beneficiary Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The beneficiary you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link href="/beneficiaries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Beneficiaries
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link href="/beneficiaries">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Beneficiaries
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            {!isOwnProfile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={
                        formatVerificationStatus(
                          beneficiary.verificationStatus
                        ) !== "Verified"
                          ? "cursor-not-allowed"
                          : ""
                      }
                    >
                      <Button
                        onClick={() => setShowDonateModal(true)}
                        size="lg"
                        disabled={
                          formatVerificationStatus(
                            beneficiary.verificationStatus
                          ) !== "Verified"
                        }
                        className={
                          formatVerificationStatus(
                            beneficiary.verificationStatus
                          ) !== "Verified"
                            ? "cursor-not-allowed"
                            : "cursor-pointer"
                        }
                      >
                        <DonationIcon className="mr-2 h-4 w-4" />
                        {wallet.connected
                          ? "Donate"
                          : "Connect Wallet to Donate"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {formatVerificationStatus(beneficiary.verificationStatus) !==
                    "Verified" && (
                    <TooltipContent>
                      <p>
                        {formatVerificationStatus(
                          beneficiary.verificationStatus
                        ) === "Rejected"
                          ? "This beneficiary is rejected and cannot receive donations"
                          : formatVerificationStatus(
                              beneficiary.verificationStatus
                            ) === "Flagged"
                          ? "This beneficiary is flagged and cannot receive donations"
                          : "Verification needed before donations can be accepted"}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            {canEdit && (
              <Button
                onClick={() => setShowEditModal(true)}
                variant="outline"
                size="lg"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
            )}
            {canFlag && (
              <Button
                onClick={() => setShowFlagModal(true)}
                variant="outline"
                size="lg"
              >
                <Flag className="mr-2 h-4 w-4" />
                Flag for Review
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Action Alert Card - Only visible to field workers */}
          {isFieldWorker &&
            formatVerificationStatus(beneficiary.verificationStatus) ===
              "Pending" &&
            (() => {
              const hasVerified =
                wallet.publicKey &&
                beneficiary.verifierApprovals.some(
                  (verifier) =>
                    verifier.toBase58() === wallet.publicKey?.toBase58()
                );

              if (hasVerified) {
                // Show success message if current user has already verified
                return (
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            You've Verified This Beneficiary
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Thank you for your verification. This beneficiary
                            needs{" "}
                            {verificationThreshold -
                              beneficiary.verifierApprovals.length}{" "}
                            more approval
                            {verificationThreshold -
                              beneficiary.verifierApprovals.length ===
                            1
                              ? ""
                              : "s"}{" "}
                            from other field workers to be fully verified.
                          </CardDescription>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                          {beneficiary.verifierApprovals.length}/
                          {verificationThreshold} Approvals
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                );
              }

              // Show verification prompt if user hasn't verified yet
              return (
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2 text-yellow-500">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          Pending Verification
                        </CardTitle>
                        <CardDescription className="mt-1">
                          This beneficiary needs{" "}
                          {verificationThreshold -
                            beneficiary.verifierApprovals.length}{" "}
                          more field worker approval
                          {verificationThreshold -
                            beneficiary.verifierApprovals.length ===
                          1
                            ? ""
                            : "s"}{" "}
                          to be verified.
                        </CardDescription>
                      </div>
                      <Badge variant="pending">
                        {beneficiary.verifierApprovals.length}/
                        {verificationThreshold} Approvals
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <VerifyButton
                      beneficiary={beneficiary}
                      onSuccess={handleRefresh}
                    />
                  </CardContent>
                </Card>
              );
            })()}

          {formatVerificationStatus(beneficiary.verificationStatus) ===
            "Verified" && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Verified Beneficiary
                    </CardTitle>
                    <CardDescription className="mt-1">
                      This beneficiary has been verified and can receive direct
                      aid donations.
                    </CardDescription>
                  </div>
                  <Badge variant="default">Verified</Badge>
                </div>
              </CardHeader>
            </Card>
          )}

          {formatVerificationStatus(beneficiary.verificationStatus) ===
            "Flagged" && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-yellow-500">
                        <Flag className="h-5 w-5 text-yellow-500" />
                        Flagged for Review
                      </CardTitle>
                      <CardDescription className="mt-1">
                        This beneficiary has been flagged and is under review.
                      </CardDescription>
                    </div>
                    {beneficiary.flaggedReason && (
                      <div className="space-y-1">
                        <p className="text-xs text-theme-text/60">Reason</p>
                        <div className="p-3 rounded-lg bg-theme-background/50 border border-yellow-500/20">
                          <p className="text-sm text-theme-text italic">
                            "{beneficiary.flaggedReason}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="border-yellow-500 text-yellow-500 bg-yellow-500/10"
                  >
                    Flagged
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          )}

          {formatVerificationStatus(beneficiary.verificationStatus) ===
            "Rejected" && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Rejected Beneficiary
                      </CardTitle>
                      <CardDescription className="mt-1">
                        This beneficiary has been rejected and cannot receive
                        donations.
                      </CardDescription>
                    </div>
                    {beneficiary.flaggedReason && (
                      <div className="space-y-1">
                        <p className="text-xs text-theme-text/60">Reason</p>
                        <div className="p-3 rounded-lg bg-theme-background/50 border border-red-500/20">
                          <p className="text-sm text-theme-text italic">
                            "{beneficiary.flaggedReason}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="border-red-500 text-red-500 bg-red-500/10"
                  >
                    Rejected
                  </Badge>
                </div>
              </CardHeader>
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
                value="activity"
                className="text-base px-6 cursor-pointer"
              >
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <CardTitle className="text-3xl text-theme-text-highlight">
                          {beneficiary.name}
                        </CardTitle>
                        {formatVerificationStatus(
                          beneficiary.verificationStatus
                        ) === "Verified" ? (
                          <VerifiedIcon
                            className="h-6 w-6"
                            tooltip="Verified Beneficiary"
                          />
                        ) : (
                          <Badge variant="pending">
                            {formatVerificationStatus(
                              beneficiary.verificationStatus
                            )}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {beneficiary.location.district}, Ward{" "}
                        {beneficiary.location.ward}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Aid Received */}
                  <div className="p-4 rounded-lg bg-linear-to-br from-theme-primary/10 to-theme-primary/5 border border-theme-primary/20">
                    <p className="text-xs text-theme-text/60 mb-2">
                      Total Aid Received
                    </p>
                    {isRefreshing ? (
                      <div className="h-9 w-32 bg-theme-border rounded animate-pulse" />
                    ) : (
                      <p className="text-3xl font-bold text-theme-primary">
                        {formatCurrency(beneficiary.totalReceived)}
                      </p>
                    )}
                  </div>
                  {/* Quick Stats Grid */}
                  {isRefreshing ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {Array.from(
                        { length: 4 },
                        (_, i) => `refresh-skeleton-${i}`
                      ).map((key) => (
                        <div
                          key={key}
                          className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border"
                        >
                          <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-3 w-16 bg-theme-border rounded animate-pulse" />
                            <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border">
                        <Phone className="h-5 w-5 text-theme-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-theme-text/60">Phone</p>
                          <p className="text-sm font-medium truncate">
                            {beneficiary.phoneNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border">
                        <User className="h-5 w-5 text-theme-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-theme-text/60">
                            Age & Gender
                          </p>
                          <p className="text-sm font-medium">
                            {beneficiary.age} years, {beneficiary.gender}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border">
                        <Users className="h-5 w-5 text-theme-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-theme-text/60">
                            Family Size
                          </p>
                          <p className="text-sm font-medium">
                            {beneficiary.familySize} members
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border">
                        <Calendar className="h-5 w-5 text-theme-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-theme-text/60">
                            Registered
                          </p>
                          <p className="text-sm font-medium">
                            {formatDate(beneficiary.registeredAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification Status with Progress */}
                  {isRefreshing ? (
                    <div className="p-4 rounded-lg bg-theme-background border border-theme-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                        <div className="h-6 w-24 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="w-full bg-theme-border rounded-full h-2 animate-pulse" />
                        <div className="h-3 w-40 bg-theme-border rounded animate-pulse" />
                      </div>
                      {/* Verified By skeleton - only show if there are verifications */}
                      {beneficiary.verifierApprovals.length > 0 && (
                        <div className="pt-3 border-t border-theme-border space-y-3">
                          <div className="h-3 w-20 bg-theme-border rounded animate-pulse" />
                          <div className="space-y-2">
                            {Array.from({
                              length: Math.min(
                                beneficiary.verifierApprovals.length,
                                3
                              ),
                            })
                              .map((_, i) => `verifier-skeleton-${i}`)
                              .map((key) => (
                                <div
                                  key={key}
                                  className="flex items-center gap-3 p-2 rounded-lg bg-theme-card-bg border border-theme-border"
                                >
                                  <div className="h-4 w-4 bg-theme-border rounded-full animate-pulse shrink-0" />
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                                    <div className="h-3 w-24 bg-theme-border rounded animate-pulse" />
                                    <div className="h-3 w-full bg-theme-border rounded animate-pulse" />
                                  </div>
                                  <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-theme-background border border-theme-border space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-base text-theme-text-highlight">
                          Verification Status
                        </h4>
                        <Badge
                          variant={
                            formatVerificationStatus(
                              beneficiary.verificationStatus
                            ) === "Verified"
                              ? "default"
                              : "pending"
                          }
                        >
                          {beneficiary.verifierApprovals.length}/
                          {verificationThreshold} Approvals
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full bg-theme-border rounded-full h-2">
                          <div
                            className="bg-theme-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (beneficiary.verifierApprovals.length /
                                  verificationThreshold) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-theme-text/60">
                          {beneficiary.verifierApprovals.length >=
                          verificationThreshold
                            ? "Verification complete"
                            : `${
                                verificationThreshold -
                                beneficiary.verifierApprovals.length
                              } more approval${
                                verificationThreshold -
                                  beneficiary.verifierApprovals.length ===
                                1
                                  ? ""
                                  : "s"
                              } needed`}
                        </p>
                      </div>

                      {/* Verified By Field Workers */}
                      {beneficiary.verifierApprovals.length > 0 && (
                        <div className="pt-3 border-t border-theme-border">
                          <h5 className="text-xs font-medium text-theme-text/60 mb-3">
                            Verified By:
                          </h5>
                          <div className="space-y-2">
                            {beneficiary.verifierApprovals.map(
                              (verifierAddress) => {
                                const verifier = fieldWorkers.find(
                                  (fw) =>
                                    fw.authority.toBase58() ===
                                    verifierAddress.toBase58()
                                );

                                return (
                                  <div
                                    key={verifierAddress.toBase58()}
                                    className="flex items-center gap-3 p-2 rounded-lg bg-theme-card-bg border border-theme-border"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      {verifier ? (
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium text-theme-text-highlight">
                                            {verifier.name}
                                          </p>
                                          <p className="text-xs text-theme-text/60">
                                            {verifier.organization}
                                          </p>
                                          <p className="text-xs font-mono text-theme-text/50 break-all">
                                            {verifierAddress.toBase58()}
                                          </p>
                                        </div>
                                      ) : (
                                        <p className="text-xs font-mono text-theme-text/60 break-all">
                                          {verifierAddress.toBase58()}
                                        </p>
                                      )}
                                    </div>
                                    {verifier && (
                                      <Badge
                                        variant={
                                          verifier.isActive
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {verifier.isActive
                                          ? "Active"
                                          : "Inactive"}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details Section */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg text-theme-text-highlight">
                      Details
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-theme-background border border-theme-border">
                        <span className="text-sm text-theme-text/60">
                          National ID
                        </span>
                        <span className="text-sm font-medium">
                          {beneficiary.nationalId}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-theme-background border border-theme-border">
                        <span className="text-sm text-theme-text/60">
                          Disaster
                        </span>
                        <span className="text-sm font-medium">
                          {beneficiary.disasterId}
                        </span>
                      </div>
                      {beneficiary.occupation && (
                        <div className="flex justify-between items-center p-3 rounded-lg bg-theme-background border border-theme-border">
                          <span className="text-sm text-theme-text/60">
                            Occupation
                          </span>
                          <span className="text-sm font-medium">
                            {beneficiary.occupation}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-3 rounded-lg bg-theme-background border border-theme-border">
                        <span className="text-sm text-theme-text/60">
                          Damage Severity
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
                    </div>

                    {/* Wallet Address - Full */}
                    <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                      <p className="text-xs text-theme-text/60 mb-1">
                        Wallet Address
                      </p>
                      <p className="text-sm font-mono break-all text-theme-text">
                        {beneficiary.authority.toBase58()}
                      </p>
                    </div>
                  </div>

                  {/* Damage Description */}
                  {beneficiary.damageDescription && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg text-theme-text-highlight">
                        Damage Description
                      </h4>
                      <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                        <p className="text-sm text-theme-text/80 leading-relaxed">
                          {beneficiary.damageDescription}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Special Needs */}
                  {beneficiary.specialNeeds && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg text-theme-text-highlight">
                        Special Needs
                      </h4>
                      <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                        <p className="text-sm text-theme-text/80 leading-relaxed">
                          {beneficiary.specialNeeds}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Registration Information */}
                  <div className="space-y-4 pt-6 border-t border-theme-border">
                    <h4 className="font-semibold text-lg text-theme-text-highlight">
                      Registration Information
                    </h4>

                    {/* Field Worker Info */}
                    <div>
                      <h5 className="text-sm font-medium text-theme-text/70 mb-2">
                        Registered By
                      </h5>
                      {registeredByWorker ? (
                        <div className="p-4 rounded-lg bg-theme-background border border-theme-border space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div>
                                <p className="text-sm font-semibold text-theme-text-highlight">
                                  {registeredByWorker.name}
                                </p>
                                <p className="text-xs text-theme-text/60">
                                  {registeredByWorker.organization}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-theme-text/60">
                                    Phone:
                                  </span>
                                  <span className="text-theme-text">
                                    {registeredByWorker.phoneNumber}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-theme-text/60">
                                    Wallet:
                                  </span>
                                  <span className="font-mono text-theme-text/70 break-all">
                                    {registeredByWorker.authority.toBase58()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={
                                registeredByWorker.isActive
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {registeredByWorker.isActive
                                ? "Active"
                                : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                          <p className="text-xs font-mono text-theme-text/70 break-all">
                            {beneficiary.registeredBy.toBase58()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Disaster Info */}
                    <div>
                      <h5 className="text-sm font-medium text-theme-text/70 mb-2">
                        Disaster Event
                      </h5>
                      {disaster ? (
                        <div className="p-4 rounded-lg bg-theme-background border border-theme-border space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div>
                                <p className="text-sm font-semibold text-theme-text-highlight">
                                  {disaster.name}
                                </p>
                                <p className="text-xs text-theme-text/60">
                                  {disaster.location.district}, Ward{" "}
                                  {disaster.location.ward}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-theme-text/60">
                                    Event ID:
                                  </span>
                                  <span className="text-theme-text">
                                    {disaster.eventId}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-theme-text/60">
                                    Declared:
                                  </span>
                                  <span className="text-theme-text">
                                    {formatDate(disaster.declaredAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={
                                disaster.isActive ? "default" : "secondary"
                              }
                            >
                              {disaster.isActive ? "Active" : "Closed"}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
                          <p className="text-xs text-theme-text/70">
                            {beneficiary.disasterId}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card className="bg-theme-card-bg border-theme-border">
                <CardHeader>
                  <CardTitle className="text-theme-text-highlight">
                    Recent Donations
                  </CardTitle>
                  <CardDescription className="text-theme-text/60">
                    All donations received by this beneficiary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {donationsLoading || isRefreshing ? (
                    <div className="space-y-2">
                      {Array.from(
                        { length: 3 },
                        (_, i) => `donation-skeleton-${i}`
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
                  ) : beneficiaryDonations.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <DonationIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-theme-text-highlight mb-2">
                        No donations yet
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        This beneficiary hasn't received any direct donations
                        yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {beneficiaryDonations.map((donation) => {
                        const donationKey = donation.publicKey.toString();
                        const isExpanded = expandedDonations.has(donationKey);
                        const amount = donation.amount / 1_000_000; // Convert from microUSDC

                        return (
                          <div
                            key={donationKey}
                            className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                          >
                            {/* Collapsed View */}
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
                              <span className="text-theme-text/60">
                                donated
                              </span>
                              <span className="font-semibold text-theme-primary">
                                ${amount.toFixed(2)} USDC
                              </span>
                              <div className="flex-1" />
                              <span className="text-xs text-theme-text/60 shrink-0">
                                {new Date(
                                  donation.timestamp * 1000
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
                                      Platform Fee
                                    </p>
                                    <p className="text-sm text-theme-text">
                                      $
                                      {(
                                        donation.platformFee / 1_000_000
                                      ).toFixed(2)}{" "}
                                      USDC
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-theme-text/60 mb-1">
                                      Net Amount
                                    </p>
                                    <p className="text-sm text-theme-primary font-semibold">
                                      $
                                      {(donation.netAmount / 1_000_000).toFixed(
                                        2
                                      )}{" "}
                                      USDC
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-theme-text/60 mb-1">
                                      Date & Time
                                    </p>
                                    <p className="text-sm text-theme-text">
                                      {new Date(
                                        donation.timestamp * 1000
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
                                          donation.transactionSignature
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Modal */}
        {beneficiary && (
          <BeneficiaryRegistrationModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            beneficiary={beneficiary}
            onSuccess={handleRefresh}
          />
        )}

        {/* Flag Modal */}
        {beneficiary && (
          <FlagBeneficiaryModal
            open={showFlagModal}
            onOpenChange={setShowFlagModal}
            beneficiary={beneficiary}
            onSuccess={handleRefresh}
          />
        )}

        {/* Donate Modal */}
        {beneficiary && (
          <DonateModal
            open={showDonateModal}
            onOpenChange={setShowDonateModal}
            beneficiaryAddress={beneficiary.authority.toBase58()}
            beneficiaryName={beneficiary.name}
            disasterId={beneficiary.disasterId}
            isVerified={
              formatVerificationStatus(beneficiary.verificationStatus) ===
              "Verified"
            }
            onSuccess={handleRefresh}
          />
        )}
      </main>
    </div>
  );
}
