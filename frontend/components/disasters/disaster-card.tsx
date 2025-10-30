"use client";

import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatNumber, formatSeverity } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DisasterEvent } from "@/types/program";

interface DisasterCardProps {
  disaster: DisasterEvent;
}

export function DisasterCard({ disaster }: DisasterCardProps) {
  const severity = formatSeverity(disaster.severity);

  return (
    <Link href={`/disasters/${disaster.eventId}`}>
      <Card className="group hover:shadow-xl hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg text-theme-primary transition-colors">
                  {disaster.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
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
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {disaster.location.district}, Ward {disaster.location.ward}
              </CardDescription>
            </div>
            <Badge
              variant={disaster.isActive ? "default" : "log_action"}
              className="shrink-0"
            >
              {disaster.isActive ? "Active" : "Closed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {formatNumber(disaster.verifiedBeneficiaries)} /{" "}
                {formatNumber(disaster.totalBeneficiaries)} verified
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(disaster.declaredAt)}</span>
            </div>
          </div>

          <div className="text-sm">
            <span className="font-medium">Type:</span>{" "}
            <span className="text-muted-foreground">{disaster.eventType}</span>
          </div>

          {disaster.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {disaster.description}
            </p>
          )}

          {disaster.affectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {disaster.affectedAreas.slice(0, 3).map((area) => (
                <Badge key={area} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
              {disaster.affectedAreas.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{disaster.affectedAreas.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
