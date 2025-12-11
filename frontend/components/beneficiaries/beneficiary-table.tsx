"use client";

import { MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatVerificationStatus } from "@/lib/formatters";
import type { Beneficiary } from "@/types/program";

interface BeneficiaryTableProps {
  beneficiaries: Beneficiary[];
  verificationThreshold: number;
}

export function BeneficiaryTable({
  beneficiaries,
  verificationThreshold,
}: BeneficiaryTableProps) {
  return (
    <div className="border border-theme-border rounded-lg overflow-hidden bg-theme-card-bg">
      <Table>
        <TableHeader>
          <TableRow className="border-theme-border">
            <TableHead className="text-xs font-medium text-theme-text/60">
              Name
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Location
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Status
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Disaster
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Family Size
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Damage Severity
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Approvals
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Registered
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {beneficiaries.map((beneficiary) => (
            <TableRow
              key={beneficiary.publicKey.toBase58()}
              className="cursor-pointer hover:bg-theme-border/20 border-theme-border"
            >
              <TableCell className="py-2">
                <Link
                  href={`/beneficiaries/${beneficiary.authority.toBase58()}`}
                >
                  <div className="text-sm font-medium text-theme-primary hover:underline">
                    {beneficiary.name}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-1 text-xs">
                  <MapPin className="h-2.5 w-2.5 text-theme-text/60" />
                  <span className="text-theme-text">
                    {beneficiary.location.district}, Ward{" "}
                    {beneficiary.location.ward}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2">
                <Badge
                  variant={
                    formatVerificationStatus(beneficiary.verificationStatus) ===
                    "Verified"
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
                  className={`text-xs px-2 py-0.5 ${
                    formatVerificationStatus(beneficiary.verificationStatus) ===
                    "Flagged"
                      ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                      : formatVerificationStatus(
                            beneficiary.verificationStatus,
                          ) === "Rejected"
                        ? "border-red-500 text-red-500 bg-red-500/10"
                        : ""
                  }`}
                >
                  {formatVerificationStatus(beneficiary.verificationStatus)}
                </Badge>
              </TableCell>
              <TableCell className="py-2">
                <div className="text-sm text-theme-text">
                  {beneficiary.disasterId}
                </div>
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-3 w-3 text-theme-text/60" />
                  <span className="text-theme-text">
                    {beneficiary.familySize}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2">
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
              </TableCell>
              <TableCell className="py-2">
                <div className="text-sm font-semibold text-theme-text">
                  {beneficiary.verifierApprovals.length}/{verificationThreshold}
                </div>
              </TableCell>
              <TableCell className="py-2">
                <div className="text-xs text-theme-text/60">
                  {formatDate(beneficiary.registeredAt)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
