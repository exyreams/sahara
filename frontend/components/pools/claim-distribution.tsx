"use client";

import { useQueryClient } from "@tanstack/react-query";
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
    []
  );

  useEffect(() => {
    if (!wallet.publicKey || loadingDistributions || loadingPools) return;

    // Filter distributions for connected wallet
    const userDistributions = distributions.filter(
      (d) =>
        wallet.publicKey &&
        d.beneficiary.equals(wallet.publicKey) &&
        !d.isFullyClaimed
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
          pool.poolId
        );
        const [distributionPDA] = deriveDistributionPDA(walletPubkey, poolPDA);
        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          walletPubkey,
          pool.disasterId
        );

        // Get beneficiary token account
        const beneficiaryTokenAccount = await getAssociatedTokenAccount(
          walletPubkey,
          platformConfig.usdcMint
        );

        // Call claim_distribution instruction
        const tx = await program.methods
          .claimDistribution(pool.disasterId, pool.poolId)
          .accounts({
            distribution: distributionPDA,
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
          distribution.amountAllocated - distribution.amountClaimed
        )} USDC`,
        onSuccess: () => {
          // Invalidate distributions query to refetch data
          queryClient.invalidateQueries({ queryKey: ["distributions"] });

          refetch();
          onSuccess?.();
        },
      }
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

        return (
          <Card key={distribution.publicKey.toString()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {distribution.poolData?.name || "Unknown Pool"}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {formatAddress(distribution.pool)}
                  </CardDescription>
                </div>
                <Badge variant={isLocked ? "secondary" : "default"}>
                  {isLocked ? "Time-Locked" : "Available"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Amount Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Allocated
                  </p>
                  <p className="text-xl font-bold">
                    {formatAmount(distribution.amountAllocated)} USDC
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Already Claimed
                  </p>
                  <p className="text-xl font-bold">
                    {formatAmount(distribution.amountClaimed)} USDC
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              {(immediateUnclaimed > 0 || lockedUnclaimed > 0) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Breakdown</p>
                  <div className="space-y-2">
                    {immediateUnclaimed > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Immediate:
                        </span>
                        <span className="font-medium">
                          {formatAmount(immediateUnclaimed)} USDC
                        </span>
                      </div>
                    )}
                    {lockedUnclaimed > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Time-Locked:
                        </span>
                        <span className="font-medium">
                          {formatAmount(lockedUnclaimed)} USDC
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unlock Time */}
              {distribution.unlockTime && lockedUnclaimed > 0 && (
                <div className="text-sm text-muted-foreground">
                  {isLocked ? (
                    <>Unlocks on {formatDate(distribution.unlockTime, true)}</>
                  ) : (
                    <>
                      Unlocked since {formatDate(distribution.unlockTime, true)}
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

              {/* Claim Button */}
              <Button
                onClick={() =>
                  handleClaim(distribution as DistributionWithPool)
                }
                disabled={
                  isLoading ||
                  unclaimedAmount === 0 ||
                  (lockedUnclaimed > 0 && isLocked && immediateUnclaimed === 0)
                }
                className="w-full"
              >
                {isLoading
                  ? "Processing..."
                  : isLocked && immediateUnclaimed === 0
                  ? "Locked - Not Yet Available"
                  : `Claim ${formatAmount(
                      immediateUnclaimed > 0
                        ? immediateUnclaimed
                        : unclaimedAmount
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
