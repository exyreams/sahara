"use client";

import {
  Ban,
  CheckCircle,
  Power,
  PowerOff,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchOperationsToolbarProps {
  selectedCount: number;
  onBatchVerify: () => void;
  onBatchRevokeVerification: () => void;
  onBatchActivate: () => void;
  onBatchDeactivate: () => void;
  onBatchBlacklist: () => void;
  onBatchRemoveBlacklist: () => void;
  onClearSelection: () => void;
  disabled?: boolean;
}

export function BatchOperationsToolbar({
  selectedCount,
  onBatchVerify,
  onBatchRevokeVerification,
  onBatchActivate,
  onBatchDeactivate,
  onBatchBlacklist,
  onBatchRemoveBlacklist,
  onClearSelection,
  disabled = false,
}: BatchOperationsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-4">
        <span className="font-medium text-theme-text-highlight">
          {selectedCount} NGO{selectedCount > 1 ? "s" : ""} selected
        </span>
        {selectedCount > 20 && (
          <span className="text-sm text-destructive">
            Batch operations limited to 20 NGOs
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onBatchVerify}
          disabled={disabled || selectedCount > 20}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Batch Verify
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onBatchRevokeVerification}
          disabled={disabled || selectedCount > 20}
        >
          <ShieldOff className="h-4 w-4 mr-1" />
          Revoke Verification
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onBatchActivate}
          disabled={disabled || selectedCount > 20}
        >
          <Power className="h-4 w-4 mr-1" />
          Batch Activate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onBatchDeactivate}
          disabled={disabled || selectedCount > 20}
        >
          <PowerOff className="h-4 w-4 mr-1" />
          Batch Deactivate
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onBatchBlacklist}
          disabled={disabled || selectedCount > 20}
        >
          <Ban className="h-4 w-4 mr-1" />
          Batch Blacklist
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onBatchRemoveBlacklist}
          disabled={disabled || selectedCount > 20}
        >
          <ShieldCheck className="h-4 w-4 mr-1" />
          Remove Blacklist
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          disabled={disabled}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
