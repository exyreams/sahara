"use client";

import { MapPin } from "lucide-react";
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
import { formatDate } from "@/lib/formatters";
import type { Beneficiary, FieldWorker } from "@/types/program";

interface FieldWorkerTableProps {
  workers: FieldWorker[];
  beneficiaries?: Beneficiary[];
}

export function FieldWorkerTable({
  workers,
  beneficiaries = [],
}: FieldWorkerTableProps) {
  return (
    <div className="border border-theme-border rounded-lg overflow-hidden bg-theme-card-bg">
      <Table>
        <TableHeader>
          <TableRow className="border-theme-border">
            <TableHead className="text-xs font-medium text-theme-text/60">
              Name
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Organization
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Status
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Verifications
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Registrations
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Flags
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Districts
            </TableHead>
            <TableHead className="text-xs font-medium text-theme-text/60">
              Registered
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.map((worker) => {
            const actualRegistrationsCount = beneficiaries.filter((b) =>
              b.registeredBy.equals(worker.authority),
            ).length;

            return (
              <TableRow
                key={worker.authority.toBase58()}
                className="cursor-pointer hover:bg-theme-border/20 border-theme-border"
              >
                <TableCell className="py-2">
                  <Link
                    href={`/ngo/field-workers/${worker.authority.toBase58()}`}
                  >
                    <div className="text-sm font-medium text-theme-primary hover:underline">
                      {worker.name}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-sm text-theme-text">
                    {worker.organization}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Badge
                    variant={worker.isActive ? "default" : "secondary"}
                    className="text-xs px-2 py-0.5"
                  >
                    {worker.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-sm font-semibold text-theme-primary">
                    {worker.verificationsCount}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-sm font-semibold text-theme-primary">
                    {actualRegistrationsCount}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-sm font-semibold text-theme-primary">
                    {worker.flagsRaised}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  {worker.assignedDistricts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {worker.assignedDistricts.slice(0, 2).map((district) => (
                        <Badge
                          key={district}
                          variant="outline"
                          className="text-xs px-1.5 py-0.5 flex items-center gap-1"
                        >
                          <MapPin className="h-2.5 w-2.5" />
                          {district}
                        </Badge>
                      ))}
                      {worker.assignedDistricts.length > 2 && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0.5"
                        >
                          +{worker.assignedDistricts.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-theme-text/60">None</div>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <div className="text-xs text-theme-text/60">
                    {formatDate(worker.registeredAt)}
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
