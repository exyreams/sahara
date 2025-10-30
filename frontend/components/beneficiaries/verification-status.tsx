"use client";

import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VERIFICATION_THRESHOLD } from "@/lib/constants";
import { formatVerificationStatus, truncateAddress } from "@/lib/formatters";
import type { Beneficiary } from "@/types/program";

interface VerificationStatusProps {
  beneficiary: Beneficiary;
  verificationThreshold?: number;
}

export function VerificationStatus({
  beneficiary,
  verificationThreshold = VERIFICATION_THRESHOLD,
}: VerificationStatusProps) {
  const approvalCount = beneficiary.verifierApprovals.length;
  const progress = (approvalCount / verificationThreshold) * 100;

  const statusConfig = {
    Pending: {
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      label: "Pending Verification",
    },
    Verified: {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Verified",
    },
    Flagged: {
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "Flagged",
    },
    Rejected: {
      icon: XCircle,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      label: "Rejected",
    },
  };

  const status = formatVerificationStatus(
    beneficiary.verificationStatus,
  ) as keyof typeof statusConfig;
  const config = statusConfig[status] || statusConfig.Pending;
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Verification Status</CardTitle>
          <Badge variant={status === "Verified" ? "default" : "pending"}>
            {config.label}
          </Badge>
        </div>
        <CardDescription>
          Multi-signature verification progress ({approvalCount}/
          {verificationThreshold})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${config.bgColor}`}>
            <Icon className={`h-6 w-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-1">
              {approvalCount >= verificationThreshold
                ? "Verification complete"
                : `${verificationThreshold - approvalCount} more approval${verificationThreshold - approvalCount === 1 ? "" : "s"} needed`}
            </p>
          </div>
        </div>

        {beneficiary.verifierApprovals.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Verified By:</h4>
            <div className="space-y-1">
              {beneficiary.verifierApprovals.map((verifier, index) => (
                <div
                  key={verifier.toBase58()}
                  className="flex items-center gap-2 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    Field Worker {index + 1}: {truncateAddress(verifier)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {beneficiary.flaggedReason && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm font-medium text-red-500 mb-1">
              Flagged Reason:
            </p>
            <p className="text-sm text-muted-foreground">
              {beneficiary.flaggedReason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
