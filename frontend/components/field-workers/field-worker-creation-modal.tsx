"use client";

import { FieldWorkerForm } from "@/components/field-workers/field-worker-form";
import {
  WideModal,
  WideModalContent,
  WideModalDescription,
  WideModalTitle,
} from "@/components/ui/wide-modal";
import type { FieldWorker } from "@/types/program";

interface FieldWorkerCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldWorker?: FieldWorker | null;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export function FieldWorkerCreationModal({
  open,
  onOpenChange,
  fieldWorker,
  mode = "create",
  onSuccess,
}: FieldWorkerCreationModalProps) {
  const handleSuccess = () => {
    // Close modal immediately
    onOpenChange(false);
    // Call custom onSuccess if provided
    if (onSuccess) {
      onSuccess();
    }
    // No need for router.refresh() - query invalidation handles data refresh
  };

  const isEditMode = mode === "edit";

  return (
    <WideModal open={open} onOpenChange={onOpenChange}>
      <WideModalContent showCloseButton={true}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-theme-card-bg border-b border-theme-border px-6 py-4">
          <WideModalTitle className="text-2xl">
            {isEditMode ? "Edit Field Worker" : "Register Field Worker"}
          </WideModalTitle>
          <WideModalDescription className="mt-1">
            {isEditMode
              ? "Update field worker information. Note: Wallet address cannot be changed."
              : "Register a new field worker to verify beneficiaries and coordinate relief efforts on the ground."}
          </WideModalDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-6 max-h-[calc(85vh-120px)]">
          <FieldWorkerForm
            onSuccess={handleSuccess}
            fieldWorker={fieldWorker}
            mode={mode}
          />
        </div>
      </WideModalContent>
    </WideModal>
  );
}
