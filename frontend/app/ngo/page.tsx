"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/loading/loading-spinner";
import { NGORegistrationModal } from "@/components/ngo/ngo-registration-modal";
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
import { useNGO } from "@/hooks/use-ngo";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";

export default function NGOPage() {
  const router = useRouter();
  const { wallet } = useProgram();
  const { ngo, loading } = useNGO();
  const { config } = usePlatformConfig();
  const [loadingStage, setLoadingStage] = useState<
    "checking" | "found-ngo" | "complete"
  >("checking");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && wallet.connected) {
      if (ngo) {
        // NGO found - show dashboard skeleton briefly before redirecting
        setLoadingStage("found-ngo");
        const timer = setTimeout(() => {
          router.push("/ngo/dashboard");
        }, 800); // Show dashboard skeleton for 800ms
        return () => clearTimeout(timer);
      } else {
        // No NGO found - show registration form
        setLoadingStage("complete");
      }
    } else if (!loading) {
      setLoadingStage("complete");
    }
  }, [ngo, loading, wallet.connected, router]);

  // Wallet not connected - Show informational page
  if (!wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col bg-theme-background">
        <main className="flex-1">
          {/* Hero Section with Particle System - Full Width */}
          <div className="-mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20 -mt-20">
            <section
              className="relative w-full bg-theme-background overflow-hidden border-b border-theme-border"
              style={{ height: "100vh" }}
            >
              {/* Particle Background */}
              <div className="absolute inset-0 z-0">
                <GridBackground />
              </div>

              {/* Content Overlay */}
              <div className="relative z-10 container mx-auto px-4 h-full flex flex-col pointer-events-none">
                {/* Top spacer */}
                <div className="flex-1" />

                {/* Hero Content */}
                <div className="max-w-3xl mx-auto text-center space-y-6 pointer-events-auto">
                  <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                    NGO Portal
                  </h1>
                  <p className="text-lg md:text-xl text-theme-text max-w-2xl mx-auto">
                    Coordinate transparent disaster relief efforts on the
                    blockchain. Register your organization and manage field
                    workers to verify beneficiaries.
                  </p>

                  {/* Wallet connection below text */}
                  <div className="flex flex-col items-center gap-4 pt-6">
                    <div className="scale-110">
                      <WalletButton />
                    </div>
                    <p className="text-sm text-theme-text/80">
                      Connect your wallet to get started
                    </p>
                  </div>
                </div>

                {/* Bottom spacer */}
                <div className="flex-1" />
              </div>
            </section>
          </div>

          {/* Features Section */}
          <section id="features" className="container mx-auto px-4 py-16">
            {/* Platform Pause Alert */}
            {config?.isPaused && (
              <Card className="mb-8 max-w-6xl mx-auto border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
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

            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12 text-theme-text-highlight">
                What NGOs Can Do
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <Users className="h-10 w-10 text-theme-primary mb-3" />
                    <CardTitle className="text-theme-text-highlight">
                      Manage Field Workers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-theme-text">
                      Register and manage field workers who verify beneficiaries
                      on the ground. Track their activity and performance.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CheckCircle className="h-10 w-10 text-theme-primary mb-3" />
                    <CardTitle className="text-theme-text-highlight">
                      Verify Beneficiaries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-theme-text">
                      Participate in multi-signature verification (3-of-5) to
                      ensure aid reaches legitimate disaster victims.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <TrendingUp className="h-10 w-10 text-theme-primary mb-3" />
                    <CardTitle className="text-theme-text-highlight">
                      Create Fund Pools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-theme-text">
                      Set up transparent fund pools for disaster relief with
                      customizable distribution rules and real-time tracking.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-theme-primary mb-3" />
                    <CardTitle className="text-theme-text-highlight">
                      Transparent Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-theme-text">
                      All transactions recorded on-chain. Build trust with
                      donors through complete transparency and accountability.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <FileCheck className="h-10 w-10 text-theme-primary mb-3" />
                    <CardTitle className="text-theme-text-highlight">
                      Disaster Coordination
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-theme-text">
                      Coordinate relief efforts across multiple disasters. Track
                      distributions and manage resources efficiently.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <Wallet className="h-10 w-10 text-theme-primary mb-3" />
                    <CardTitle className="text-theme-text-highlight">
                      Instant Settlements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-theme-text">
                      Leverage Solana's speed for instant fund distribution. No
                      delays, no intermediaries, just direct aid.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="border-t border-theme-border bg-theme-card-bg/20 -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20">
            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-16">
              <h2 className="text-3xl font-bold text-center mb-12 text-theme-text-highlight">
                How It Works
              </h2>
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex gap-6 items-start">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-theme-text-highlight">
                      Connect Wallet & Register
                    </h3>
                    <p className="text-theme-text">
                      Connect your Solana wallet and register your NGO with
                      official documentation. Provide details about your
                      organization, operating districts, and focus areas.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-theme-text-highlight">
                      Get Verified
                    </h3>
                    <p className="text-theme-text">
                      Platform administrators review your registration. Once
                      verified, you gain access to the full NGO dashboard and
                      can start registering field workers.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-theme-text-highlight">
                      Register Field Workers
                    </h3>
                    <p className="text-theme-text">
                      Add field workers who will verify beneficiaries on the
                      ground. Each beneficiary requires 3-of-5 field worker
                      approvals for verification.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary text-theme-background flex items-center justify-center text-xl font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-theme-text-highlight">
                      Coordinate Relief Efforts
                    </h3>
                    <p className="text-theme-text">
                      Create fund pools, verify beneficiaries, and distribute
                      aid. All transactions are transparent and recorded
                      on-chain for complete accountability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section with Wallet Button */}
          <section className="border-t border-theme-border">
            <div className="container mx-auto px-4 py-16">
              <Card className="max-w-3xl mx-auto border-theme-primary/50 bg-theme-card-bg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-theme-text-highlight">
                    Ready to Get Started?
                  </CardTitle>
                  <CardDescription className="text-theme-text">
                    Connect your wallet to register your NGO and start
                    coordinating transparent disaster relief efforts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="scale-110">
                    <WalletButton />
                  </div>
                  <p className="text-sm text-theme-text text-center">
                    Don't have a Solana wallet?{" "}
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary hover:underline"
                    >
                      Get Phantom Wallet
                    </a>
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Wallet connected - progressive loading states
  if ((loadingStage !== "complete" || loading) && wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col bg-theme-background">
        <main className="flex-1 relative -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20 -mt-20">
          {/* Full-screen Grid Background */}
          <div className="absolute inset-0">
            <GridBackground />
          </div>

          {/* Progressive Loading Content */}
          <div className="relative z-10 flex items-center justify-center px-6 py-16 min-h-screen">
            <div className="max-w-2xl w-full space-y-8">
              {loadingStage === "checking" && (
                <>
                  {/* Initial Loading Spinner */}
                  <div className="text-center">
                    <LoadingSpinner
                      size="lg"
                      text="Checking NGO registration..."
                      className="py-12"
                    />
                  </div>

                  {/* Registration Form Skeleton */}
                  <div className="space-y-8 animate-pulse">
                    {/* Header Skeleton */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-theme-border/50" />
                      <div className="space-y-2 flex-1">
                        <div className="h-8 bg-theme-border/50 rounded w-3/4" />
                        <div className="h-4 bg-theme-border/50 rounded w-1/2" />
                      </div>
                    </div>

                    {/* Wallet Address Skeleton */}
                    <div className="p-4 rounded-lg border border-theme-border/50 bg-theme-card-bg/50">
                      <div className="h-3 bg-theme-border/50 rounded w-24 mb-2" />
                      <div className="h-4 bg-theme-border/50 rounded w-full" />
                    </div>

                    {/* Steps Skeleton */}
                    <div className="space-y-6">
                      <div className="h-6 bg-theme-border/50 rounded w-48" />
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-theme-border/50 shrink-0" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-theme-border/50 rounded w-3/4" />
                              <div className="h-3 bg-theme-border/50 rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Button Skeleton */}
                    <div className="flex gap-4">
                      <div className="h-12 bg-theme-border/50 rounded w-40" />
                      <div className="h-12 bg-theme-border/50 rounded w-32" />
                    </div>
                  </div>
                </>
              )}

              {loadingStage === "found-ngo" && (
                <>
                  {/* NGO Found - Dashboard Skeleton */}
                  <div className="text-center">
                    <LoadingSpinner
                      size="lg"
                      text="Loading NGO dashboard..."
                      className="py-8"
                    />
                  </div>

                  {/* Dashboard Preview Skeleton */}
                  <div className="space-y-6 animate-pulse">
                    {/* Dashboard Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-theme-border/50" />
                        <div className="space-y-2">
                          <div className="h-6 bg-theme-border/50 rounded w-48" />
                          <div className="h-4 bg-theme-border/50 rounded w-32" />
                        </div>
                      </div>
                      <div className="h-6 w-20 bg-theme-border/50 rounded" />
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="p-6 rounded-lg border border-theme-border/50 bg-theme-card-bg/50"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="h-4 bg-theme-border/50 rounded w-20" />
                              <div className="w-5 h-5 bg-theme-border/50 rounded" />
                            </div>
                            <div className="h-8 bg-theme-border/50 rounded w-16" />
                            <div className="h-3 bg-theme-border/50 rounded w-24" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <div className="h-10 bg-theme-border/50 rounded w-32" />
                      <div className="h-10 bg-theme-border/50 rounded w-28" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Wallet connected but not registered - Full-screen with grid background
  return (
    <div className="min-h-screen flex flex-col bg-theme-background">
      <main className="flex-1 relative -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20 -mt-20">
        {/* Full-screen Grid Background */}
        <div className="absolute inset-0">
          <GridBackground />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex items-center justify-center px-6 py-16 min-h-screen">
          <div className="max-w-2xl w-full space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-theme-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-theme-text-highlight">
                  No NGO Registered
                </h1>
              </div>
              <p className="text-lg text-theme-text">
                Your wallet is connected, but no NGO is registered with this
                address.
              </p>
            </div>

            {/* Wallet Address Display */}
            <div className="p-4 rounded-lg bg-theme-card-bg border border-theme-border">
              <p className="text-xs text-theme-text/60 mb-2 uppercase tracking-wide">
                Connected Wallet
              </p>
              <p className="text-sm font-mono text-theme-primary break-all">
                {wallet.publicKey?.toBase58()}
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
              <Button
                size="lg"
                className="w-full text-base"
                onClick={() => setModalOpen(true)}
              >
                Register Your NGO
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
      </main>

      {/* Registration Modal */}
      <NGORegistrationModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
