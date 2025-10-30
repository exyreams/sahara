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
        <Card className="group hover:shadow-xl hover:border-theme-primary transition-all duration-300 cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center gap-6">
              {/* Left: Name, Organization, Districts */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-theme-primary transition-colors">
                    {worker.name}
                  </h3>
                  <Badge variant={worker.isActive ? "default" : "secondary"}>
                    {worker.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
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
              <div className="flex items-center gap-8 text-sm shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-theme-primary">
                    {worker.verificationsCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Verifications
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-theme-primary">
                    {actualRegistrationsCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Registrations
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-theme-primary">
                    {worker.flagsRaised}
                  </div>
                  <div className="text-xs text-muted-foreground">Flags</div>
                </div>
                <div className="text-center min-w-[100px]">
                  <div className="text-xs text-muted-foreground font-medium">
                    Registered
                  </div>
                  <div className="text-sm">
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
      <Card className="group hover:shadow-xl hover:border-theme-primary transition-all duration-300 cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <CardTitle className="text-lg text-theme-primary transition-colors">
                {worker.name}
              </CardTitle>
              <CardDescription>{worker.organization}</CardDescription>
            </div>
            <Badge
              variant={worker.isActive ? "default" : "secondary"}
              className="shrink-0"
            >
              {worker.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
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
