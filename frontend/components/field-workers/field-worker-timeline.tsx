"use client";

import { MapPin, Users, Flag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import type { Beneficiary, FieldWorker } from "@/types/program";

interface FieldWorkerTimelineProps {
  workers: FieldWorker[];
  beneficiaries?: Beneficiary[];
}

export function FieldWorkerTimeline({
  workers,
  beneficiaries = [],
}: FieldWorkerTimelineProps) {
  // Group workers by date
  const groupedWorkers = workers.reduce(
    (acc, worker) => {
      const date = new Date(worker.registeredAt * 1000).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(worker);
      return acc;
    },
    {} as Record<string, FieldWorker[]>,
  );

  const sortedDates = Object.keys(groupedWorkers).sort(
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

            {/* Workers for this date */}
            <div className="ml-7 space-y-3">
              {groupedWorkers[date].map((worker) => {
                const actualRegistrationsCount = beneficiaries.filter((b) =>
                  b.registeredBy.equals(worker.authority),
                ).length;

                return (
                  <Link
                    key={worker.authority.toBase58()}
                    href={`/ngo/field-workers/${worker.authority.toBase58()}`}
                  >
                    <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer bg-theme-card-bg border-theme-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-base font-semibold text-theme-primary group-hover:text-theme-primary transition-colors">
                                {worker.name}
                              </h4>
                              <Badge
                                variant={
                                  worker.isActive ? "default" : "secondary"
                                }
                                className="shrink-0 text-xs px-2 py-0.5"
                              >
                                {worker.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="text-xs text-theme-text/60 mb-3">
                              {worker.organization}
                            </div>

                            <div className="flex items-center gap-6 text-xs mb-3">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-theme-text/60" />
                                <span className="text-theme-text/60">
                                  Verifications:{" "}
                                </span>
                                <span className="font-semibold text-theme-text">
                                  {worker.verificationsCount}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-theme-text/60" />
                                <span className="text-theme-text/60">
                                  Registrations:{" "}
                                </span>
                                <span className="font-semibold text-theme-text">
                                  {actualRegistrationsCount}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Flag className="h-3 w-3 text-theme-text/60" />
                                <span className="text-theme-text/60">
                                  Flags:{" "}
                                </span>
                                <span className="font-semibold text-theme-text">
                                  {worker.flagsRaised}
                                </span>
                              </div>
                            </div>

                            {worker.assignedDistricts.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {worker.assignedDistricts
                                  .slice(0, 3)
                                  .map((district) => (
                                    <Badge
                                      key={district}
                                      variant="outline"
                                      className="text-xs px-2 py-0.5 flex items-center gap-1"
                                    >
                                      <MapPin className="h-2.5 w-2.5" />
                                      {district}
                                    </Badge>
                                  ))}
                                {worker.assignedDistricts.length > 3 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5"
                                  >
                                    +{worker.assignedDistricts.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 ml-4">
                            <div className="text-xs text-theme-text/60">
                              {formatDate(worker.registeredAt)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
