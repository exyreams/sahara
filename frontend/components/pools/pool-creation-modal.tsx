"use client";

import { useRouter } from "next/navigation";
import { PoolForm } from "@/components/pools/pool-form";
import {
  WideModal,
  WideModalContent,
  WideModalDescription,
  WideModalTitle,
} from "@/components/ui/wide-modal";
import type { FundPool } from "@/types/program";

interface PoolCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disasterId?: string;
  pool?: FundPool;
  mode?: "create" | "edit";
}

export function PoolCreationModal({
  open,
  onOpenChange,
  disasterId,
  pool,
  mode = "create",
}: PoolCreationModalProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onOpenChange(false);
    router.refresh();
  };

  const isEditMode = mode === "edit" && pool;

  return (
    <WideModal open={open} onOpenChange={onOpenChange}>
      <WideModalContent showCloseButton={true}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-theme-card-bg border-b border-theme-border px-6 py-4">
          <WideModalTitle className="text-2xl">
            {isEditMode ? "Edit Fund Pool" : "Create Fund Pool"}
          </WideModalTitle>
          <WideModalDescription className="mt-1">
            {isEditMode
              ? "Update fund pool configuration and settings."
              : "Create a new fund pool to collect and distribute aid for a disaster event."}
          </WideModalDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-6 max-h-[calc(85vh-120px)]">
          <PoolForm
            disasterId={disasterId}
            onSuccess={handleSuccess}
            pool={pool}
            mode={mode}
          />
        </div>
      </WideModalContent>
    </WideModal>
  );
}
