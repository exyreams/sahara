import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  itemTitle?: string; // For showing the item being deleted
  itemDescription?: string; // For showing item details
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemTitle,
  itemDescription,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  isLoading = false,
}) => {
  // Prevent body scroll when modal is open and handle escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      document.addEventListener("keydown", handleEscape);

      return () => {
        document.body.style.overflow = "unset";
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const getTypeClasses = () => {
    switch (type) {
      case "danger":
        return {
          iconColor: "text-red-500",
          iconBg: "bg-red-500/10",
          confirmBg: "bg-red-500 hover:bg-red-600",
        };
      case "warning":
        return {
          iconColor: "text-amber-500",
          iconBg: "bg-amber-500/10",
          confirmBg: "bg-amber-500 hover:bg-amber-600",
        };
      case "info":
        return {
          iconColor: "text-blue-500",
          iconBg: "bg-blue-500/10",
          confirmBg: "bg-blue-500 hover:bg-blue-600",
        };
    }
  };

  const typeClasses = getTypeClasses();

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="confirmation-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-9999"
            onClick={onClose}
            style={{ zIndex: 9999 }}
          />

          {/* Modal */}
          <div
            key="confirmation-modal-container"
            className="fixed inset-0 flex items-center justify-center z-10000 p-4"
            style={{ zIndex: 10000 }}
          >
            <motion.div
              key="confirmation-modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                mass: 0.8,
              }}
              className="relative w-full max-w-md rounded-xl shadow-2xl backdrop-blur-md border border-theme-border bg-theme-card-bg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-lg transition-colors hover:bg-theme-primary/10 text-theme-text hover:text-theme-text-highlight"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Header with Icon and Title */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${typeClasses.iconBg}`}
                    >
                      <AlertTriangle
                        className={`w-5 h-5 ${typeClasses.iconColor}`}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-theme-text-highlight">
                      {title}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  {/* Description */}
                  {description && (
                    <p className="text-sm mb-3 text-theme-text">
                      {description}
                    </p>
                  )}

                  {/* Item Details */}
                  {itemTitle && (
                    <div className="p-3 rounded-lg border border-theme-border bg-theme-background mb-2">
                      <h4 className="font-medium text-theme-text-highlight">
                        {itemTitle}
                      </h4>
                      {itemDescription && (
                        <p className="text-sm mt-1 text-theme-text">
                          {itemDescription}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Warning text */}
                  <p className="text-xs text-theme-text/60">
                    This action cannot be undone.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 bg-theme-card-bg border border-theme-border text-theme-text hover:bg-theme-primary/10"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 ${typeClasses.confirmBg}`}
                  >
                    {isLoading && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    )}
                    <span>{confirmText}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Render in portal to ensure it's on top of everything
  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};
