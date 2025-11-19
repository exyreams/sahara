"use client";

import { DisasterForm } from "@/components/disasters/disaster-form";
import {
  WideModal,
  WideModalContent,
  WideModalDescription,
  WideModalTitle,
} from "@/components/ui/wide-modal";
import type { DisasterEvent } from "@/types/program";

interface DisasterCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disaster?: DisasterEvent;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export function DisasterCreationModal({
  open,
  onOpenChange,
  disaster,
  mode = "create",
  onSuccess,
}: DisasterCreationModalProps) {
  const handleSuccess = () => {
    // Close modal immediately
    onOpenChange(false);
    // Call custom onSuccess if provided
    if (onSuccess) {
      onSuccess();
    }
    // No need for router.refresh() - query invalidation handles data refresh
  };

  const isEditMode = mode === "edit" && disaster;

  return (
    <WideModal open={open} onOpenChange={onOpenChange}>
      <WideModalContent showCloseButton={true}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-theme-card-bg border-b border-theme-border px-6 py-4">
          <WideModalTitle className="text-2xl">
            {isEditMode ? "Edit Disaster Event" : "Create Disaster Event"}
          </WideModalTitle>
          <WideModalDescription className="mt-1">
            {isEditMode
              ? "Update disaster event information and settings."
              : "Register a new disaster event to coordinate relief efforts and track aid distribution."}
          </WideModalDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-6 max-h-[calc(85vh-120px)]">
          <DisasterForm
            onSuccess={handleSuccess}
            disaster={disaster}
            mode={mode}
          />
        </div>
      </WideModalContent>
    </WideModal>
  );
}
