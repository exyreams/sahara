"use client";

import { useRouter } from "next/navigation";
import { BeneficiaryForm } from "@/components/beneficiaries/beneficiary-form";
import {
  WideModal,
  WideModalContent,
  WideModalDescription,
  WideModalTitle,
} from "@/components/ui/wide-modal";

import type { Beneficiary } from "@/types/program";

interface BeneficiaryRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disasterId?: string;
  beneficiary?: Beneficiary; // Optional: if provided, modal is in edit mode
  onSuccess?: () => void;
}

export function BeneficiaryRegistrationModal({
  open,
  onOpenChange,
  disasterId,
  beneficiary,
  onSuccess,
}: BeneficiaryRegistrationModalProps) {
  const router = useRouter();
  const isEditMode = !!beneficiary;

  const handleSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    } else {
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  };

  return (
    <WideModal open={open} onOpenChange={onOpenChange}>
      <WideModalContent showCloseButton={true}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-theme-card-bg border-b border-theme-border px-6 py-4">
          <WideModalTitle className="text-2xl">
            {isEditMode ? "Edit Beneficiary" : "Register Beneficiary"}
          </WideModalTitle>
          <WideModalDescription className="mt-1">
            {isEditMode
              ? "Update beneficiary information. Only modified fields will be updated."
              : "Add a new beneficiary for disaster relief assistance. All information will be verified by field workers."}
          </WideModalDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-6 max-h-[calc(85vh-120px)]">
          <BeneficiaryForm
            disasterId={disasterId}
            beneficiary={beneficiary}
            onSuccess={handleSuccess}
          />
        </div>
      </WideModalContent>
    </WideModal>
  );
}
