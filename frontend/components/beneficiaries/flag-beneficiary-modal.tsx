"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveFieldWorkerPDA,
  derivePlatformConfigPDA,
} from "@/lib/anchor/pdas";
import type { Beneficiary } from "@/types/program";

const flagBeneficiarySchema = z.object({
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason is too long"),
});

type FlagBeneficiaryFormData = z.infer<typeof flagBeneficiarySchema>;

interface FlagBeneficiaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiary: Beneficiary;
  onSuccess?: () => void;
}

export function FlagBeneficiaryModal({
  open,
  onOpenChange,
  beneficiary,
  onSuccess,
}: FlagBeneficiaryModalProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();

  const form = useForm<FlagBeneficiaryFormData>({
    resolver: zodResolver(flagBeneficiarySchema),
    defaultValues: {
      reason: "",
    },
  });

  const onSubmit = async (data: FlagBeneficiaryFormData) => {
    if (!program || !wallet.publicKey) return;

    const walletPublicKey = wallet.publicKey;

    await submit(
      async () => {
        const [configPDA] = derivePlatformConfigPDA();
        const [fieldWorkerPDA] = deriveFieldWorkerPDA(walletPublicKey);

        const tx = await program.methods
          .flagBeneficiary(beneficiary.authority, beneficiary.disasterId, {
            reason: data.reason,
          })
          .accounts({
            beneficiary: beneficiary.publicKey,
            fieldWorker: fieldWorkerPDA,
            config: configPDA,
            fieldWorkerAuthority: walletPublicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: "Beneficiary flagged for admin review",
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader>
          <DialogTitle className="text-yellow-600">
            Flag Beneficiary
          </DialogTitle>
          <DialogDescription>
            Flag this beneficiary for admin review. This action should only be
            taken if you suspect fraud or have concerns about the beneficiary's
            eligibility.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Flagging</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Provide a detailed reason for flagging this beneficiary..."
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>Note:</strong> Once flagged, this beneficiary will
                require admin review before they can be verified or receive aid.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} variant="destructive">
                {isLoading ? "Flagging..." : "Flag Beneficiary"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
