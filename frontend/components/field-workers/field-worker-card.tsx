import { MapPin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import type { Beneficiary, FieldWorker } from "@/types/program";

interface FieldWorkerCardProps {
  worker: FieldWorker;
  viewMode?: "grid" | "list";
  beneficiaries?: Beneficiary[];
}

export function FieldWorkerCard({
  worker,
  viewMode = "grid",
  beneficiaries = [],
}: FieldWorkerCardProps) {
  // Calculate actual registrations count from beneficiaries
  const actualRegistrationsCount = beneficiaries.filter((b) =>
    b.registeredBy.equals(worker.authority),
  ).length;
  if (viewMode === "list") {
    return (
      <Link href={`/ngo/field-workers/${worker.authority.toBase58()}`}>
        <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer">
          <CardContent className="p-3">
            <div className="flex items-center gap-4">
              {/* Left: Name, Organization, Districts */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-theme-primary transition-colors">
                    {worker.name}
                  </h3>
                  <Badge
                    variant={worker.isActive ? "default" : "secondary"}
                    className="text-xs px-2 py-0.5"
                  >
                    {worker.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {worker.organization}
                </p>
                {worker.assignedDistricts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-0.5">
                    {worker.assignedDistricts.slice(0, 3).map((district) => (
                      <Badge
                        key={district}
                        variant="secondary"
                        className="text-xs flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        {district}
                      </Badge>
                    ))}
                    {worker.assignedDistricts.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{worker.assignedDistricts.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Stats */}
              <div className="flex items-center gap-6 text-xs shrink-0">
                <div className="text-center">
                  <div className="text-lg font-bold text-theme-primary">
                    {worker.verificationsCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Verifications
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-theme-primary">
                    {actualRegistrationsCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Registrations
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-theme-primary">
                    {worker.flagsRaised}
                  </div>
                  <div className="text-xs text-muted-foreground">Flags</div>
                </div>
                <div className="text-center min-w-[80px]">
                  <div className="text-xs text-muted-foreground font-medium">
                    Registered
                  </div>
                  <div className="text-xs">
                    {formatDate(worker.registeredAt)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/ngo/field-workers/${worker.authority.toBase58()}`}>
      <Card className="group hover:shadow-lg hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-base text-theme-primary transition-colors">
                {worker.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {worker.organization}
              </CardDescription>
            </div>
            <Badge
              variant={worker.isActive ? "default" : "secondary"}
              className="shrink-0 text-xs px-2 py-0.5"
            >
              {worker.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">
              <span className="font-medium text-theme-text">
                {worker.verificationsCount}
              </span>{" "}
              verifications
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium text-theme-text">
                {actualRegistrationsCount}
              </span>{" "}
              registrations
            </div>
          </div>

          {worker.assignedDistricts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {worker.assignedDistricts.slice(0, 3).map((district) => (
                <Badge
                  key={district}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  {district}
                </Badge>
              ))}
              {worker.assignedDistricts.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{worker.assignedDistricts.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Registered {formatDate(worker.registeredAt)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
