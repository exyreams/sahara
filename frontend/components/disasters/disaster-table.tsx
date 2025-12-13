"use client";

import { Calendar, MapPin, Users } from "lucide-react";
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
import { formatDate, formatNumber, formatSeverity } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DisasterEvent } from "@/types/program";

interface DisasterTableProps {
  disasters: DisasterEvent[];
}

export function DisasterTable({ disasters }: DisasterTableProps) {
  return (
    <div className="rounded-md border border-theme-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium">Name</TableHead>
            <TableHead className="text-xs font-medium">Location</TableHead>
            <TableHead className="text-xs font-medium">Type</TableHead>
            <TableHead className="text-xs font-medium">Severity</TableHead>
            <TableHead className="text-xs font-medium">Beneficiaries</TableHead>
            <TableHead className="text-xs font-medium">Date</TableHead>
            <TableHead className="text-xs font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {disasters.map((disaster) => {
            const severity = formatSeverity(disaster.severity);
            return (
              <TableRow
                key={disaster.publicKey.toBase58()}
                className="hover:bg-theme-card-bg/50 cursor-pointer"
              >
                <TableCell className="py-2">
                  <Link
                    href={`/disasters/${disaster.eventId}`}
                    className="text-theme-primary hover:underline font-medium text-sm"
                  >
                    {disaster.name}
                  </Link>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {disaster.location.city}, {disaster.location.region}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs">{disaster.eventType}</span>
                </TableCell>
                <TableCell className="py-2">
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
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {formatNumber(disaster.verifiedBeneficiaries)} /{" "}
                    {formatNumber(disaster.totalBeneficiaries)}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(disaster.declaredAt)}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <Badge
                    variant={disaster.isActive ? "default" : "secondary"}
                    className="text-xs px-2 py-1"
                  >
                    {disaster.isActive ? "Active" : "Closed"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
