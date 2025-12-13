"use client";

import { Flag, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatVerificationStatus } from "@/lib/formatters";
import type { Beneficiary } from "@/types/program";

interface BeneficiaryTimelineProps {
  beneficiaries: Beneficiary[];
  verificationThreshold: number;
}

export function BeneficiaryTimeline({
  beneficiaries,
  verificationThreshold,
}: BeneficiaryTimelineProps) {
  // Group beneficiaries by date
  const groupedBeneficiaries = beneficiaries.reduce(
    (acc, beneficiary) => {
      const date = new Date(beneficiary.registeredAt * 1000).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(beneficiary);
      return acc;
    },
    {} as Record<string, Beneficiary[]>,
  );

  const sortedDates = Object.keys(groupedBeneficiaries).sort(
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

            {/* Beneficiaries for this date */}
            <div className="ml-7 space-y-3">
              {groupedBeneficiaries[date].map((beneficiary) => (
                <Link
                  key={beneficiary.publicKey.toBase58()}
                  href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                >
                  <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer bg-theme-card-bg border-theme-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-semibold text-theme-primary group-hover:text-theme-primary transition-colors">
                              {beneficiary.name}
                            </h4>
                            <Badge
                              variant={
                                formatVerificationStatus(
                                  beneficiary.verificationStatus,
                                ) === "Verified"
                                  ? "default"
                                  : formatVerificationStatus(
                                        beneficiary.verificationStatus,
                                      ) === "Flagged"
                                    ? "outline"
                                    : formatVerificationStatus(
                                          beneficiary.verificationStatus,
                                        ) === "Rejected"
                                      ? "outline"
                                      : "pending"
                              }
                              className={`shrink-0 text-xs px-2 py-0.5 ${
                                formatVerificationStatus(
                                  beneficiary.verificationStatus,
                                ) === "Flagged"
                                  ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                  : formatVerificationStatus(
                                        beneficiary.verificationStatus,
                                      ) === "Rejected"
                                    ? "border-red-500 text-red-500 bg-red-500/10"
                                    : ""
                              }`}
                            >
                              {formatVerificationStatus(
                                beneficiary.verificationStatus,
                              )}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-theme-text/60 mb-3">
                            <MapPin className="h-2.5 w-2.5" />
                            {beneficiary.location.city ||
                              beneficiary.location.region ||
                              beneficiary.location.district}
                            ,{" "}
                            {beneficiary.location.area ||
                              beneficiary.location.ward ||
                              ""}
                          </div>

                          <div className="flex items-center gap-6 text-xs mb-3">
                            <div className="flex items-center gap-1">
                              <span className="text-theme-text/60">
                                Disaster:{" "}
                              </span>
                              <span className="font-semibold text-theme-text">
                                {beneficiary.disasterId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-theme-text/60" />
                              <span className="text-theme-text/60">
                                Family:{" "}
                              </span>
                              <span className="font-semibold text-theme-text">
                                {beneficiary.familySize}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Flag className="h-3 w-3 text-theme-text/60" />
                              <span className="text-theme-text/60">
                                Approvals:{" "}
                              </span>
                              <span className="font-semibold text-theme-text">
                                {beneficiary.verifierApprovals.length}/
                                {verificationThreshold}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-theme-text/60">
                              Damage Severity:
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs px-2 py-0.5 ${
                                beneficiary.damageSeverity >= 8
                                  ? "border-red-500 text-red-500 bg-red-500/10"
                                  : beneficiary.damageSeverity >= 6
                                    ? "border-orange-500 text-orange-500 bg-orange-500/10"
                                    : beneficiary.damageSeverity >= 4
                                      ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                      : "border-green-500 text-green-500 bg-green-500/10"
                              }`}
                            >
                              {beneficiary.damageSeverity >= 8
                                ? "Critical"
                                : beneficiary.damageSeverity >= 6
                                  ? "Severe"
                                  : beneficiary.damageSeverity >= 4
                                    ? "Moderate"
                                    : "Minor"}{" "}
                              ({beneficiary.damageSeverity}/10)
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4">
                          <div className="text-xs text-theme-text/60">
                            {formatDate(beneficiary.registeredAt)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
