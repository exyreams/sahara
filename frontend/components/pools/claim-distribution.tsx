"use client";

import { useQueryClient } from "@tanstack/react-query";
import BN from "bn.js";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDistributions } from "@/hooks/use-distributions";
import { usePools } from "@/hooks/use-pools";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveBeneficiaryPDA,
  deriveDistributionPDA,
  deriveFundPoolPDA,
  derivePlatformConfigPDA,
  derivePoolRegistrationActivityLogPDA,
  derivePoolTokenAccountPDA,
} from "@/lib/anchor/pdas";
import {
  getAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@/lib/anchor/token-helpers";
import { formatAddress, formatAmount, formatDate } from "@/lib/formatters";
import type { Distribution, FundPool } from "@/types/program";

interface ClaimDistributionProps {
  onSuccess?: () => void;
}

interface DistributionWithPool extends Distribution {
  poolData?: FundPool;
}

export function ClaimDistribution({ onSuccess }: ClaimDistributionProps) {
  const { wallet, program } = useProgram();
  const queryClient = useQueryClient();
  const {
    distributions,
    loading: loadingDistributions,
    refetch,
  } = useDistributions();
  const { pools, loading: loadingPools } = usePools();
  const { submit, isLoading } = useTransaction();
  const [pendingClaims, setPendingClaims] = useState<DistributionWithPool[]>(
    [],
  );

  useEffect(() => {
    if (!wallet.publicKey || loadingDistributions || loadingPools) return;

    // Filter distributions for connected wallet
    const userDistributions = distributions.filter(
      (d) =>
        wallet.publicKey &&
        d.beneficiary.equals(wallet.publicKey) &&
        !d.isFullyClaimed,
    );

    // Enrich with pool data
    const enriched = userDistributions.map((dist) => {
      const poolData = pools.find((p) => p.publicKey.equals(dist.pool));
      return { ...dist, poolData };
    });

    setPendingClaims(enriched);
  }, [
    wallet.publicKey,
    distributions,
    pools,
    loadingDistributions,
    loadingPools,
  ]);

  const handleClaim = async (distribution: DistributionWithPool) => {
    if (!wallet.publicKey || !distribution.poolData || !program) {
      return;
    }

    const walletPubkey = wallet.publicKey; // Store in const to satisfy TypeScript

    await submit(
      async () => {
        const pool = distribution.poolData;
        if (!pool) return "error";

        // Get platform config to get USDC mint
        const [platformConfigPDA] = derivePlatformConfigPDA();
        const platformConfig =
          await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          (program.account as any).platformConfig.fetch(platformConfigPDA);

        // Derive PDAs
        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);
        const [poolTokenAccountPDA] = derivePoolTokenAccountPDA(
          pool.disasterId,
          pool.poolId,
        );
        const [distributionPDA] = deriveDistributionPDA(walletPubkey, poolPDA);
        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          walletPubkey,
          pool.disasterId,
        );

        // Get beneficiary token account
        const beneficiaryTokenAccount = await getAssociatedTokenAccount(
          walletPubkey,
          platformConfig.usdcMint,
        );

        // Generate timestamp for unique activity log
        const timestamp = Math.floor(Date.now() / 1000);

        // Derive activity log PDA with pool, beneficiary, and timestamp
        const [activityLogPDA] = derivePoolRegistrationActivityLogPDA(
          poolPDA,
          beneficiaryPDA,
          timestamp,
        );

        // Call claim_distribution instruction
        const tx = await program.methods
          .claimDistribution(pool.disasterId, pool.poolId, new BN(timestamp))
          .accounts({
            distribution: distributionPDA,
            activityLog: activityLogPDA,
            pool: poolPDA,
            poolTokenAccount: poolTokenAccountPDA,
            beneficiary: beneficiaryPDA,
            beneficiaryTokenAccount,
            beneficiaryAuthority: walletPubkey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: `Claimed ${formatAmount(
          distribution.amountAllocated - distribution.amountClaimed,
        )} USDC`,
        onSuccess: () => {
          // Invalidate distributions query to refetch data
          queryClient.invalidateQueries({ queryKey: ["distributions"] });

          refetch();
          onSuccess?.();
        },
      },
    );
  };

  const canClaimLocked = (distribution: Distribution): boolean => {
    if (!distribution.unlockTime) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= distribution.unlockTime;
  };

  if (!wallet.publicKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Claim Distributions</CardTitle>
          <CardDescription>
            Connect your wallet to view pending distributions
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loadingDistributions || loadingPools) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Claim Distributions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingClaims.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Claim Distributions</CardTitle>
          <CardDescription>
            You have no pending distributions to claim
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Distributions</CardTitle>
          <CardDescription>
            You have {pendingClaims.length} distribution
            {pendingClaims.length !== 1 ? "s" : ""} available to claim
          </CardDescription>
        </CardHeader>
      </Card>

      {pendingClaims.map((distribution) => {
        const unclaimedAmount =
          distribution.amountAllocated - distribution.amountClaimed;
        const immediateUnclaimed =
          distribution.amountImmediate -
          (distribution.claimedAt ? distribution.amountImmediate : 0);
        const lockedUnclaimed =
          distribution.amountLocked -
          (distribution.lockedClaimedAt ? distribution.amountLocked : 0);
        const isLocked = !canClaimLocked(distribution);

        // Calculate time remaining for locked funds
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = distribution.unlockTime
          ? Math.max(0, distribution.unlockTime - now)
          : 0;
        const days = Math.floor(timeRemaining / 86400);
        const hours = Math.floor((timeRemaining % 86400) / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);

        return (
          <Card
            key={distribution.publicKey.toString()}
            className="border-theme-border"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg text-theme-text-highlight">
                    {distribution.poolData?.name || "Unknown Pool"}
                  </CardTitle>
                  <div className="flex flex-col gap-1 mt-2">
                    <p className="text-xs text-theme-text/60">
                      Pool ID:{" "}
                      <span className="font-mono text-theme-text/80">
                        {distribution.poolData?.poolId || "N/A"}
                      </span>
                    </p>
                    <p className="text-xs text-theme-text/60">
                      Disaster:{" "}
                      <span className="text-theme-text/80">
                        {distribution.poolData?.disasterId || "N/A"}
                      </span>
                    </p>
                  </div>
                </div>
                <Badge
                  variant={isLocked ? "secondary" : "default"}
                  className={
                    isLocked
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "bg-green-500/20 text-green-500"
                  }
                >
                  {isLocked ? "🔒 Time-Locked" : "✓ Available"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                  <p className="text-xs text-theme-text/60 mb-1">
                    Total Allocated
                  </p>
                  <p className="text-xl font-bold text-theme-primary">
                    {formatAmount(distribution.amountAllocated)}{" "}
                    <span className="text-sm font-normal">USDC</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-theme-background border border-theme-border">
                  <p className="text-xs text-theme-text/60 mb-1">
                    Already Claimed
                  </p>
                  <p className="text-xl font-bold text-theme-text">
                    {formatAmount(distribution.amountClaimed)}{" "}
                    <span className="text-sm font-normal">USDC</span>
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              {(immediateUnclaimed > 0 || lockedUnclaimed > 0) && (
                <div className="border border-theme-border rounded-lg p-4">
                  <p className="text-sm font-semibold mb-3 text-theme-text-highlight">
                    Claim Breakdown
                  </p>
                  <div className="space-y-3">
                    {immediateUnclaimed > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-theme-text/80">
                            Immediate
                          </span>
                        </div>
                        <span className="font-semibold text-green-500">
                          {formatAmount(immediateUnclaimed)} USDC
                        </span>
                      </div>
                    )}
                    {lockedUnclaimed > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-sm text-theme-text/80">
                            Time-Locked
                          </span>
                        </div>
                        <span className="font-semibold text-yellow-500">
                          {formatAmount(lockedUnclaimed)} USDC
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Countdown Timer for Locked Funds */}
              {isLocked && lockedUnclaimed > 0 && timeRemaining > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-xs text-yellow-500 mb-2 font-medium">
                    ⏱️ Time Until Unlock
                  </p>
                  <div className="flex gap-3">
                    {days > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-500">
                          {days}
                        </p>
                        <p className="text-xs text-yellow-500/70">days</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-500">
                        {hours}
                      </p>
                      <p className="text-xs text-yellow-500/70">hours</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-500">
                        {minutes}
                      </p>
                      <p className="text-xs text-yellow-500/70">mins</p>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-500/70 mt-2">
                    Unlocks on {formatDate(distribution.unlockTime!, true)}
                  </p>
                </div>
              )}

              {/* Already Unlocked */}
              {!isLocked && distribution.unlockTime && lockedUnclaimed > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-sm text-green-500">
                    ✓ Locked funds unlocked since{" "}
                    {formatDate(distribution.unlockTime, true)}
                  </p>
                </div>
              )}

              {/* Claim Deadline */}
              {distribution.claimDeadline && unclaimedAmount > 0 && (
                <div
                  className={`text-sm ${
                    distribution.claimDeadline < Math.floor(Date.now() / 1000)
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {distribution.claimDeadline <
                  Math.floor(Date.now() / 1000) ? (
                    <>
                      ⚠️ Claim deadline passed on{" "}
                      {formatDate(distribution.claimDeadline, true)}
                    </>
                  ) : (
                    <>
                      Claim before{" "}
                      {formatDate(distribution.claimDeadline, true)}
                    </>
                  )}
                </div>
              )}

              {/* Notes */}
              {distribution.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Notes:</p>
                  <p>{distribution.notes}</p>
                </div>
              )}

              {/* Expired Warning */}
              {distribution.isExpired && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">
                  This distribution has expired and funds were returned to the
                  pool.
                </div>
              )}

              {/* Claim Button */}
              <Button
                onClick={() =>
                  handleClaim(distribution as DistributionWithPool)
                }
                disabled={
                  isLoading ||
                  unclaimedAmount === 0 ||
                  distribution.isExpired ||
                  (lockedUnclaimed > 0 && isLocked && immediateUnclaimed === 0)
                }
                className="w-full"
              >
                {isLoading
                  ? "Processing..."
                  : distribution.isExpired
                    ? "Expired - Funds Returned to Pool"
                    : isLocked && immediateUnclaimed === 0
                      ? "Locked - Not Yet Available"
                      : `Claim ${formatAmount(
                          immediateUnclaimed > 0
                            ? immediateUnclaimed
                            : unclaimedAmount,
                        )} USDC`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Allocated on {formatDate(distribution.createdAt)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
