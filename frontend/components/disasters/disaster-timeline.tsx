"use client";

import { Calendar, MapPin, Users, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  formatDate,
  formatNumber,
  formatSeverity,
  formatRelativeTime,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DisasterEvent } from "@/types/program";

interface DisasterTimelineProps {
  disasters: DisasterEvent[];
}

export function DisasterTimeline({ disasters }: DisasterTimelineProps) {
  // Sort disasters by date (newest first)
  const sortedDisasters = [...disasters].sort(
    (a, b) => b.declaredAt - a.declaredAt,
  );

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-theme-border" />

      <div className="space-y-4">
        {sortedDisasters.map((disaster, index) => {
          const severity = formatSeverity(disaster.severity);
          return (
            <div key={disaster.publicKey.toBase58()} className="relative">
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute left-2 w-4 h-4 rounded-full border-2 bg-theme-background flex items-center justify-center",
                  disaster.isActive
                    ? "border-theme-primary"
                    : "border-theme-border",
                  severity.color === "red" && "border-red-500",
                  severity.color === "orange" && "border-orange-500",
                  severity.color === "yellow" && "border-yellow-500",
                  severity.color === "green" && "border-green-500",
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    disaster.isActive ? "bg-theme-primary" : "bg-theme-border",
                    severity.color === "red" && "bg-red-500",
                    severity.color === "orange" && "bg-orange-500",
                    severity.color === "yellow" && "bg-yellow-500",
                    severity.color === "green" && "bg-green-500",
                  )}
                />
              </div>

              {/* Content */}
              <div className="ml-10">
                <Link href={`/disasters/${disaster.eventId}`}>
                  <div className="p-4 rounded-lg border border-theme-border hover:border-theme-primary hover:bg-theme-card-bg/50 transition-all cursor-pointer">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm text-theme-primary">
                            {disaster.name}
                          </h3>
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
                        <div className="text-xs text-muted-foreground">
                          {disaster.eventType}
                        </div>
                      </div>
                      <Badge
                        variant={disaster.isActive ? "default" : "secondary"}
                        className="text-xs px-2 py-1 shrink-0"
                      >
                        {disaster.isActive ? "Active" : "Closed"}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {disaster.location.district}, Ward{" "}
                        {disaster.location.ward}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {formatNumber(disaster.verifiedBeneficiaries)} /{" "}
                        {formatNumber(disaster.totalBeneficiaries)} verified
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(disaster.declaredAt)}
                      </div>
                    </div>

                    {/* Description */}
                    {disaster.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {disaster.description}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
