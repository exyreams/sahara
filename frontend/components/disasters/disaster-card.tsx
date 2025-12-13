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
import { COUNTRIES } from "@/lib/constants";
import type { DisasterEvent } from "@/types/program";

interface DisasterCardProps {
  disaster: DisasterEvent;
}

export function DisasterCard({ disaster }: DisasterCardProps) {
  const severity = formatSeverity(disaster.severity);

  return (
    <Link href={`/disasters/${disaster.eventId}`}>
      <Card className="group hover:shadow-xl hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="text-base text-theme-primary transition-colors">
                  {disaster.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-xs px-1.5 py-0.5",
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
              <CardDescription className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3 shrink-0" />
                {disaster.location.city}, {disaster.location.region},{" "}
                {COUNTRIES.find((c) => c.code === disaster.location.country)
                  ?.name || disaster.location.country}
              </CardDescription>
            </div>
            <Badge
              variant={disaster.isActive ? "default" : "log_action"}
              className="shrink-0 text-xs px-2 py-1"
            >
              {disaster.isActive ? "Active" : "Closed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {formatNumber(disaster.verifiedBeneficiaries)} /{" "}
                {formatNumber(disaster.totalBeneficiaries)} verified
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(disaster.declaredAt)}</span>
            </div>
          </div>

          <div className="text-xs">
            <span className="font-medium">Type:</span>{" "}
            <span className="text-muted-foreground">{disaster.eventType}</span>
          </div>

          {disaster.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {disaster.description}
            </p>
          )}

          {disaster.affectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {disaster.affectedAreas.slice(0, 3).map((area) => (
                <Badge
                  key={area}
                  variant="outline"
                  className="text-xs px-1.5 py-0.5"
                >
                  {area}
                </Badge>
              ))}
              {disaster.affectedAreas.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
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
