"use client";

import { BN } from "@coral-xyz/anchor";
import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveFieldWorkerPDA,
  deriveNGOPDA,
  derivePlatformConfigPDA,
} from "@/lib/anchor/pdas";
import { NEPAL_DISTRICTS } from "@/lib/constants";
import type { FieldWorker } from "@/types/program";

const fieldWorkerFormSchema = z.object({
  walletAddress: z.string().min(32, "Invalid Solana address"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  organization: z
    .string()
    .min(2, "Organization must be at least 2 characters")
    .max(100, "Organization must not exceed 100 characters"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .max(20, "Phone number must not exceed 20 characters"),
  email: z
    .email("Invalid email address")
    .max(100, "Email must not exceed 100 characters"),
  assignedDistricts: z
    .array(z.string())
    .min(1, "Select at least one district")
    .max(10, "Cannot assign more than 10 districts"),
  credentials: z
    .string()
    .min(10, "Credentials must be at least 10 characters")
    .max(500, "Credentials must not exceed 500 characters"),
});

type FieldWorkerFormData = z.infer<typeof fieldWorkerFormSchema>;

interface FieldWorkerFormProps {
  onSuccess?: () => void;
  fieldWorker?: FieldWorker | null;
  mode?: "create" | "edit";
}

export function FieldWorkerForm({
  onSuccess,
  fieldWorker,
  mode = "create",
}: FieldWorkerFormProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();

  const isEditMode = mode === "edit";

  const form = useForm<FieldWorkerFormData>({
    resolver: zodResolver(fieldWorkerFormSchema),
    defaultValues: fieldWorker
      ? {
          walletAddress: fieldWorker.authority.toBase58(),
          name: fieldWorker.name,
          organization: fieldWorker.organization,
          phoneNumber: fieldWorker.phoneNumber,
          email: fieldWorker.email,
          assignedDistricts: fieldWorker.assignedDistricts,
          credentials: fieldWorker.credentials,
        }
      : {
          walletAddress: "",
          name: "",
          organization: "",
          phoneNumber: "",
          email: "",
          assignedDistricts: [],
          credentials: "",
        },
  });

  const onSubmit = async (data: FieldWorkerFormData) => {
    if (!program || !wallet.publicKey) return;

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        // Validate wallet address
        let fieldWorkerAuthority: PublicKey;
        try {
          fieldWorkerAuthority = new PublicKey(data.walletAddress);
        } catch (_error) {
          throw new Error("Invalid wallet address format");
        }

        // Check if NGO exists
        const [ngoPDA] = deriveNGOPDA(wallet.publicKey);
        try {
          // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          const ngoAccount = await (program.account as any).ngo.fetch(ngoPDA);
          if (!ngoAccount.isActive) {
            throw new Error("Your NGO is not active");
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("not active")) {
            throw error;
          }
          throw new Error(
            "NGO account not found. Please register your NGO first.",
          );
        }

        const [fieldWorkerPDA] = deriveFieldWorkerPDA(fieldWorkerAuthority);
        const [configPDA] = derivePlatformConfigPDA();

        let tx: string;

        if (isEditMode) {
          // Edit mode - use updateFieldWorker instruction
          const timestamp = Math.floor(Date.now() / 1000);

          // Derive activity log PDA - convert timestamp to little-endian bytes manually
          const timestampBN = new BN(timestamp);
          const timestampBuffer = timestampBN.toArrayLike(Buffer, "le", 8);

          const [activityLogPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("activity"),
              wallet.publicKey.toBuffer(),
              timestampBuffer,
            ],
            program.programId,
          );

          const updateParams = {
            name: data.name.trim(),
            email: data.email.trim(),
            phoneNumber: data.phoneNumber.trim(),
            organization: data.organization.trim(),
            notes: null,
          };

          tx = await program.methods
            .updateFieldWorker(updateParams, timestampBN)
            .accounts({
              fieldWorker: fieldWorkerPDA,
              activityLog: activityLogPDA,
              ngo: ngoPDA,
              config: configPDA,
              ngoAuthority: wallet.publicKey,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc({ skipPreflight: false });
        } else {
          // Create mode - check if field worker already exists
          try {
            // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
            await (program.account as any).fieldWorker.fetch(fieldWorkerPDA);
            throw new Error(
              "A field worker with this wallet address is already registered",
            );
          } catch (error) {
            // If account doesn't exist, that's good - we can proceed
            if (
              error instanceof Error &&
              !error.message.includes("Account does not exist")
            ) {
              // If it's our custom error about already registered, throw it
              if (error.message.includes("already registered")) {
                throw error;
              }
            }
          }

          const params = {
            name: data.name.trim(),
            organization: data.organization.trim(),
            phoneNumber: data.phoneNumber.trim(),
            email: data.email.trim(),
            assignedDistricts: data.assignedDistricts,
            credentials: data.credentials.trim(),
          };

          try {
            tx = await program.methods
              .registerFieldWorker(params)
              .accounts({
                fieldWorker: fieldWorkerPDA,
                ngo: ngoPDA,
                config: configPDA,
                authority: fieldWorkerAuthority,
                ngoAuthority: wallet.publicKey,
                payer: wallet.publicKey,
                systemProgram: SystemProgram.programId,
              })
              .rpc({ skipPreflight: false });
          } catch (error) {
            // Ignore "already processed" errors - transaction succeeded
            if (
              error instanceof Error &&
              error.message.includes("already been processed")
            ) {
              return ""; // Return empty string as transaction was successful
            }
            if (error instanceof Error) {
              throw new Error(
                `Failed to register field worker: ${error.message}`,
              );
            }
            throw error;
          }
        }

        return tx;
      },
      {
        successMessage: isEditMode
          ? "Field worker updated successfully"
          : "Field worker registered successfully",
        onSuccess: () => {
          if (!isEditMode) {
            form.reset();
          }
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Wallet Address */}
        <FormField
          control={form.control}
          name="walletAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wallet Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Field worker's Solana wallet address"
                  {...field}
                  disabled={isEditMode}
                  className={isEditMode ? "bg-muted cursor-not-allowed" : ""}
                />
              </FormControl>
              <FormDescription>
                {isEditMode
                  ? "Wallet address cannot be changed"
                  : "The field worker's Solana wallet address"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Name and Organization */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name ({field.value.length}/100)</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" maxLength={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization ({field.value.length}/100)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Relief Organization"
                    maxLength={100}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Phone and Email */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number ({field.value.length}/20)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+977 1234567890"
                    maxLength={20}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email ({field.value.length}/100)</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="worker@example.com"
                    maxLength={100}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Assigned Districts */}
        <FormField
          control={form.control}
          name="assignedDistricts"
          render={() => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Assigned Districts</FormLabel>
                <span className="text-sm text-muted-foreground">
                  {form.watch("assignedDistricts")?.length || 0}/10 selected
                </span>
              </div>
              <FormDescription>
                Select districts where this field worker will operate (minimum
                1, maximum 10)
              </FormDescription>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-theme-border rounded-md p-4">
                {NEPAL_DISTRICTS.map((district) => (
                  <FormField
                    key={district}
                    control={form.control}
                    name="assignedDistricts"
                    render={({ field }) => {
                      const isChecked = field.value?.includes(district);
                      const isDisabled =
                        !isChecked && (field.value?.length || 0) >= 10;

                      return (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={isChecked}
                              disabled={isDisabled}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, district])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value: string) => value !== district,
                                      ),
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel
                            className={`text-sm font-normal cursor-pointer ${isDisabled ? "text-muted-foreground" : ""}`}
                          >
                            {district}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Credentials */}
        <FormField
          control={form.control}
          name="credentials"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credentials ({field.value.length}/500)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Certifications, training, experience..."
                  className="resize-none min-h-[100px]"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Professional credentials and qualifications
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading
            ? isEditMode
              ? "Updating..."
              : "Registering..."
            : isEditMode
              ? "Update Field Worker"
              : "Register Field Worker"}
        </Button>
      </form>
    </Form>
  );
}
