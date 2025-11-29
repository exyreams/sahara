"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import BN from "bn.js";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect } from "react";
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
import { useAllowedTokens } from "@/hooks/use-allowed-tokens";
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
  const { tokens: allowedTokens, isLoading: isTokensLoading } =
    useAllowedTokens();
  const queryClient = useQueryClient();

  const isEditMode = mode === "edit" && !!pool;

  // Filter only active disasters
  const activeDisasters = disasters.filter((d) => d.isActive);

  // Map distribution type for edit mode (handle legacy Milestone as Equal)
  const getDistributionType = (
    type: string,
  ): "Equal" | "WeightedFamily" | "WeightedDamage" => {
    if (type === "WeightedFamily" || type === "WeightedDamage") {
      return type;
    }
    return "Equal"; // Default for Equal or legacy Milestone
  };

  // Get default token mint (first allowed token or empty)
  const defaultTokenMint =
    allowedTokens.length > 0 ? allowedTokens[0].mintAddress : "";

  const form = useForm({
    resolver: zodResolver(fundPoolFormSchema),
    mode: "onBlur",
    defaultValues: isEditMode
      ? {
          poolId: pool.poolId,
          disasterId: pool.disasterId,
          name: pool.name,
          description: pool.description,
          distributionType: getDistributionType(pool.distributionType),
          tokenMint: pool.tokenMint.toBase58(),
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
          distributionType: "Equal" as const,
          tokenMint: "",
          eligibilityCriteria: "",
          distributionPercentageImmediate: 100,
          distributionPercentageLocked: 0,
        },
  });

  // Set default token when allowed tokens load
  useEffect(() => {
    if (
      !isEditMode &&
      allowedTokens.length > 0 &&
      !form.getValues("tokenMint")
    ) {
      form.setValue("tokenMint", allowedTokens[0].mintAddress);
    }
  }, [allowedTokens, form, isEditMode]);

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

        // Get platform config
        const [platformConfigPDA] = derivePlatformConfigPDA();

        // Use the selected token mint from the form
        const selectedTokenMint = new PublicKey(data.tokenMint);

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
        // Convert distribution type to Anchor enum format (camelCase)
        const distributionTypeMap: Record<string, object> = {
          Equal: { equal: {} },
          WeightedFamily: { weightedFamily: {} },
          WeightedDamage: { weightedDamage: {} },
        };

        const params = {
          name: data.name.trim(),
          distributionType: distributionTypeMap[data.distributionType],
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
            tokenMint: selectedTokenMint,
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
          // Invalidate pools query to refetch data
          queryClient.invalidateQueries({ queryKey: ["pools"] });

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

  // Generate pool ID based on selected disaster and distribution type
  const generatePoolId = useCallback(() => {
    const selectedDisasterId = form.getValues("disasterId");
    const distributionType = form.getValues("distributionType");

    if (!selectedDisasterId) {
      return;
    }

    // Get a random 4-digit number for uniqueness (0000-9999)
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");

    // Distribution type name
    const distTypeMap: Record<string, string> = {
      Equal: "equal",
      WeightedFamily: "family",
      WeightedDamage: "damage",
    };
    const distType = distTypeMap[distributionType] || "pool";

    // Format: {disaster-id}-{distribution-type}-pool-{random}
    // Example: earthquake-2025-equal-pool-7392
    const generatedId = `${selectedDisasterId}-${distType}-pool-${randomNum}`;

    // Truncate if too long (max 32 chars)
    const poolId =
      generatedId.length > 32 ? generatedId.substring(0, 32) : generatedId;

    form.setValue("poolId", poolId);
  }, [form]);

  // Watch for distribution type changes and auto-update pool ID
  const watchedDistributionType = form.watch("distributionType");
  const watchedDisasterId = form.watch("disasterId");

  useEffect(() => {
    // Only auto-update if not in edit mode and both fields are filled
    if (!isEditMode && watchedDisasterId && watchedDistributionType) {
      // Only update if pool ID is empty or was auto-generated (contains "-pool-")
      const currentPoolId = form.getValues("poolId");
      if (!currentPoolId || currentPoolId.includes("-pool-")) {
        generatePoolId();
      }
    }
  }, [
    watchedDistributionType,
    watchedDisasterId,
    form.getValues,
    generatePoolId,
    isEditMode,
  ]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Disaster Event and Distribution Type - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
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
                    disabled={!!disasterId || isEditMode}
                  />
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

          <FormField
            control={form.control}
            name="tokenMint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isTokensLoading || isEditMode}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isTokensLoading ? "Loading tokens..." : "Select token"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allowedTokens.map((token) => (
                      <SelectItem
                        key={token.mintAddress}
                        value={token.mintAddress}
                      >
                        {token.symbol} - {token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pool ID and Pool Name - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="poolId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Pool ID{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/32)
                  </span>
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="earthquake-2025-equal-pool-7392"
                      maxLength={32}
                      {...field}
                      disabled={isEditMode}
                    />
                  </FormControl>
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generatePoolId}
                      disabled={!form.watch("disasterId")}
                      title="Generate Pool ID"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Pool Name{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/100)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Emergency Relief Fund"
                    maxLength={100}
                    {...field}
                  />
                </FormControl>
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
                Eligibility Criteria{" "}
                <span className="text-xs text-muted-foreground">
                  ({field.value?.length || 0}/500)
                </span>
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
                    onChange={(e) => {
                      const value = Math.min(
                        100,
                        Math.max(0, Number(e.target.value) || 0),
                      );
                      field.onChange(value);
                      // Auto-adjust locked percentage
                      form.setValue(
                        "distributionPercentageLocked",
                        100 - value,
                        {
                          shouldValidate: true,
                        },
                      );
                    }}
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
                    onChange={(e) => {
                      const value = Math.min(
                        100,
                        Math.max(0, Number(e.target.value) || 0),
                      );
                      field.onChange(value);
                      // Auto-adjust immediate percentage
                      form.setValue(
                        "distributionPercentageImmediate",
                        100 - value,
                        {
                          shouldValidate: true,
                        },
                      );
                    }}
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
            render={({ field }) => {
              const selectedTokenMint = form.watch("tokenMint");
              const selectedToken = allowedTokens.find(
                (t) => t.mintAddress === selectedTokenMint,
              );
              const tokenSymbol = selectedToken?.symbol || "Token";
              return (
                <FormItem>
                  <FormLabel>Target Amount ({tokenSymbol}, Optional)</FormLabel>
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
              );
            }}
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
                Description{" "}
                <span className="text-xs text-muted-foreground">
                  ({field.value?.length || 0}/500)
                </span>
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
