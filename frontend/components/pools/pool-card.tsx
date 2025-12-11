"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import type { DistributionType, FundPool } from "@/types/program";

interface PoolCardProps {
  pool: FundPool;
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

export function PoolCard({ pool }: PoolCardProps) {
  const router = useRouter();
  const { config } = usePlatformConfig();
  const { data: tokenMetadata } = useTokenMetadata(config?.usdcMint || null);

  // Get dynamic token decimals and symbol
  const decimals = tokenMetadata?.decimals ?? 9; // fallback to 9 for your test token
  const tokenSymbol = tokenMetadata?.symbol || "TOKEN";

  // Helper function to format currency amounts
  const formatCurrency = (amount: number) => {
    const formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // Remove .00 if it's exactly .00, but keep other decimals like .20
    return formatted.endsWith(".00") ? formatted.slice(0, -3) : formatted;
  };

  const handleClick = () => {
    router.push(`/pools/${pool.publicKey.toString()}`);
  };

  return (
    <Card
      className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer h-full bg-theme-card-bg border-theme-border"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base text-theme-primary group-hover:text-theme-primary transition-colors">
                {pool.name}
              </CardTitle>
              <Badge
                variant={pool.isActive ? "default" : "log_action"}
                className="shrink-0 text-xs px-2 py-0.5"
              >
                {pool.isActive ? "Active" : "Closed"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-theme-text/60">
              {pool.disasterId} • Pool #
              {pool.poolId.split("-").pop() || pool.poolId}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Description */}
        {pool.description && (
          <p className="text-xs text-theme-text/70 line-clamp-2">
            {pool.description}
          </p>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-theme-text/60">Total Collected</p>
            <p className="text-lg font-semibold text-theme-primary/80">
              {formatCurrency(pool.totalDeposited / 10 ** decimals)}{" "}
              {tokenSymbol}
            </p>
          </div>
          <div>
            <p className="text-xs text-theme-text/60">Available</p>
            <p className="text-lg font-semibold text-theme-success">
              {formatCurrency(
                (pool.totalDeposited - pool.totalDistributed) / 10 ** decimals,
              )}{" "}
              {tokenSymbol}
            </p>
          </div>
        </div>

        {/* Progress Bar (if target amount exists) */}
        {pool.targetAmount && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>
                {Math.min(
                  (pool.totalDeposited / pool.targetAmount) * 100,
                  100,
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="w-full bg-theme-border rounded-full h-1.5">
              <div
                className="bg-theme-primary h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (pool.totalDeposited / pool.targetAmount) * 100,
                    100,
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-theme-text/60">
              Target: {formatCurrency(pool.targetAmount / 1000000)} USDC
            </p>
          </div>
        )}

        {/* Beneficiaries and Donors */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-medium text-theme-text">
                {pool.beneficiaryCount}
              </span>
              <span className="text-theme-text/60 ml-1">Beneficiaries</span>
            </div>
            <div>
              <span className="font-medium text-theme-text">
                {pool.donorCount}
              </span>
              <span className="text-theme-text/60 ml-1">Donors</span>
            </div>
          </div>
        </div>

        {/* Distribution Type and Date */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {formatDistributionType(pool.distributionType)}
          </Badge>
          <span className="text-xs text-theme-text/60">
            {formatDate(pool.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
