"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatTokenAmount } from "@/lib/formatters";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import type { DistributionType, FundPool } from "@/types/program";

interface PoolListProps {
  pools: FundPool[];
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

export function PoolList({ pools }: PoolListProps) {
  const router = useRouter();
  const { config } = usePlatformConfig();
  const { data: tokenMetadata } = useTokenMetadata(config?.usdcMint || null);

  const handleClick = (poolId: string) => {
    router.push(`/pools/${poolId}`);
  };

  return (
    <div className="space-y-2">
      {pools.map((pool) => {
        const totalCollected = tokenMetadata
          ? pool.totalDeposited / 10 ** tokenMetadata.decimals
          : pool.totalDeposited / 1_000_000;
        const totalDistributed = tokenMetadata
          ? pool.totalDistributed / 10 ** tokenMetadata.decimals
          : pool.totalDistributed / 1_000_000;
        const availableFunds = totalCollected - totalDistributed;
        const targetAmount = pool.targetAmount
          ? tokenMetadata
            ? pool.targetAmount / 10 ** tokenMetadata.decimals
            : pool.targetAmount / 1_000_000
          : null;

        const progressPercentage = targetAmount
          ? Math.min((totalCollected / targetAmount) * 100, 100)
          : 0;

        return (
          <Card
            key={pool.publicKey.toBase58()}
            className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer bg-theme-card-bg border-theme-border"
            onClick={() => handleClick(pool.publicKey.toString())}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-theme-primary group-hover:text-theme-primary transition-colors truncate">
                      {pool.name}
                    </h3>
                    <Badge
                      variant={pool.isActive ? "default" : "log_action"}
                      className="shrink-0 text-xs px-2 py-0.5"
                    >
                      {pool.isActive ? "Active" : "Closed"}
                    </Badge>
                  </div>
                  <div className="text-xs text-theme-text/60 mb-2">
                    {pool.disasterId} • {pool.poolId}
                  </div>
                  {pool.description && (
                    <p className="text-xs text-theme-text/70 line-clamp-1 mb-2">
                      {pool.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6 ml-4">
                  <div className="text-right">
                    <div className="text-xs text-theme-text/60">
                      Total Collected
                    </div>
                    <div className="text-sm font-semibold text-theme-primary/80">
                      {tokenMetadata
                        ? formatTokenAmount(
                            pool.totalDeposited,
                            tokenMetadata.decimals,
                            tokenMetadata.symbol,
                          )
                        : `${totalCollected.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-theme-text/60">Available</div>
                    <div className="text-sm font-semibold text-theme-primary/80">
                      {tokenMetadata
                        ? formatTokenAmount(
                            pool.totalDeposited - pool.totalDistributed,
                            tokenMetadata.decimals,
                            tokenMetadata.symbol,
                          )
                        : `${availableFunds.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-theme-text/60">
                      Beneficiaries
                    </div>
                    <div className="text-sm font-semibold text-theme-text">
                      {pool.beneficiaryCount}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-theme-text/60">Donors</div>
                    <div className="text-sm font-semibold text-theme-text">
                      {pool.donorCount}
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {formatDistributionType(pool.distributionType)}
                    </Badge>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-theme-text/60">
                      {formatDate(pool.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar (if target amount is set) */}
              {targetAmount && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-theme-text/60">
                    <span>Progress to target</span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-theme-border rounded-full h-1.5">
                    <div
                      className="bg-theme-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
