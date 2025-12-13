"use client";

import BN from "bn.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { type Distribution, useDistributions } from "@/hooks/use-distributions";
import { useDonations } from "@/hooks/use-donations";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveBeneficiaryPDA,
  deriveDistributionPDA,
  deriveFundPoolPDA,
  derivePoolRegistrationActivityLogPDA,
} from "@/lib/anchor/pdas";
import {
  formatCurrency,
  formatDate,
  formatVerificationStatus,
} from "@/lib/formatters";
import type { Beneficiary } from "@/types/program";

export default function WalletProfilePage() {
  const { wallet, connection, program } = useProgram();
  const { beneficiaries, loading: beneficiariesLoading } = useBeneficiaries();
  const { loading: donationsLoading, filterByRecipient } = useDonations();
  const { filterByBeneficiary, refetch: refetchDistributions } =
    useDistributions();
  const { submit, isLoading: isClaimingLoading } = useTransaction();
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getExplorerUrl = (signature: string) => {
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  };

  // Find beneficiary by connected wallet
  useEffect(() => {
    if (wallet.publicKey && beneficiaries.length > 0) {
      const found = beneficiaries.find(
        (b) => b.authority.toBase58() === wallet.publicKey?.toBase58(),
      );
      setBeneficiary(found || null);
    } else {
      setBeneficiary(null);
    }
  }, [wallet.publicKey, beneficiaries]);

  // Fetch USDC balance
  useEffect(() => {
    async function fetchBalance() {
      if (!wallet.publicKey || !connection) {
        setBalanceLoading(false);
        return;
      }

      try {
        setBalanceLoading(true);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          {
            programId: new (await import("@solana/web3.js")).PublicKey(
              "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            ),
          },
        );

        let totalBalance = 0;
        for (const account of tokenAccounts.value) {
          const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
          totalBalance += balance || 0;
        }

        setUsdcBalance(totalBalance);
      } catch (error) {
        console.error("Error fetching balance:", error);
        setUsdcBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    }

    fetchBalance();
  }, [wallet.publicKey, connection]);

  // Get donations for this beneficiary
  const beneficiaryDonations = beneficiary
    ? filterByRecipient(beneficiary.publicKey).sort(
        (a, b) => b.timestamp - a.timestamp,
      )
    : [];

  // Get distributions for this beneficiary
  const beneficiaryDistributions = beneficiary
    ? filterByBeneficiary(beneficiary.publicKey).sort(
        (a, b) => b.createdAt - a.createdAt,
      )
    : [];

  // Calculate pending claims
  const pendingDistributions = beneficiaryDistributions.filter(
    (d) => !d.isFullyClaimed,
  );
  const totalPendingAmount =
    pendingDistributions.reduce(
      (sum, d) => sum + (d.amountAllocated - d.amountClaimed),
      0,
    ) / 1_000_000;

  // Claim distribution function
  const handleClaim = async (distribution: Distribution) => {
    if (!wallet.publicKey || !program || !beneficiary) return;

    const walletPublicKey = wallet.publicKey;

    await submit(
      async () => {
        const {
          getAssociatedTokenAddress,
          createAssociatedTokenAccountInstruction,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        } = await import("@solana/spl-token");

        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        const poolAccount = await (program.account as any).fundPool.fetch(
          distribution.pool,
        );

        const disasterId = poolAccount.disasterId;
        const poolId = poolAccount.poolId;
        const poolTokenAccount = poolAccount.tokenAccount;
        const tokenMint = poolAccount.tokenMint;

        const beneficiaryTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          walletPublicKey,
        );

        // Check if token account exists
        const accountInfo = await connection.getAccountInfo(
          beneficiaryTokenAccount,
        );

        const [poolPDA] = deriveFundPoolPDA(disasterId, poolId);
        const [distributionPDA] = deriveDistributionPDA(
          walletPublicKey,
          poolPDA,
        );
        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          walletPublicKey,
          disasterId,
        );

        // Generate timestamp for unique activity log
        const timestamp = Math.floor(Date.now() / 1000);

        // Derive activity log PDA
        const [activityLogPDA] = derivePoolRegistrationActivityLogPDA(
          poolPDA,
          beneficiaryPDA,
          timestamp,
        );

        // Build the transaction
        const txBuilder = program.methods
          .claimDistribution(disasterId, poolId, new BN(timestamp))
          .accounts({
            distribution: distributionPDA,
            activityLog: activityLogPDA,
            pool: poolPDA,
            poolTokenAccount: poolTokenAccount,
            beneficiary: beneficiaryPDA,
            beneficiaryTokenAccount: beneficiaryTokenAccount,
            beneficiaryAuthority: walletPublicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          });

        // If beneficiary token account doesn't exist, add instruction to create it
        if (!accountInfo) {
          console.log("Creating beneficiary token account...");
          txBuilder.preInstructions([
            createAssociatedTokenAccountInstruction(
              walletPublicKey, // payer
              beneficiaryTokenAccount, // ata
              walletPublicKey, // owner
              tokenMint, // mint
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID,
            ),
          ]);
        }

        const tx = await txBuilder.rpc();

        return tx;
      },
      {
        successMessage: "Distribution claimed successfully!",
        onSuccess: () => {
          refetchDistributions();
        },
      },
    );
  };

  if (!wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to view your profile
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (beneficiariesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-theme-bg">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
          {/* Header Skeleton */}
          <div>
            <div className="h-10 w-64 bg-theme-border rounded animate-pulse mb-2" />
            <div className="h-5 w-96 bg-theme-border rounded animate-pulse" />
          </div>

          {/* Statistics Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => `stats-skeleton-${i}`).map(
              (key) => (
                <Card
                  key={key}
                  className="bg-theme-card-bg border-theme-border"
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />
                  </CardContent>
                </Card>
              ),
            )}
          </div>

          {/* Profile & Activity Card Skeleton */}
          <Card className="bg-theme-card-bg border-theme-border">
            <CardContent className="pt-6 space-y-6">
              {/* Basic Information Skeleton */}
              <div>
                <div className="h-5 w-40 bg-theme-border rounded animate-pulse mb-4" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from(
                    { length: 4 },
                    (_, i) => `beneficiary-detail-skeleton-${i}`,
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
                <div className="mt-4 pt-4 border-t border-theme-border">
                  <div className="h-3 w-24 bg-theme-border rounded animate-pulse mb-2" />
                  <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                </div>
              </div>

              {/* Activity Skeleton */}
              <div className="pt-6 border-t border-theme-border">
                <div className="h-5 w-32 bg-theme-border rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {Array.from(
                    { length: 3 },
                    (_, i) => `distribution-skeleton-${i}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="border border-theme-border rounded-lg p-3"
                    >
                      <div className="h-5 w-full bg-theme-border rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Not Registered</CardTitle>
              <CardDescription>
                This wallet is not registered as a beneficiary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Connected wallet: {wallet.publicKey?.toBase58()}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-theme-bg">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        {/* Header with Name and Status */}
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-4xl font-bold tracking-tight text-theme-primary">
              {beneficiary.name}
            </h1>
            {formatVerificationStatus(beneficiary.verificationStatus) ===
            "Verified" ? (
              <VerifiedIcon
                className="h-6 w-6"
                tooltip="Verified Beneficiary"
              />
            ) : (
              <Badge variant="pending">
                {formatVerificationStatus(beneficiary.verificationStatus)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">
              {beneficiary.location.city ||
                beneficiary.location.region ||
                beneficiary.location.district}
              , {beneficiary.location.area || beneficiary.location.ward || ""}
            </span>
            <span>•</span>
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              Registered {formatDate(beneficiary.registeredAt)}
            </span>
          </div>
        </div>

        {/* Statistics Cards - Matching Pool Design */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-theme-text/60">
                Wallet Balance
              </CardDescription>
              <Wallet className="h-4 w-4 text-theme-primary" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="h-10 w-32 bg-theme-border rounded animate-pulse" />
              ) : (
                <div className="text-3xl font-bold text-theme-primary">
                  ${usdcBalance.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-theme-text/60">
                Total Received
              </CardDescription>
              <TrendingUp className="h-4 w-4 text-theme-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-theme-primary">
                {formatCurrency(beneficiary.totalReceived)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription className="text-theme-text/60">
                Pending Claims
              </CardDescription>
              <Clock className="h-4 w-4 text-theme-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-theme-primary">
                ${totalPendingAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Distributions - Action Required */}
        {pendingDistributions.length > 0 && (
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-theme-text-highlight">
                    Pending Distributions
                  </CardTitle>
                  <CardDescription className="text-theme-text/60 mt-1">
                    Claim your allocated funds from disaster relief pools
                  </CardDescription>
                </div>
                <Badge
                  variant="default"
                  className="bg-theme-primary/20 text-theme-primary"
                >
                  {pendingDistributions.length} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingDistributions.map((distribution) => {
                  const totalPending =
                    (distribution.amountAllocated -
                      distribution.amountClaimed) /
                    1_000_000;
                  const immediateAmount =
                    distribution.amountImmediate / 1_000_000;
                  const lockedAmount = distribution.amountLocked / 1_000_000;
                  const immediateClaimed = distribution.claimedAt !== null;
                  const lockedClaimed = distribution.lockedClaimedAt !== null;
                  const immediateUnclaimed = immediateClaimed
                    ? 0
                    : immediateAmount;
                  const lockedUnclaimed = lockedClaimed ? 0 : lockedAmount;

                  // Check if locked funds are available
                  const now = Math.floor(Date.now() / 1000);
                  const isLocked = distribution.unlockTime
                    ? distribution.unlockTime > now
                    : false;
                  const timeRemaining = distribution.unlockTime
                    ? Math.max(0, distribution.unlockTime - now)
                    : 0;
                  const days = Math.floor(timeRemaining / 86400);
                  const hours = Math.floor((timeRemaining % 86400) / 3600);
                  const minutes = Math.floor((timeRemaining % 3600) / 60);

                  // Determine what can be claimed now
                  const canClaimImmediate = immediateUnclaimed > 0;
                  const canClaimLocked = lockedUnclaimed > 0 && !isLocked;
                  const claimableNow =
                    (canClaimImmediate ? immediateUnclaimed : 0) +
                    (canClaimLocked ? lockedUnclaimed : 0);

                  return (
                    <div
                      key={distribution.publicKey.toString()}
                      className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-colors"
                    >
                      {/* Main Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <FundIcon className="h-5 w-5 text-theme-primary" />
                              <span className="font-semibold text-theme-text-highlight">
                                Pool Distribution
                              </span>
                            </div>
                            <p className="text-xs text-theme-text/60">
                              Allocated on {formatDate(distribution.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-theme-primary">
                              ${totalPending.toFixed(2)}
                            </p>
                            <p className="text-xs text-theme-text/60">
                              USDC total
                            </p>
                          </div>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-xs text-theme-text/60">
                                Immediate
                              </span>
                            </div>
                            <p
                              className={`text-lg font-semibold ${
                                immediateUnclaimed > 0
                                  ? "text-green-500"
                                  : "text-theme-text/40"
                              }`}
                            >
                              ${immediateUnclaimed.toFixed(2)}
                              {immediateClaimed && (
                                <span className="text-xs ml-1">✓</span>
                              )}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isLocked ? "bg-yellow-500" : "bg-green-500"
                                }`}
                              />
                              <span className="text-xs text-theme-text/60">
                                {isLocked ? "Locked" : "Unlocked"}
                              </span>
                            </div>
                            <p
                              className={`text-lg font-semibold ${
                                lockedUnclaimed > 0
                                  ? isLocked
                                    ? "text-yellow-500"
                                    : "text-green-500"
                                  : "text-theme-text/40"
                              }`}
                            >
                              ${lockedUnclaimed.toFixed(2)}
                              {lockedClaimed && (
                                <span className="text-xs ml-1">✓</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Countdown Timer for Locked Funds */}
                        {isLocked && lockedUnclaimed > 0 && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-yellow-500">
                                  ⏱️ Locked funds unlock in
                                </p>
                                <p className="text-xs text-yellow-500/70 mt-1">
                                  {formatDate(distribution.unlockTime!, true)}
                                </p>
                              </div>
                              <div className="flex gap-2 text-center">
                                {days > 0 && (
                                  <div className="px-2">
                                    <p className="text-xl font-bold text-yellow-500">
                                      {days}
                                    </p>
                                    <p className="text-xs text-yellow-500/70">
                                      days
                                    </p>
                                  </div>
                                )}
                                <div className="px-2">
                                  <p className="text-xl font-bold text-yellow-500">
                                    {hours}
                                  </p>
                                  <p className="text-xs text-yellow-500/70">
                                    hrs
                                  </p>
                                </div>
                                <div className="px-2">
                                  <p className="text-xl font-bold text-yellow-500">
                                    {minutes}
                                  </p>
                                  <p className="text-xs text-yellow-500/70">
                                    min
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Claim Button */}
                        <Button
                          onClick={() => handleClaim(distribution)}
                          disabled={isClaimingLoading || claimableNow === 0}
                          className="w-full"
                          size="lg"
                        >
                          {isClaimingLoading
                            ? "Processing..."
                            : claimableNow > 0
                              ? `Claim $${claimableNow.toFixed(2)} USDC`
                              : isLocked
                                ? "Funds Locked - Not Yet Available"
                                : "Nothing to Claim"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Information & Activity - Single Unified Card */}
        <Card className="bg-theme-card-bg border-theme-border">
          <CardContent className="pt-6 space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-sm font-semibold text-theme-text-highlight mb-1">
                Basic Information
              </h3>
              <p className="text-xs text-theme-text/60 mb-4">
                Your profile details and wallet information
              </p>
              {/* Quick Stats Grid */}
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
                    <p className="text-xs text-theme-text/60">Age & Gender</p>
                    <p className="text-sm font-medium">
                      {beneficiary.age} years, {beneficiary.gender}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border">
                  <Users className="h-5 w-5 text-theme-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-theme-text/60">Family Size</p>
                    <p className="text-sm font-medium">
                      {beneficiary.familySize} members
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-background border border-theme-border">
                  <Calendar className="h-5 w-5 text-theme-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-theme-text/60">Registered</p>
                    <p className="text-sm font-medium">
                      {formatDate(beneficiary.registeredAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="mt-4 pt-4 border-t border-theme-border">
                <h4 className="text-xs font-medium text-theme-text/60 mb-2">
                  Wallet Address
                </h4>
                <code className="text-sm font-mono text-theme-text break-all">
                  {beneficiary.authority.toBase58()}
                </code>
              </div>
            </div>

            {/* Activity Section */}
            <div className="pt-6 border-t border-theme-border">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-theme-text/60">
                  Activity
                </h3>
                <p className="text-xs text-theme-text/60 mt-1">
                  Transaction history, donations received, and fund claims
                </p>
              </div>
              <div>
                {donationsLoading ? (
                  <div className="space-y-2">
                    {Array.from(
                      { length: 3 },
                      (_, i) => `donation-skeleton-${i}`,
                    ).map((key) => (
                      <div
                        key={key}
                        className="border border-theme-border rounded-lg p-4"
                      >
                        <div className="h-5 w-full bg-theme-border rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : beneficiaryDonations.length === 0 &&
                  beneficiaryDistributions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                      <DonationIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-theme-text-highlight mb-2">
                      No activity yet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your donations and claims will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Show claimed distributions */}
                    {beneficiaryDistributions
                      .filter((d) => d.isFullyClaimed)
                      .map((distribution) => {
                        const key = `dist-${distribution.publicKey.toString()}`;
                        const isExpanded = expandedItems.has(key);
                        const amount = distribution.amountAllocated / 1_000_000;

                        return (
                          <div
                            key={key}
                            className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                          >
                            <button
                              type="button"
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                              onClick={() => toggleExpanded(key)}
                            >
                              <ChevronDown
                                className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <FundIcon className="h-4 w-4 text-theme-primary shrink-0" />
                              <span className="text-theme-text/60">
                                Claimed
                              </span>
                              <span className="font-semibold text-theme-primary">
                                ${amount.toFixed(2)} USDC
                              </span>
                              <span className="text-theme-text/60">
                                from pool distribution
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
                                          Amount Allocated
                                        </p>
                                        <p className="text-sm text-theme-text">
                                          ${amount.toFixed(2)} USDC
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-theme-text/60 mb-1">
                                          Status
                                        </p>
                                        <Badge variant="default">
                                          Fully Claimed
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

                    {/* Show donations */}
                    {beneficiaryDonations.map((donation) => {
                      const key = `don-${donation.publicKey.toString()}`;
                      const isExpanded = expandedItems.has(key);
                      const netAmount = donation.netAmount / 1_000_000;

                      return (
                        <div
                          key={key}
                          className="border border-theme-border rounded-lg overflow-hidden hover:border-theme-primary/50 transition-all duration-200"
                        >
                          <button
                            type="button"
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-theme-primary/5 w-full text-left"
                            onClick={() => toggleExpanded(key)}
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-theme-text transition-transform duration-200 shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                            <DonationIcon className="h-4 w-4 text-theme-primary shrink-0" />
                            <span className="text-theme-text/60">Received</span>
                            <span className="font-semibold text-theme-primary">
                              ${netAmount.toFixed(2)} USDC
                            </span>
                            <span className="text-theme-text/60">
                              from{" "}
                              {donation.isAnonymous ? "Anonymous" : "Donor"}
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
                                          ? "Anonymous"
                                          : donation.donor.toBase58()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Amount
                                      </p>
                                      <p className="text-sm text-theme-text">
                                        $
                                        {(donation.amount / 1_000_000).toFixed(
                                          2,
                                        )}{" "}
                                        USDC
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
                                        ${netAmount.toFixed(2)} USDC
                                      </p>
                                    </div>
                                    {donation.transactionSignature && (
                                      <div className="md:col-span-2">
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

                                  {donation.message && (
                                    <div>
                                      <p className="text-xs text-theme-text/60 mb-1">
                                        Message
                                      </p>
                                      <p className="text-sm text-theme-text italic bg-theme-card-bg p-3 rounded border border-theme-border">
                                        "{donation.message}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
