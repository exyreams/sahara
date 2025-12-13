"use client";

import { Calendar, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  formatSeverity,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DisasterEvent } from "@/types/program";

interface DisasterTimelineProps {
  disasters: DisasterEvent[];
}

export function DisasterTimeline({ disasters }: DisasterTimelineProps) {
  // Group disasters by date
  const groupedDisasters = disasters.reduce(
    (acc, disaster) => {
      const date = new Date(disaster.declaredAt * 1000).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(disaster);
      return acc;
    },
    {} as Record<string, DisasterEvent[]>,
  );

  const sortedDates = Object.keys(groupedDisasters).sort(
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

            {/* Disasters for this date */}
            <div className="ml-7 space-y-3">
              {groupedDisasters[date].map((disaster) => {
                const severity = formatSeverity(disaster.severity);
                return (
                  <Link
                    key={disaster.publicKey.toBase58()}
                    href={`/disasters/${disaster.eventId}`}
                  >
                    <div className="p-4 rounded-lg border border-theme-border hover:border-theme-primary hover:bg-theme-card-bg/50 transition-all cursor-pointer bg-theme-card-bg">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-base text-theme-primary">
                              {disaster.name}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs px-2 py-0.5",
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
                          <div className="text-xs text-theme-text/60">
                            {disaster.eventType}
                          </div>
                        </div>
                        <Badge
                          variant={disaster.isActive ? "default" : "log_action"}
                          className="text-xs px-2 py-0.5 shrink-0"
                        >
                          {disaster.isActive ? "Active" : "Closed"}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-6 text-xs mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-theme-text/60" />
                          <span className="text-theme-text/60">Location: </span>
                          <span className="font-semibold text-theme-text">
                            {disaster.location.city}, {disaster.location.region}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-theme-text/60" />
                          <span className="text-theme-text/60">
                            Beneficiaries:{" "}
                          </span>
                          <span className="font-semibold text-theme-text">
                            {formatNumber(disaster.verifiedBeneficiaries)} /{" "}
                            {formatNumber(disaster.totalBeneficiaries)} verified
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-theme-text/60" />
                          <span className="text-theme-text/60">Declared: </span>
                          <span className="font-semibold text-theme-text">
                            {formatDate(disaster.declaredAt)}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {disaster.description && (
                        <p className="text-xs text-theme-text/70 line-clamp-2">
                          {disaster.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
