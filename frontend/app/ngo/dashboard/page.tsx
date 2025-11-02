"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Edit,
  ExternalLink,
  FileText,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FundIcon } from "@/components/icons/fund-icon";
import { VerifiedIcon } from "@/components/icons/verified-icon";
import { NGORegistrationModal } from "@/components/ngo/ngo-registration-modal";
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
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { useNGO } from "@/hooks/use-ngo";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export default function NGODashboardPage() {
  const { ngo, loading: ngoLoading, refetch: refetchNGO } = useNGO();
  const {
    fieldWorkers,
    loading: workersLoading,
    refetch: refetchWorkers,
  } = useFieldWorkers();
  const {
    beneficiaries,
    loading: beneficiariesLoading,
    refetch: refetchBeneficiaries,
  } = useBeneficiaries();
  const {
    logs,
    loading: logsLoading,
    refetch: refetchLogs,
  } = useActivityLogs();
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const loading = ngoLoading || workersLoading || beneficiariesLoading;

  // Track when initial load is complete
  useEffect(() => {
    if (!loading && ngo) {
      setHasInitiallyLoaded(true);
    }
  }, [loading, ngo]);

  const toggleExpanded = (activityKey: string) => {
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchNGO(),
      refetchWorkers(),
      refetchBeneficiaries(),
      refetchLogs(),
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const getExplorerUrl = (address: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    return `https://explorer.solana.com/address/${address}?cluster=${network}`;
  };

  // Filter logs related to this NGO
  const ngoLogs = ngo
    ? logs.filter(
        (log) =>
          // Actions performed by the NGO authority (wallet)
          log.actor.equals(ngo.authority) ||
          // Actions targeting the NGO account
          log.target.equals(ngo.publicKey) ||
          // Actions performed by any of the NGO's field workers
          fieldWorkers.some(
            (fw) =>
              fw.ngo?.equals(ngo.publicKey) && log.actor.equals(fw.authority),
          ),
      )
    : [];

  // Create pseudo-logs for field worker registrations
  const fieldWorkerLogs = ngo
    ? fieldWorkers
        .filter((fw) => fw.ngo?.equals(ngo.publicKey))
        .map((fw) => ({
          publicKey: fw.publicKey,
          actionType: "fieldWorkerRegistered",
          actor: fw.registeredBy,
          target: fw.publicKey,
          amount: null,
          timestamp: fw.registeredAt,
          metadata: fw.name,
        }))
    : [];

  // Combine and sort all activities
  const allActivities = [...ngoLogs, ...fieldWorkerLogs].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  // Get recent 5 NGO-specific activities
  const recentActivities = allActivities.slice(0, 5);

  // Format action type for display
  const formatActionType = (actionType: string): string => {
    const actionMap: Record<string, string> = {
      // Field Worker actions
      fieldWorkerRegistered: "Registered Field Worker",
      fieldWorkerActivated: "Activated Field Worker",
      fieldWorkerDeactivated: "Deactivated Field Worker",

      // Beneficiary actions
      beneficiaryRegistered: "Registered Beneficiary",
      beneficiaryVerified: "Verified Beneficiary",
      beneficiaryUpdated: "Updated Beneficiary",

      // Fund Pool actions
      fundPoolCreated: "Created Fund Pool",
      fundPoolClosed: "Closed Fund Pool",

      // Distribution actions
      fundsDistributed: "Distributed Funds",
      distributionClaimed: "Claimed Distribution",

      // Donation actions
      donationToPool: "Donation to Pool",
      directDonation: "Direct Donation",

      // Disaster actions
      disasterCreated: "Created Disaster",
      disasterUpdated: "Updated Disaster",
      disasterClosed: "Closed Disaster",
    };

    return actionMap[actionType] || actionType;
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading && !hasInitiallyLoaded) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-theme-border rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-theme-border rounded animate-pulse" />
              <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="h-9 w-24 bg-theme-border rounded animate-pulse" />
            <div className="h-9 w-20 bg-theme-border rounded animate-pulse" />
            <div className="h-9 w-40 bg-theme-border rounded animate-pulse" />
            <div className="h-9 w-36 bg-theme-border rounded animate-pulse" />
            <div className="h-9 w-44 bg-theme-border rounded animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Aid Distributed Card - Special styling */}
          <Card className="border-theme-primary/20 bg-linear-to-br from-theme-primary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
              <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-9 w-24 bg-theme-border rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
            </CardContent>
          </Card>

          {/* Other Cards */}
          {Array.from({ length: 3 }, (_, i) => `stats-card-skeleton-${i}`).map(
            (key) => (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="h-3 w-20 bg-theme-border rounded animate-pulse" />
                </CardContent>
              </Card>
            ),
          )}
        </div>

        {/* Organization Info & Team Overview Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Organization Details with Operating Areas */}
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader>
              <div className="h-6 w-40 bg-theme-border rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact info rows */}
              {Array.from(
                { length: 6 },
                (_, j) => `contact-row-skeleton-${j}`,
              ).map((key) => (
                <div key={key} className="flex justify-between">
                  <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-40 bg-theme-border rounded animate-pulse" />
                </div>
              ))}
              {/* Operating Areas section */}
              <div className="pt-4 border-t border-theme-border space-y-3">
                <div>
                  <div className="h-4 w-32 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="flex flex-wrap gap-1">
                    {Array.from(
                      { length: 6 },
                      (_, j) => `disaster-type-skeleton-${j}`,
                    ).map((key) => (
                      <div
                        key={key}
                        className="h-6 w-20 bg-theme-border rounded animate-pulse"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-4 w-24 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="flex flex-wrap gap-1">
                    {Array.from(
                      { length: 5 },
                      (_, j) => `service-type-skeleton-${j}`,
                    ).map((key) => (
                      <div
                        key={key}
                        className="h-6 w-24 bg-theme-border rounded animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Overview */}
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader>
              <div className="h-6 w-32 bg-theme-border rounded animate-pulse mb-1" />
              <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Field Workers Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                  <div className="h-7 w-16 bg-theme-border rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  {Array.from(
                    { length: 3 },
                    (_, j) => `team-worker-skeleton-${j}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg border border-theme-border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-12 bg-theme-border rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Beneficiaries Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                  <div className="h-7 w-16 bg-theme-border rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  {Array.from(
                    { length: 3 },
                    (_, j) => `team-beneficiary-skeleton-${j}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg border border-theme-border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-16 bg-theme-border rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Skeleton */}
        <Card className="bg-theme-card-bg border-theme-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 w-32 bg-theme-border rounded animate-pulse mb-1" />
                <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
              </div>
              <div className="h-9 w-20 bg-theme-border rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(
                { length: 5 },
                (_, i) => `activity-skeleton-${i}`,
              ).map((key) => (
                <div
                  key={key}
                  className="border border-theme-border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="h-4 w-4 bg-theme-border rounded shrink-0" />
                    <div className="h-4 w-4 bg-theme-border rounded shrink-0" />
                    <div className="h-6 w-36 bg-theme-border rounded shrink-0" />
                    <div className="flex-1" />
                    <div className="h-4 w-16 bg-theme-border rounded shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only show "no NGO" screen if we've loaded and there's truly no NGO (not during refresh)
  if (!ngo && hasInitiallyLoaded) {
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
                  <Building2 className="h-6 w-6 text-theme-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-theme-text-highlight">
                  No NGO Registered
                </h1>
              </div>
              <p className="text-lg text-theme-text">
                Register your organization to start coordinating relief efforts.
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

  // Safety check - if no NGO at this point, show the registration screen
  // This handles edge cases where hasInitiallyLoaded might not be set correctly
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
                  <Building2 className="h-6 w-6 text-theme-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-theme-text-highlight">
                  No NGO Registered
                </h1>
              </div>
              <p className="text-lg text-theme-text">
                Register your organization to start coordinating relief efforts.
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

  // Count beneficiaries registered by this NGO's field workers
  const ngoBeneficiaries = beneficiaries.filter((b) =>
    ngoFieldWorkers.some((fw) => fw.authority.equals(b.registeredBy)),
  );
  const ngoBeneficiariesCount = ngoBeneficiaries.length;

  // Calculate total aid distributed to this NGO's beneficiaries
  // Sum up totalReceived from all beneficiaries registered by this NGO's field workers
  const totalAidDistributed = ngoBeneficiaries.reduce((total, b) => {
    return total + b.totalReceived;
  }, 0);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {ngo.name}
            </h1>
            {ngo.isVerified && (
              <VerifiedIcon
                className="w-5 h-5 sm:w-6 sm:h-6 shrink-0"
                tooltip="Verified NGO"
              />
            )}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge variant={ngo.isVerified ? "default" : "secondary"}>
              {ngo.isVerified ? "Verified" : "Pending Verification"}
            </Badge>
            <Badge variant={ngo.isActive ? "default" : "secondary"}>
              {ngo.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditModal(true)}
            disabled={!ngo.isVerified}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit NGO
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/ngo/field-workers">
              <Users className="h-4 w-4 mr-2" />
              Field Workers
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/pools">
              <FundIcon className="h-4 w-4 mr-2" />
              Fund Pools
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/beneficiaries">
              <Users className="h-4 w-4 mr-2" />
              Beneficiaries
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-theme-primary/20 bg-linear-to-br from-theme-primary/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aid Distributed
            </CardTitle>
            <FundIcon className="h-4 w-4 text-theme-primary" />
          </CardHeader>
          <CardContent className={isRefreshing ? "opacity-50" : ""}>
            <div className="text-3xl font-bold text-theme-primary">
              {formatCurrency(totalAidDistributed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total USDC claimed by beneficiaries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Field Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRefreshing ? "opacity-50" : ""}>
            <div className="text-2xl font-bold">{ngo.fieldWorkersCount}</div>
            <p className="text-xs text-muted-foreground">
              {ngoFieldWorkers.filter((fw) => fw.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficiaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRefreshing ? "opacity-50" : ""}>
            <div className="text-2xl font-bold">
              {formatNumber(ngoBeneficiariesCount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered by field workers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fund Pools</CardTitle>
            <FundIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isRefreshing ? "opacity-50" : ""}>
            <div className="text-2xl font-bold">{ngo.poolsCreated}</div>
            <p className="text-xs text-muted-foreground">Created</p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Info & Team Overview */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Organization Details with Operating Areas */}
        <Card className="bg-theme-card-bg border-theme-border">
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Registration Number
              </span>
              <span className="text-sm font-medium">
                {ngo.registrationNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{ngo.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phone</span>
              <span className="text-sm font-medium">{ngo.phoneNumber}</span>
            </div>
            {ngo.website && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Website</span>
                <a
                  href={ngo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-theme-primary hover:underline break-all"
                >
                  {ngo.website}
                </a>
              </div>
            )}
            <div className="flex justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Contact Person
              </span>
              <span className="text-sm font-medium">
                {ngo.contactPersonName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="text-sm font-medium">
                {ngo.contactPersonRole}
              </span>
            </div>

            {/* Operating Areas - merged into same card */}
            <div className="pt-4 border-t border-theme-border space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Operating Districts ({ngo.operatingDistricts.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {ngo.operatingDistricts.map((district) => (
                    <Badge key={district} variant="log_action">
                      {district}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Focus Areas ({ngo.focusAreas.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {ngo.focusAreas.map((area) => (
                    <Badge key={area} variant="log_action">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Overview - Field Workers & Beneficiaries */}
        <Card className="bg-theme-card-bg border-theme-border">
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
            <CardDescription>
              Recent field workers and beneficiaries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Field Workers Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-theme-text-highlight">
                  Field Workers
                </h3>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Link href="/ngo/field-workers">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
              {ngoFieldWorkers.length > 0 ? (
                <div className="space-y-2">
                  {ngoFieldWorkers.slice(0, 3).map((worker) => (
                    <Link
                      key={worker.publicKey.toBase58()}
                      href={`/ngo/field-workers/${worker.authority.toBase58()}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-theme-primary/5 transition-colors border border-theme-border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-theme-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {worker.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {worker.verificationsCount} verifications
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={worker.isActive ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {worker.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No field workers yet
                </p>
              )}
            </div>

            {/* Beneficiaries Section */}
            <div className="pt-4 border-t border-theme-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-theme-text-highlight">
                  Beneficiaries
                </h3>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Link href="/beneficiaries">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
              {ngoBeneficiaries.length > 0 ? (
                <div className="space-y-2">
                  {ngoBeneficiaries.slice(0, 3).map((beneficiary) => (
                    <Link
                      key={beneficiary.publicKey.toBase58()}
                      href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-theme-primary/5 transition-colors border border-theme-border"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-theme-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {beneficiary.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {beneficiary.location.district}, Ward{" "}
                            {beneficiary.location.ward}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {beneficiary.verificationStatus}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No beneficiaries yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-theme-card-bg border-theme-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest NGO-related actions</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/ngo/activity-log">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading || isRefreshing ? (
            <div className="space-y-3">
              {Array.from(
                { length: 5 },
                (_, i) => `activity-log-skeleton-${i}`,
              ).map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 border border-theme-border rounded-lg animate-pulse"
                >
                  <div className="h-10 w-10 bg-theme-border rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-theme-border rounded" />
                    <div className="h-3 w-32 bg-theme-border rounded" />
                  </div>
                  <div className="h-4 w-16 bg-theme-border rounded" />
                </div>
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activities</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => {
                const activityKey = activity.publicKey.toString();
                const isExpanded = expandedActivities.has(activityKey);

                return (
                  <div
                    key={activityKey}
                    className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                  >
                    {/* Collapsed View */}
                    <button
                      type="button"
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                      onClick={() => toggleExpanded(activityKey)}
                    >
                      <ChevronDown
                        className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                      <FileText className="h-4 w-4 text-theme-primary shrink-0" />
                      <span className="font-semibold text-theme-text text-sm">
                        {formatActionType(activity.actionType)}
                      </span>
                      <div className="flex-1" />
                      <span className="text-xs text-theme-text/60 shrink-0">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </button>

                    {/* Expanded View */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-theme-border bg-theme-background/50 p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Actor
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-mono text-theme-text break-all">
                                    {activity.actor.toString()}
                                  </p>
                                  <a
                                    href={getExplorerUrl(
                                      activity.actor.toString(),
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-theme-primary hover:underline shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Target
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-mono text-theme-text break-all">
                                    {activity.target.toString()}
                                  </p>
                                  <a
                                    href={getExplorerUrl(
                                      activity.target.toString(),
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-theme-primary hover:underline shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-theme-text/60 mb-1">
                                  Date & Time
                                </p>
                                <p className="text-sm text-theme-text">
                                  {new Date(
                                    activity.timestamp * 1000,
                                  ).toLocaleString()}
                                </p>
                              </div>
                              {activity.amount !== null && (
                                <div>
                                  <p className="text-xs text-theme-text/60 mb-1">
                                    Amount
                                  </p>
                                  <p className="text-sm text-theme-primary font-semibold">
                                    ${(activity.amount / 1_000_000).toFixed(2)}{" "}
                                    USDC
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Parse and display metadata */}
                            {activity.metadata &&
                              (() => {
                                // For field worker registrations, metadata is just the name
                                if (
                                  activity.actionType ===
                                  "fieldWorkerRegistered"
                                ) {
                                  return (
                                    <div className="pt-3 border-t border-theme-border">
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Field Worker Name
                                      </p>
                                      <p className="text-sm text-theme-text font-medium">
                                        {activity.metadata}
                                      </p>
                                    </div>
                                  );
                                }

                                // Parse metadata for other activities (format: "Key: Value | Key: Value")
                                const metadataParts =
                                  activity.metadata.split(" | ");
                                const parsedData: Record<string, string> = {};

                                metadataParts.forEach((part) => {
                                  const [key, value] = part.split(": ");
                                  if (key && value) {
                                    parsedData[key] = value;
                                  }
                                });

                                return (
                                  <div className="pt-3 border-t border-theme-border">
                                    <p className="text-xs text-theme-text/60 mb-2">
                                      Additional Details
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {parsedData.Pool && (
                                        <div>
                                          <p className="text-xs text-theme-text/60 mb-1">
                                            Pool Name
                                          </p>
                                          <p className="text-sm text-theme-text">
                                            {parsedData.Pool}
                                          </p>
                                        </div>
                                      )}
                                      {parsedData.Amount && (
                                        <div>
                                          <p className="text-xs text-theme-text/60 mb-1">
                                            Donation Amount
                                          </p>
                                          <p className="text-sm text-theme-primary font-semibold">
                                            $
                                            {(
                                              Number.parseInt(
                                                parsedData.Amount,
                                                10,
                                              ) / 1_000_000
                                            ).toFixed(2)}{" "}
                                            USDC
                                          </p>
                                        </div>
                                      )}
                                      {parsedData.Fee && (
                                        <div>
                                          <p className="text-xs text-theme-text/60 mb-1">
                                            Platform Fee
                                          </p>
                                          <p className="text-sm text-theme-text">
                                            $
                                            {(
                                              Number.parseInt(
                                                parsedData.Fee,
                                                10,
                                              ) / 1_000_000
                                            ).toFixed(2)}{" "}
                                            USDC
                                          </p>
                                        </div>
                                      )}
                                      {parsedData.Disaster && (
                                        <div>
                                          <p className="text-xs text-theme-text/60 mb-1">
                                            Disaster
                                          </p>
                                          <p className="text-sm text-theme-text">
                                            {parsedData.Disaster}
                                          </p>
                                        </div>
                                      )}
                                      {parsedData.Beneficiary && (
                                        <div>
                                          <p className="text-xs text-theme-text/60 mb-1">
                                            Beneficiary
                                          </p>
                                          <p className="text-sm text-theme-text">
                                            {parsedData.Beneficiary}
                                          </p>
                                        </div>
                                      )}
                                      {/* Display any other metadata fields */}
                                      {Object.entries(parsedData).map(
                                        ([key, value]) => {
                                          if (
                                            ![
                                              "Pool",
                                              "Amount",
                                              "Fee",
                                              "Disaster",
                                              "Beneficiary",
                                            ].includes(key)
                                          ) {
                                            return (
                                              <div key={key}>
                                                <p className="text-xs text-theme-text/60 mb-1">
                                                  {key}
                                                </p>
                                                <p className="text-sm text-theme-text">
                                                  {value}
                                                </p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        },
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
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

      {/* Edit Modal */}
      <NGORegistrationModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        mode="edit"
      />
    </>
  );
}
