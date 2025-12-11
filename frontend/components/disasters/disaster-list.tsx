"use client";

import { Calendar, MapPin, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber, formatSeverity } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DisasterEvent } from "@/types/program";

interface DisasterListProps {
  disasters: DisasterEvent[];
}

export function DisasterList({ disasters }: DisasterListProps) {
  return (
    <div className="space-y-1">
      {disasters.map((disaster) => {
        const severity = formatSeverity(disaster.severity);
        return (
          <Link
            key={disaster.publicKey.toBase58()}
            href={`/disasters/${disaster.eventId}`}
            className="block"
          >
            <div className="flex items-center gap-3 p-3 rounded-lg border border-theme-border hover:border-theme-primary hover:bg-theme-card-bg/50 transition-all cursor-pointer">
              {/* Severity Icon */}
              <div
                className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  severity.color === "red" && "bg-red-500/10 text-red-500",
                  severity.color === "orange" &&
                    "bg-orange-500/10 text-orange-500",
                  severity.color === "yellow" &&
                    "bg-yellow-500/10 text-yellow-500",
                  severity.color === "green" &&
                    "bg-green-500/10 text-green-500",
                )}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm text-theme-primary truncate">
                    {disaster.name}
                  </h3>
                  <Badge
                    variant={disaster.isActive ? "default" : "secondary"}
                    className="text-xs px-1.5 py-0.5 shrink-0"
                  >
                    {disaster.isActive ? "Active" : "Closed"}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {disaster.location.district}, Ward {disaster.location.ward}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {formatNumber(disaster.verifiedBeneficiaries)}/
                    {formatNumber(disaster.totalBeneficiaries)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(disaster.declaredAt)}
                  </div>
                </div>
              </div>

              {/* Type & Severity */}
              <div className="shrink-0 text-right">
                <div className="text-xs text-muted-foreground mb-1">
                  {disaster.eventType}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-1.5 py-0.5",
                    severity.color === "red" &&
                      "border-red-500 text-red-500 bg-red-500/10",
                    severity.color === "orange" &&
                      "border-orange-500 text-orange-500 bg-orange-500/10",
                    severity.color === "yellow" &&
                      "border-yellow-500 text-yellow-500 bg-yellow-500/10",
                    severity.color === "green" &&
                      "border-green-500 text-green-500 bg-green-500/10",
                  )}
                >
                  {severity.label}
                </Badge>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
