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

  // Convert from microUSDC to USDC
  const totalCollected = pool.totalDeposited / 1_000_000;
  const totalDistributed = pool.totalDistributed / 1_000_000;
  const availableFunds = totalCollected - totalDistributed;
  const targetAmount = pool.targetAmount ? pool.targetAmount / 1_000_000 : null;

  const progressPercentage = targetAmount
    ? Math.min((totalCollected / targetAmount) * 100, 100)
    : 0;

  const handleClick = () => {
    router.push(`/pools/${pool.publicKey.toString()}`);
  };

  return (
    <Card
      className="group hover:shadow-xl hover:border-theme-primary transition-all duration-300 cursor-pointer h-full bg-theme-card-bg border-theme-border"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg text-theme-primary group-hover:text-theme-primary transition-colors">
                {pool.name}
              </CardTitle>
              <Badge
                variant={pool.isActive ? "default" : "log_action"}
                className="shrink-0"
              >
                {pool.isActive ? "Active" : "Closed"}
              </Badge>
            </div>
            <CardDescription className="text-sm text-theme-text/60">
              {pool.disasterId} • {pool.poolId}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {pool.description && (
          <p className="text-sm text-theme-text/70 line-clamp-2">
            {pool.description}
          </p>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-theme-text/60">Total Collected</p>
            <p className="text-2xl font-semibold text-theme-primary/80">
              $
              {totalCollected.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-theme-text/60">Available</p>
            <p className="text-2xl font-semibold text-theme-primary/80">
              $
              {availableFunds.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* Progress Bar (if target amount is set) */}
        {targetAmount && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-theme-text/60">
              <span>Progress</span>
              <span>{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-theme-border rounded-full h-2">
              <div
                className="bg-theme-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-theme-text/60">
              Target: $
              {targetAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )}

        {/* Beneficiaries and Donors */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-semibold text-theme-text">
                {pool.beneficiaryCount}
              </span>
              <span className="text-theme-text/60 ml-1">beneficiaries</span>
            </div>
            <div>
              <span className="font-semibold text-theme-text">
                {pool.donorCount}
              </span>
              <span className="text-theme-text/60 ml-1">donors</span>
            </div>
          </div>
        </div>

        {/* Distribution Type and Date */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
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
