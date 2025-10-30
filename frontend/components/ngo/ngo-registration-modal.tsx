"use client";

import { useRouter } from "next/navigation";
import { NGOForm } from "@/components/ngo/ngo-form";
import {
  WideModal,
  WideModalContent,
  WideModalDescription,
  WideModalTitle,
} from "@/components/ui/wide-modal";
import { useNGO } from "@/hooks/use-ngo";

interface NGORegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
}

export function NGORegistrationModal({
  open,
  onOpenChange,
  mode = "create",
}: NGORegistrationModalProps) {
  const router = useRouter();
  const { ngo } = useNGO();

  const handleSuccess = () => {
    // Close modal immediately
    onOpenChange(false);
    if (mode === "create") {
      router.push("/ngo/dashboard");
    } else {
      // Delay refresh slightly to ensure modal is fully closed
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  };

  const isEditMode = mode === "edit";

  return (
    <WideModal open={open} onOpenChange={onOpenChange}>
      <WideModalContent showCloseButton={true}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-theme-card-bg border-b border-theme-border px-6 py-4">
          <WideModalTitle className="text-2xl">
            {isEditMode ? "Edit NGO Information" : "Register Your NGO"}
          </WideModalTitle>
          <WideModalDescription className="mt-1">
            {isEditMode
              ? "Update your organization information. Changes will be sent to admin for review."
              : "Complete the form below to register your organization on the SaharaSol platform."}
          </WideModalDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-6 max-h-[calc(85vh-120px)]">
          <NGOForm onSuccess={handleSuccess} ngo={ngo} mode={mode} />
        </div>
      </WideModalContent>
    </WideModal>
  );
}
