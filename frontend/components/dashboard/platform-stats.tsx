"use client";

import { AlertTriangle, Building2, Users } from "lucide-react";
import { DonationIcon } from "@/components/icons/donation-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export function PlatformStats() {
  const { config, loading } = usePlatformConfig();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => {
          const uniqueId = `stats-skeleton-${Date.now()}-${i}`;
          return (
            <Card key={uniqueId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const stats = [
    {
      title: "Total Aid Distributed",
      value: formatCurrency(config.totalAidDistributed),
      icon: DonationIcon,
      description: `From $${(config.totalDonations / 1e6).toFixed(2)} USDC donated`,
    },
    {
      title: "Verified Beneficiaries",
      value: formatNumber(config.totalVerifiedBeneficiaries),
      icon: Users,
      description: `Out of ${formatNumber(config.totalBeneficiaries)} registered`,
    },
    {
      title: "Active Disasters",
      value: formatNumber(config.totalDisasters),
      icon: AlertTriangle,
      description: "Ongoing relief efforts",
    },
    {
      title: "Registered NGOs",
      value: formatNumber(config.totalNgos),
      icon: Building2,
      description: `${formatNumber(config.totalFieldWorkers)} field workers`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
