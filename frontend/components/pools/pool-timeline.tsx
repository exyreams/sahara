"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { formatDate, formatTokenAmount } from "@/lib/formatters";
import type { DistributionType, FundPool } from "@/types/program";

interface PoolTimelineProps {
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

export function PoolTimeline({ pools }: PoolTimelineProps) {
  const router = useRouter();
  const { config } = usePlatformConfig();
  const { data: tokenMetadata } = useTokenMetadata(config?.usdcMint || null);

  const handleClick = (poolId: string) => {
    router.push(`/pools/${poolId}`);
  };

  // Group pools by date
  const groupedPools = pools.reduce(
    (acc, pool) => {
      const date = new Date(pool.createdAt * 1000).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(pool);
      return acc;
    },
    {} as Record<string, FundPool[]>,
  );

  const sortedDates = Object.keys(groupedPools).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <div className="relative">
      {/* Continuous timeline line */}
      <div className="absolute left-1.5 top-0 bottom-0 w-px bg-theme-border" />

      <div className="space-y-6">
        {sortedDates.map((date) => (
          <div key={date} className="relative">
            {/* Date Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-3 h-3 bg-theme-primary rounded-full"></div>
              <h3 className="text-sm font-semibold text-theme-text">
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="flex-1 h-px bg-theme-border"></div>
            </div>

            {/* Pools for this date */}
            <div className="ml-7 space-y-3">
              {groupedPools[date].map((pool) => {
                const totalCollected = tokenMetadata
                  ? pool.totalDeposited / 10 ** tokenMetadata.decimals
                  : pool.totalDeposited / 1_000_000;
                const totalDistributed = tokenMetadata
                  ? pool.totalDistributed / 10 ** tokenMetadata.decimals
                  : pool.totalDistributed / 1_000_000;
                const availableFunds = totalCollected - totalDistributed;

                return (
                  <Card
                    key={pool.publicKey.toBase58()}
                    className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer bg-theme-card-bg border-theme-border"
                    onClick={() => handleClick(pool.publicKey.toString())}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-semibold text-theme-primary group-hover:text-theme-primary transition-colors">
                              {pool.name}
                            </h4>
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
                            <p className="text-xs text-theme-text/70 line-clamp-2 mb-3">
                              {pool.description}
                            </p>
                          )}

                          <div className="flex items-center gap-6 text-xs">
                            <div>
                              <span className="text-theme-text/60">
                                Collected:{" "}
                              </span>
                              <span className="font-semibold text-theme-primary/80">
                                {tokenMetadata
                                  ? formatTokenAmount(
                                      pool.totalDeposited,
                                      tokenMetadata.decimals,
                                      tokenMetadata.symbol,
                                    )
                                  : `${totalCollected.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      },
                                    )}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-theme-text/60">
                                Available:{" "}
                              </span>
                              <span className="font-semibold text-theme-primary/80">
                                {tokenMetadata
                                  ? formatTokenAmount(
                                      pool.totalDeposited -
                                        pool.totalDistributed,
                                      tokenMetadata.decimals,
                                      tokenMetadata.symbol,
                                    )
                                  : `${availableFunds.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      },
                                    )}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-theme-text/60">
                                Beneficiaries:{" "}
                              </span>
                              <span className="font-semibold text-theme-text">
                                {pool.beneficiaryCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-theme-text/60">
                                Donors:{" "}
                              </span>
                              <span className="font-semibold text-theme-text">
                                {pool.donorCount}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4">
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5"
                          >
                            {formatDistributionType(pool.distributionType)}
                          </Badge>
                          <div className="text-xs text-theme-text/60">
                            {formatDate(pool.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
