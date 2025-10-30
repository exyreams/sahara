"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface VerificationItem {
  name: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

interface VerificationProgressModalProps {
  open: boolean;
  items: VerificationItem[];
  currentIndex: number;
  title?: string;
  description?: string;
  onClose?: () => void;
}

export function VerificationProgressModal({
  open,
  items,
  currentIndex,
  title = "Processing NGOs",
  description,
  onClose,
}: VerificationProgressModalProps) {
  const completed = items.filter((item) => item.status === "success").length;
  const failed = items.filter((item) => item.status === "error").length;
  const total = items.length;
  const progress = (completed / total) * 100;
  const allDone = completed + failed === total;

  const defaultDescription =
    description ||
    `Processing ${total} NGO${total > 1 ? "s" : ""} sequentially...`;

  return (
    <Dialog open={open} onOpenChange={allDone ? onClose : undefined}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{defaultDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completed} of {total} completed
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status Summary */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{completed} Success</span>
            </div>
            {failed > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>{failed} Failed</span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3">
            {items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className={`flex items-center justify-between p-2 rounded ${
                  index === currentIndex ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {item.name}
                  </span>
                  {item.status === "success" && item.error && (
                    <span className="text-xs text-blue-500 italic">
                      {item.error}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {item.status === "pending" && (
                    <span className="text-xs text-muted-foreground">
                      Waiting...
                    </span>
                  )}
                  {item.status === "processing" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {item.status === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {item.status === "error" && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error Messages */}
          {failed > 0 && (
            <div className="text-sm text-red-500 space-y-1">
              {items
                .filter((item) => item.status === "error")
                .map((item, index) => (
                  <div key={`error-${item.name}-${index}`}>
                    <strong>{item.name}:</strong> {item.error}
                  </div>
                ))}
            </div>
          )}

          {/* Done Message */}
          {allDone && (
            <div className="text-center py-2">
              <p className="text-sm font-medium">
                {failed === 0
                  ? "All operations completed successfully!"
                  : `Completed with ${failed} error${failed > 1 ? "s" : ""}`}
              </p>
            </div>
          )}

          {/* Custom Close Button - Only show when all done */}
          {allDone && (
            <Button
              onClick={onClose}
              className="w-full"
              variant={failed === 0 ? "default" : "outline"}
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
