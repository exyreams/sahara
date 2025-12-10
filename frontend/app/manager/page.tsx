"use client";

import { RefreshCw, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAllNGOs } from "@/hooks/use-all-ngos";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";

export default function ManagerDashboard() {
  const { ngos, loading: ngosLoading, refetch: refetchNGOs } = useAllNGOs();
  const {
    beneficiaries,
    loading: beneficiariesLoading,
    refetch: refetchBeneficiaries,
  } = useBeneficiaries();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loading = ngosLoading || beneficiariesLoading;

  // Get NGOs that need review (not verified)
  const ngosForReview = ngos.filter((ngo) => !ngo.isVerified);

  // Get flagged beneficiaries
  const flaggedBeneficiaries = beneficiaries.filter(
    (b) => b.verificationStatus === "Flagged" && b.flaggedBy,
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchNGOs(), refetchBeneficiaries()]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-theme-border rounded animate-pulse" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => `card-skeleton-${i}`).map(
            (key) => (
              <div
                key={key}
                className="border border-theme-border rounded-lg p-6 space-y-3"
              >
                <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                <div className="h-8 w-20 bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage NGO verifications and review flagged items
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* NGO Review Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NGO Reviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ngosForReview.length}</div>
            <p className="text-xs text-muted-foreground">
              NGOs pending verification
            </p>
            <div className="mt-4">
              <Button asChild size="sm" className="w-full">
                <Link href="/manager/review">Review NGOs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Flagged Beneficiaries Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flaggedBeneficiaries.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Beneficiaries flagged for review
            </p>
            <div className="mt-4">
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/admin/review">View in Admin Panel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for platform managers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link
                href="/manager/review"
                className="flex flex-col items-center gap-2"
              >
                <Users className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Review NGOs</div>
                  <div className="text-xs text-muted-foreground">
                    Verify new NGO registrations
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link
                href="/directory"
                className="flex flex-col items-center gap-2"
              >
                <Users className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">NGO Directory</div>
                  <div className="text-xs text-muted-foreground">
                    Browse all verified NGOs
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4">
              <Link
                href="/admin/review"
                className="flex flex-col items-center gap-2"
              >
                <AlertTriangle className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Admin Review</div>
                  <div className="text-xs text-muted-foreground">
                    Access full admin review panel
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
