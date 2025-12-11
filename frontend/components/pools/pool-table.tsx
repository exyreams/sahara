"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTokenAmount } from "@/lib/formatters";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import type { DistributionType, FundPool } from "@/types/program";

interface PoolTableProps {
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

export function PoolTable({ pools }: PoolTableProps) {
  const router = useRouter();
  const { config } = usePlatformConfig();
  const { data: tokenMetadata } = useTokenMetadata(config?.usdcMint || null);

  const handleRowClick = (poolId: string) => {
    router.push(`/pools/${poolId}`);
  };

  return (
    <div className="border border-theme-border rounded-lg overflow-hidden bg-theme-card-bg">
      <Table>
        <TableHeader>
          <TableRow className="border-theme-border">
            <TableHead className="text-xs font-medium text-theme-text/60">
              Name
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Status
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Total Collected
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Available
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Beneficiaries
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Donors
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Distribution
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Created
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pools.map((pool) => {
            const totalCollected = tokenMetadata
              ? pool.totalDeposited / 10 ** tokenMetadata.decimals
              : pool.totalDeposited / 1_000_000;
            const totalDistributed = tokenMetadata
              ? pool.totalDistributed / 10 ** tokenMetadata.decimals
              : pool.totalDistributed / 1_000_000;
            const availableFunds = totalCollected - totalDistributed;

            return (
              <TableRow
                key={pool.publicKey.toBase58()}
                className="cursor-pointer hover:bg-theme-border/20 border-theme-border"
                onClick={() => handleRowClick(pool.publicKey.toString())}
              >
                <TableCell className="py-2">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-theme-text">
                      {pool.name}
                    </div>
                    <div className="text-xs text-theme-text/60">
                      {pool.disasterId} • {pool.poolId}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Badge
                    variant={pool.isActive ? "default" : "log_action"}
                    className="text-xs px-2 py-0.5"
                  >
                    {pool.isActive ? "Active" : "Closed"}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">
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
                </TableCell>
                <TableCell className="py-2">
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
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-sm text-theme-text">
                    {pool.beneficiaryCount}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-sm text-theme-text">
                    {pool.donorCount}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {formatDistributionType(pool.distributionType)}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-xs text-theme-text/60">
                    {formatDate(pool.createdAt)}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
