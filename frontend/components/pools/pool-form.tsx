"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { useForm } from "react-hook-form";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDisasters } from "@/hooks/use-disasters";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveActivityLogPDA,
  deriveDisasterPDA,
  deriveFundPoolPDA,
  deriveNGOPDA,
  derivePlatformConfigPDA,
  derivePoolTokenAccountPDA,
} from "@/lib/anchor/pdas";
import { TOKEN_PROGRAM_ID } from "@/lib/anchor/token-helpers";
import { DISTRIBUTION_TYPES } from "@/lib/constants";
import { type FundPoolFormData, fundPoolFormSchema } from "@/types/forms";
import type { FundPool } from "@/types/program";

interface PoolFormProps {
  disasterId?: string;
  onSuccess?: () => void;
  pool?: FundPool;
  mode?: "create" | "edit";
}

export function PoolForm({
  disasterId,
  onSuccess,
  pool,
  mode = "create",
}: PoolFormProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const { disasters } = useDisasters();

  const isEditMode = mode === "edit" && !!pool;

  // Filter only active disasters
  const activeDisasters = disasters.filter((d) => d.isActive);

  const form = useForm({
    resolver: zodResolver(fundPoolFormSchema),
    defaultValues: isEditMode
      ? {
          poolId: pool.poolId,
          disasterId: pool.disasterId,
          name: pool.name,
          description: pool.description,
          distributionType: pool.distributionType,
          eligibilityCriteria: pool.eligibilityCriteria,
          distributionPercentageImmediate: pool.distributionPercentageImmediate,
          distributionPercentageLocked: pool.distributionPercentageLocked,
          targetAmount: pool.targetAmount
            ? pool.targetAmount / 1_000_000
            : undefined,
        }
      : {
          poolId: "",
          disasterId: disasterId || "",
          name: "",
          description: "",
          distributionType: "Equal",
          eligibilityCriteria: "",
          distributionPercentageImmediate: 100,
          distributionPercentageLocked: 0,
        },
  });

  const onSubmit = async (data: FundPoolFormData) => {
    if (!program || !wallet.publicKey) return;

    const walletPubkey = wallet.publicKey; // Store in const to satisfy TypeScript

    await submit(
      async () => {
        // Handle update mode
        if (isEditMode) {
          const [poolPDA] = deriveFundPoolPDA(data.disasterId, data.poolId);

          const tx = await program.methods
            .updatePoolConfig(data.disasterId, data.poolId, {
              isActive: null,
              eligibilityCriteria: data.eligibilityCriteria || null,
              targetAmount: data.targetAmount
                ? new BN(data.targetAmount * 1_000_000)
                : null,
              description: data.description || null,
            })
            .accounts({
              pool: poolPDA,
              authority: walletPubkey,
            })
            .rpc();

          return tx;
        }

        // Handle create mode
        // Generate timestamp for activity log
        const timestamp = Math.floor(Date.now() / 1000);

        // Get platform config to get USDC mint
        const [platformConfigPDA] = derivePlatformConfigPDA();
        const platformConfig =
          await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          (program.account as any).platformConfig.fetch(platformConfigPDA);

        // Derive PDAs
        const [poolPDA] = deriveFundPoolPDA(data.disasterId, data.poolId);
        const [poolTokenAccountPDA] = derivePoolTokenAccountPDA(
          data.disasterId,
          data.poolId,
        );
        const [disasterPDA] = deriveDisasterPDA(data.disasterId);
        const [ngoPDA] = deriveNGOPDA(walletPubkey);
        const [activityLogPDA] = deriveActivityLogPDA(walletPubkey, timestamp);

        // Build instruction params
        const params = {
          name: data.name.trim(),
          distributionType: { [data.distributionType.toLowerCase()]: {} }, // Convert to lowercase for enum
          timeLockDuration: data.timeLockDuration
            ? new BN(data.timeLockDuration)
            : null,
          distributionPercentageImmediate:
            data.distributionPercentageImmediate || 100,
          distributionPercentageLocked: data.distributionPercentageLocked || 0,
          eligibilityCriteria: (data.eligibilityCriteria || "").trim(),
          minimumFamilySize: data.minimumFamilySize || null,
          minimumDamageSeverity: data.minimumDamageSeverity || null,
          targetAmount: data.targetAmount
            ? new BN(Math.floor(data.targetAmount * 1_000_000))
            : null,
          description: (data.description || "").trim(),
        };

        // Call create_fund_pool instruction
        const tx = await program.methods
          .createFundPool(
            data.disasterId,
            data.poolId,
            new BN(timestamp),
            params,
          )
          .accounts({
            pool: poolPDA,
            poolTokenAccount: poolTokenAccountPDA,
            disaster: disasterPDA,
            ngo: ngoPDA,
            config: platformConfigPDA,
            tokenMint: platformConfig.usdcMint,
            activityLog: activityLogPDA,
            ngoAuthority: walletPubkey,
            payer: walletPubkey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: isEditMode
          ? "Fund pool updated successfully"
          : "Fund pool created successfully",
        onSuccess: () => {
          if (!isEditMode) {
            form.reset();
          }
          onSuccess?.();
        },
      },
    );
  };

  // Prepare disaster options for autocomplete
  const disasterOptions = activeDisasters.map((disaster) => ({
    value: disaster.eventId,
    label: `${disaster.name} (${disaster.eventId})`,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Pool ID and Disaster Event - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="poolId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pool ID</FormLabel>
                <FormControl>
                  <Input placeholder="relief-pool-01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="disasterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disaster Event</FormLabel>
                <FormControl>
                  <AutocompleteInput
                    value={field.value}
                    onChange={field.onChange}
                    options={disasterOptions}
                    placeholder="Type or select disaster..."
                    disabled={!!disasterId}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pool Name and Distribution Type - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pool Name</FormLabel>
                <FormControl>
                  <Input placeholder="Emergency Relief Fund" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="distributionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distribution Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DISTRIBUTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Eligibility Criteria */}
        <FormField
          control={form.control}
          name="eligibilityCriteria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Eligibility Criteria ({field.value?.length || 0}/500)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Specify any eligibility requirements for beneficiaries..."
                  className="min-h-[80px]"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Distribution Percentages - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="distributionPercentageImmediate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Immediate Distribution (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="distributionPercentageLocked"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Locked Distribution (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Optional Fields - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="minimumFamilySize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Family Size (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g., 3"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minimumDamageSeverity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Damage Severity (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="1-10"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Target Amount and Time Lock - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="targetAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Amount (USDC, Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g., 10000"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timeLockDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Lock Duration (seconds, Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g., 86400 (1 day)"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description - Larger */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description ({field.value?.length || 0}/500)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the purpose of this fund pool..."
                  className="min-h-[150px] text-base"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
              ? "Update Fund Pool"
              : "Create Fund Pool"}
        </Button>
      </form>
    </Form>
  );
}
