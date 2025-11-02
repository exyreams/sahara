"use client";

import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { PlatformStats } from "@/components/dashboard/platform-stats";
import { DisasterCard } from "@/components/disasters/disaster-card";
import { DonationIcon } from "@/components/icons/donation-icon";
import { HeroSection } from "@/components/landing/hero-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useDisasters } from "@/hooks/use-disasters";
import { usePools } from "@/hooks/use-pools";
import { formatCurrency, formatVerificationStatus } from "@/lib/formatters";

export default function Home() {
  const { disasters, loading: disastersLoading } = useDisasters();
  const { beneficiaries, loading: beneficiariesLoading } = useBeneficiaries();
  const { pools, loading: poolsLoading } = usePools();

  const activeDisasters = disasters.filter((d) => d.isActive).slice(0, 6);
  const verifiedBeneficiaries = beneficiaries
    .filter(
      (b) => formatVerificationStatus(b.verificationStatus) === "Verified",
    )
    .slice(0, 6);
  const activePools = pools.filter((p) => p.isActive).slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {/* Hero Section with Particle System */}
        <HeroSection text="Sahara" height="100vh" />

        {/* Platform Statistics */}
        <section className="container mx-auto px-4 py-12">
          <PlatformStats />
        </section>

        {/* Active Disasters */}
        <section className="container mx-auto px-4 py-12">
          {disastersLoading ? (
            <div className="space-y-6 animate-pulse">
              {/* Header skeleton */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-8 bg-theme-border rounded w-64" />
                  <div className="h-4 bg-theme-border rounded w-80" />
                </div>
                <div className="h-10 w-32 bg-theme-border rounded" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-theme-text-highlight">
                  Active Disasters
                </h2>
                <p className="text-theme-text mt-1">
                  Ongoing relief efforts that need your support
                </p>
              </div>
              <Button
                variant="outline"
                className="border-theme-border text-theme-text hover:bg-theme-primary hover:text-theme-background"
                asChild
              >
                <Link href="/disasters">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          {disastersLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => {
                const uniqueId = `home-disaster-skeleton-${Date.now()}-${i}`;
                return (
                  <div
                    key={uniqueId}
                    className="h-64 bg-theme-card-bg border border-theme-border rounded-lg p-6 animate-pulse"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-5 bg-theme-border rounded w-2/3" />
                            <div className="h-6 w-16 bg-theme-border rounded" />
                          </div>
                          <div className="h-4 bg-theme-border rounded w-1/2" />
                        </div>
                        <div className="h-6 w-16 bg-theme-border rounded shrink-0" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-theme-border rounded w-1/3" />
                        <div className="h-4 bg-theme-border rounded w-1/4" />
                      </div>
                      <div className="h-4 bg-theme-border rounded w-1/2" />
                      <div className="space-y-2">
                        <div className="h-3 bg-theme-border rounded w-full" />
                        <div className="h-3 bg-theme-border rounded w-5/6" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-theme-border rounded" />
                        <div className="h-6 w-20 bg-theme-border rounded" />
                        <div className="h-6 w-14 bg-theme-border rounded" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeDisasters.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeDisasters.map((disaster) => (
                <DisasterCard
                  key={disaster.publicKey.toBase58()}
                  disaster={disaster}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center min-h-64 border border-theme-border rounded-lg bg-theme-card-bg/20">
              <AlertTriangle className="h-12 w-12 text-theme-text mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-theme-text-highlight">
                No Active Disasters
              </h3>
              <p className="text-theme-text">
                There are currently no active disaster events requiring relief.
              </p>
            </div>
          )}
        </section>

        {/* Verified Beneficiaries */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-theme-text-highlight">
                Verified Beneficiaries
              </h2>
              <p className="text-theme-text mt-1">
                People who have been verified and can receive direct aid
              </p>
            </div>
            <Button
              variant="outline"
              className="border-theme-border text-theme-text hover:bg-theme-primary hover:text-theme-background"
              asChild
            >
              <Link href="/beneficiaries">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {beneficiariesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from(
                { length: 6 },
                (_, i) => `beneficiary-skeleton-${i}`,
              ).map((key) => (
                <div
                  key={key}
                  className="h-48 bg-theme-card-bg border border-theme-border rounded-lg p-4 animate-pulse"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="h-6 bg-theme-border rounded w-2/3" />
                      <div className="h-5 w-16 bg-theme-border rounded" />
                    </div>
                    <div className="h-4 bg-theme-border rounded w-1/2" />
                    <div className="h-8 bg-theme-border rounded w-1/3" />
                    <div className="h-4 bg-theme-border rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : verifiedBeneficiaries.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {verifiedBeneficiaries.map((beneficiary) => (
                <Link
                  key={beneficiary.authority.toBase58()}
                  href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                >
                  <Card className="hover:border-theme-primary/50 transition-all cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">
                          {beneficiary.name}
                        </CardTitle>
                        <Badge variant="default" className="shrink-0">
                          Verified
                        </Badge>
                      </div>
                      <p className="text-sm text-theme-text/70">
                        {beneficiary.location.district}, Ward{" "}
                        {beneficiary.location.ward}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-theme-text/60">
                          Aid Received:
                        </span>
                        <span className="font-semibold text-theme-primary">
                          {formatCurrency(beneficiary.totalReceived)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-theme-text/60">Family Size:</span>
                        <span className="text-theme-text">
                          {beneficiary.familySize} members
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center min-h-48 border border-theme-border rounded-lg bg-theme-card-bg/20">
              <Users className="h-12 w-12 text-theme-text mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-theme-text-highlight">
                No Verified Beneficiaries
              </h3>
              <p className="text-theme-text">
                There are currently no verified beneficiaries in the system.
              </p>
            </div>
          )}
        </section>

        {/* Active Fund Pools */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-theme-text-highlight">
                Active Fund Pools
              </h2>
              <p className="text-theme-text mt-1">
                Disaster relief pools accepting donations
              </p>
            </div>
            <Button
              variant="outline"
              className="border-theme-border text-theme-text hover:bg-theme-primary hover:text-theme-background"
              asChild
            >
              <Link href="/pools">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {poolsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => `pool-skeleton-${i}`).map(
                (key) => (
                  <div
                    key={key}
                    className="h-48 bg-theme-card-bg border border-theme-border rounded-lg p-4 animate-pulse"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="h-6 bg-theme-border rounded w-2/3" />
                        <div className="h-5 w-16 bg-theme-border rounded" />
                      </div>
                      <div className="h-4 bg-theme-border rounded w-1/2" />
                      <div className="h-8 bg-theme-border rounded w-1/3" />
                      <div className="h-4 bg-theme-border rounded w-full" />
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : activePools.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePools.map((pool) => (
                <Link
                  key={pool.publicKey.toBase58()}
                  href={`/pools/${pool.publicKey.toBase58()}`}
                >
                  <Card className="hover:border-theme-primary/50 transition-all cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{pool.name}</CardTitle>
                        <Badge variant="default" className="shrink-0">
                          Active
                        </Badge>
                      </div>
                      <p className="text-sm text-theme-text/70">
                        {pool.disasterId}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-theme-text/60">
                          Total Raised:
                        </span>
                        <span className="font-semibold text-theme-primary">
                          {formatCurrency(pool.totalDeposited)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-theme-text/60">Distributed:</span>
                        <span className="text-theme-text">
                          {formatCurrency(pool.totalDistributed)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center min-h-48 border border-theme-border rounded-lg bg-theme-card-bg/20">
              <DonationIcon className="h-12 w-12 text-theme-text mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-theme-text-highlight">
                No Active Fund Pools
              </h3>
              <p className="text-theme-text">
                There are currently no active fund pools accepting donations.
              </p>
            </div>
          )}
        </section>

        {/* How It Works */}
        <section className="border-t border-theme-border bg-theme-card-bg/20 -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20">
          <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-16">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-theme-text-highlight">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-xl font-bold mx-auto">
                  1
                </div>
                <h3 className="text-xl font-semibold text-theme-text-highlight">
                  Verify Beneficiaries
                </h3>
                <p className="text-theme-text">
                  Field workers verify disaster victims through a 3-of-5
                  multi-sig process
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-xl font-bold mx-auto">
                  2
                </div>
                <h3 className="text-xl font-semibold text-theme-text-highlight">
                  Donate Directly
                </h3>
                <p className="text-theme-text">
                  Send USDC/SOL directly to beneficiaries or fund pools with
                  instant finality
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-xl font-bold mx-auto">
                  3
                </div>
                <h3 className="text-xl font-semibold text-theme-text-highlight">
                  Track Transparently
                </h3>
                <p className="text-theme-text">
                  Every transaction is recorded on-chain for complete
                  transparency
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
