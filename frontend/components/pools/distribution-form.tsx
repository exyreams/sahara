"use client";

import { SystemProgram } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveBeneficiaryPDA,
  deriveDisasterPDA,
  deriveDistributionPDA,
  deriveFundPoolPDA,
} from "@/lib/anchor/pdas";
import { formatAmount } from "@/lib/formatters";
import type { Beneficiary, FundPool } from "@/types/program";

interface DistributionFormProps {
  pool: FundPool;
  onSuccess?: () => void;
}

interface BeneficiaryAllocation {
  beneficiary: Beneficiary;
  selected: boolean;
  hasDistribution: boolean;
}

export function DistributionForm({ pool, onSuccess }: DistributionFormProps) {
  const { beneficiaries, loading: loadingBeneficiaries } = useBeneficiaries();
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<BeneficiaryAllocation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "family" | "damage">("name");

  const availableFunds =
    (pool.totalDeposited - pool.totalDistributed) / 1_000_000; // Convert from microUSDC

  // Get distribution type as string (it's already a string from the hook)
  const distributionType = (pool.distributionType as string).toLowerCase() as
    | "equal"
    | "weightedfamily"
    | "weighteddamage";

  // Calculate allocation for each beneficiary based on distribution type
  const calculateAllocation = (
    beneficiary: Beneficiary,
    allBeneficiaries: BeneficiaryAllocation[],
  ): { amount: number; weight: number; percentage: number } => {
    const eligibleBeneficiaries = allBeneficiaries.filter(
      (a) => !a.hasDistribution,
    );
    if (eligibleBeneficiaries.length === 0) {
      return { amount: 0, weight: 0, percentage: 0 };
    }

    let weight: number;
    let totalWeight: number;

    // Check distribution type (case-insensitive)
    if (distributionType === "weightedfamily") {
      weight = beneficiary.familySize;
      totalWeight = eligibleBeneficiaries.reduce(
        (sum, a) => sum + a.beneficiary.familySize,
        0,
      );
    } else if (distributionType === "weighteddamage") {
      weight = beneficiary.damageSeverity;
      totalWeight = eligibleBeneficiaries.reduce(
        (sum, a) => sum + a.beneficiary.damageSeverity,
        0,
      );
    } else {
      // Equal distribution (default)
      weight = 1;
      totalWeight = eligibleBeneficiaries.length;
    }

    const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
    const amount =
      totalWeight > 0 ? (availableFunds * weight) / totalWeight : 0;

    return { amount, weight, percentage };
  };

  // Filter REGISTERED beneficiaries for this pool and check for existing distributions
  useEffect(() => {
    const loadRegisteredBeneficiaries = async () => {
      if (!loadingBeneficiaries && program) {
        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);

        // Fetch all pool registrations for this pool
        const registrationAccounts = await (
          program.account as any
        ).poolRegistration.all([
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: poolPDA.toBase58(),
            },
          },
        ]);

        // Get registered beneficiary public keys
        const registeredBeneficiaryKeys = new Set(
          registrationAccounts.map((r: any) =>
            r.account.beneficiary.toBase58(),
          ),
        );

        // Filter beneficiaries to only those registered for this pool
        const registeredBeneficiaries = beneficiaries.filter((b) =>
          registeredBeneficiaryKeys.has(b.publicKey.toBase58()),
        );

        // Check which beneficiaries already have distributions
        const allocationsWithStatus = await Promise.all(
          registeredBeneficiaries.map(async (b) => {
            const [distributionPDA] = deriveDistributionPDA(
              b.authority,
              poolPDA,
            );

            try {
              const accountInfo =
                await program.provider.connection.getAccountInfo(
                  distributionPDA,
                );
              return {
                beneficiary: b,
                selected: false,
                hasDistribution: !!accountInfo,
              };
            } catch (_err) {
              return {
                beneficiary: b,
                selected: false,
                hasDistribution: false,
              };
            }
          }),
        );

        setAllocations(allocationsWithStatus);
      }
    };

    loadRegisteredBeneficiaries();
  }, [beneficiaries, loadingBeneficiaries, pool, program]);

  const handleSelectChange = (index: number, checked: boolean) => {
    setAllocations((prev) =>
      prev.map((a, i) => (i === index ? { ...a, selected: checked } : a)),
    );
  };

  const handleSelectAll = () => {
    const selectableAllocations = allocations.filter((a) => !a.hasDistribution);
    const allSelected = selectableAllocations.every((a) => a.selected);
    setAllocations((prev) =>
      prev.map((a) =>
        a.hasDistribution ? a : { ...a, selected: !allSelected },
      ),
    );
  };

  // Batch size for bundled transactions
  const BATCH_SIZE = 3; // Distribution instructions are larger, so use smaller batch

  const onSubmit = async () => {
    if (!program || !wallet.publicKey) return;

    const walletPubkey = wallet.publicKey;

    const selectedAllocations = allocations.filter((a) => a.selected);

    if (selectedAllocations.length === 0) {
      alert("Please select at least one beneficiary");
      return;
    }

    if (availableFunds <= 0) {
      alert("No funds available in the pool. Please add donations first.");
      return;
    }

    const estimatedPerBeneficiary = availableFunds / selectedAllocations.length;
    if (estimatedPerBeneficiary < 0.01) {
      const confirmed = confirm(
        `Warning: With ${formatAmount(availableFunds)} USDC available and ${selectedAllocations.length
        } beneficiaries selected, each would receive approximately ${formatAmount(
          estimatedPerBeneficiary,
        )} USDC.\n\nThis may be too small. Do you want to continue?`,
      );
      if (!confirmed) return;
    }

    await submit(
      async () => {
        if (!pool) return "error";

        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);
        const [disasterPDA] = deriveDisasterPDA(pool.disasterId);

        // Filter out already distributed
        const toDistribute: BeneficiaryAllocation[] = [];
        const skipped: string[] = [];

        for (const allocation of selectedAllocations) {
          const [distributionPDA] = deriveDistributionPDA(
            allocation.beneficiary.authority,
            poolPDA,
          );

          try {
            const accountInfo =
              await program.provider.connection.getAccountInfo(distributionPDA);
            if (accountInfo) {
              skipped.push(allocation.beneficiary.name);
              continue;
            }
          } catch (_err) {
            // Distribution doesn't exist
          }
          toDistribute.push(allocation);
        }

        if (toDistribute.length === 0) {
          throw new Error(
            `All selected beneficiaries already have distributions for this pool.`,
          );
        }

        // Split into batches
        const batches: BeneficiaryAllocation[][] = [];
        for (let i = 0; i < toDistribute.length; i += BATCH_SIZE) {
          batches.push(toDistribute.slice(i, i + BATCH_SIZE));
        }

        const signatures: string[] = [];
        const failed: string[] = [];

        // Process each batch with bundled transaction
        for (const batch of batches) {
          try {
            const { Transaction } = await import("@solana/web3.js");
            const tx = new Transaction();

            for (const allocation of batch) {
              const [beneficiaryPDA] = deriveBeneficiaryPDA(
                allocation.beneficiary.authority,
                pool.disasterId,
              );
              const [distributionPDA] = deriveDistributionPDA(
                allocation.beneficiary.authority,
                poolPDA,
              );

              const params = {
                beneficiaryAuthority: allocation.beneficiary.authority,
              };

              const instruction = await program.methods
                .distributeFromPool(pool.disasterId, pool.poolId, params)
                .accounts({
                  pool: poolPDA,
                  distribution: distributionPDA,
                  beneficiary: beneficiaryPDA,
                  disaster: disasterPDA,
                  authority: walletPubkey,
                  systemProgram: SystemProgram.programId,
                })
                .instruction();

              tx.add(instruction);
            }

            // Send bundled transaction - 1 wallet popup per batch
            if (!program.provider.sendAndConfirm) {
              throw new Error("Provider does not support sendAndConfirm");
            }
            const sig = await program.provider.sendAndConfirm(tx);
            signatures.push(sig);
          } catch (err) {
            console.error(`Batch distribution failed:`, err);
            const errorMessage =
              err instanceof Error ? err.message : "Unknown error";
            failed.push(
              ...batch.map((a) => `${a.beneficiary.name}: ${errorMessage}`),
            );
          }
        }

        // Build result message
        let resultMessage = "";
        const successCount = toDistribute.length - failed.length;
        if (successCount > 0) {
          resultMessage += `Created ${successCount} distribution${successCount === 1 ? "" : "s"} in ${signatures.length} transaction${signatures.length === 1 ? "" : "s"}`;
        }
        if (skipped.length > 0) {
          if (resultMessage) resultMessage += ". ";
          resultMessage += `Skipped ${skipped.length} (already distributed)`;
        }
        if (failed.length > 0) {
          if (resultMessage) resultMessage += ". ";
          resultMessage += `Failed ${failed.length}`;
        }

        if (signatures.length === 0) {
          throw new Error(`Failed to create distributions:\n${failed.join("\n")}`);
        }

        // biome-ignore lint/suspicious/noExplicitAny: Using window for temporary storage
        (window as any).__distributionResult = resultMessage;

        return signatures[0];
      },
      {
        successMessage:
          // biome-ignore lint/suspicious/noExplicitAny: Reading from window temporary storage
          (window as any).__distributionResult ||
          `Successfully processed distributions`,
        onSuccess: () => {
          // Invalidate distributions and pools queries to refetch data
          queryClient.invalidateQueries({ queryKey: ["distributions"] });
          queryClient.invalidateQueries({ queryKey: ["pools"] });

          // biome-ignore lint/suspicious/noExplicitAny: Cleaning up window temporary storage
          delete (window as any).__distributionResult;
          setAllocations((prev) =>
            prev.map((a) => ({ ...a, selected: false })),
          );
          onSuccess?.();
        },
      },
    );
  };

  if (loadingBeneficiaries) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading beneficiaries...
          </p>
        </div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-theme-text-highlight mb-2">
          No Registered Beneficiaries
        </h3>
        <p className="text-sm text-muted-foreground">
          No beneficiaries have been registered to this pool yet.
          <br />
          Register beneficiaries first, then lock registration before
          distributing.
        </p>
      </div>
    );
  }

  // Filter and sort allocations
  const filteredAllocations = allocations
    .filter(
      (a) =>
        a.beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.beneficiary.authority
          .toBase58()
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.beneficiary.name.localeCompare(b.beneficiary.name);
        case "family":
          return b.beneficiary.familySize - a.beneficiary.familySize;
        case "damage":
          return b.beneficiary.damageSeverity - a.beneficiary.damageSeverity;
        default:
          return 0;
      }
    });

  const selectedCount = allocations.filter((a) => a.selected).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
          <p className="text-xs text-theme-text/60 mb-1">Available Funds</p>
          <p className="text-2xl font-bold text-theme-primary">
            {formatAmount(availableFunds)}{" "}
            <span className="text-base font-normal text-theme-text">USDC</span>
          </p>
        </div>
        <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
          <p className="text-xs text-theme-text/60 mb-1">
            Selected Beneficiaries
          </p>
          <p className="text-2xl font-bold text-theme-text">{selectedCount}</p>
        </div>
        <div className="p-4 rounded-lg bg-theme-background border border-theme-border">
          <p className="text-xs text-theme-text/60 mb-1">Distribution Type</p>
          <p className="text-2xl font-bold text-theme-text">
            {pool.distributionType === "WeightedFamily"
              ? "By Family"
              : pool.distributionType === "WeightedDamage"
                ? "By Damage"
                : "Equal"}
          </p>
        </div>
      </div>

      {availableFunds <= 0 ? (
        <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm font-medium">
          ⚠️ No funds available in the pool. Please add donations before
          distributing.
        </div>
      ) : selectedCount > 0 && availableFunds / selectedCount < 1 ? (
        <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-3 rounded-md text-sm">
          ⚠️ Warning: With {formatAmount(availableFunds)} USDC available and{" "}
          {selectedCount} beneficiaries selected, each would receive
          approximately {formatAmount(availableFunds / selectedCount)} USDC.
        </div>
      ) : (
        <div className="bg-theme-primary/10 text-theme-primary p-3 rounded-md text-sm">
          {distributionType === "equal" && (
            <>
              <span className="font-semibold">Equal Distribution:</span> Each
              beneficiary receives an equal share of the pool funds.
            </>
          )}
          {distributionType === "weightedfamily" && (
            <>
              <span className="font-semibold">Weighted by Family Size:</span>{" "}
              Larger families receive proportionally more funds based on their
              family size.
            </>
          )}
          {distributionType === "weighteddamage" && (
            <>
              <span className="font-semibold">
                Weighted by Damage Severity:
              </span>{" "}
              Beneficiaries with higher damage severity receive proportionally
              more funds.
            </>
          )}
        </div>
      )}

      {/* Beneficiaries List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-theme-text-highlight">
              Registered Beneficiaries (
              {allocations.filter((a) => !a.hasDistribution).length} pending)
            </h3>
            <p className="text-sm text-muted-foreground">
              {allocations.filter((a) => a.hasDistribution).length > 0 && (
                <span className="text-muted-foreground/80">
                  {allocations.filter((a) => a.hasDistribution).length} already
                  distributed •{" "}
                </span>
              )}
              Select beneficiaries to create distributions
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleSelectAll}>
            {allocations
              .filter((a) => !a.hasDistribution)
              .every((a) => a.selected)
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as typeof sortBy)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="family">Family Size</SelectItem>
              <SelectItem value="damage">Damage Severity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredAllocations.map((allocation) => {
            const index = allocations.findIndex((a) =>
              a.beneficiary.publicKey.equals(allocation.beneficiary.publicKey),
            );
            const isDisabled = allocation.hasDistribution;
            const { amount, weight, percentage } = calculateAllocation(
              allocation.beneficiary,
              allocations,
            );

            return (
              <div
                key={allocation.beneficiary.publicKey.toString()}
                className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${isDisabled
                    ? "border-theme-border/50 bg-theme-background/30 opacity-60 cursor-not-allowed"
                    : "border-theme-border hover:border-theme-primary/50"
                  }`}
                title={
                  isDisabled
                    ? `${allocation.beneficiary.name} has already received funds from this pool`
                    : ""
                }
              >
                <Checkbox
                  checked={allocation.selected}
                  onCheckedChange={(checked) => {
                    if (isDisabled) {
                      alert(
                        `${allocation.beneficiary.name} has already received a distribution from this pool and cannot receive another one.`,
                      );
                      return;
                    }
                    handleSelectChange(index, checked as boolean);
                  }}
                  disabled={isDisabled}
                  className={
                    isDisabled ? "cursor-not-allowed" : "cursor-pointer"
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium ${isDisabled ? "text-muted-foreground" : ""
                        }`}
                    >
                      {allocation.beneficiary.name}
                    </p>
                    {isDisabled && (
                      <Badge variant="secondary" className="text-xs">
                        Already Distributed
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {allocation.beneficiary.authority.toBase58()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {distributionType === "weightedfamily" ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-theme-primary/10 text-theme-primary border-theme-primary/30"
                      >
                        Family Size: {allocation.beneficiary.familySize}{" "}
                        (Weight)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Family: {allocation.beneficiary.familySize}
                      </Badge>
                    )}
                    {distributionType === "weighteddamage" ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-theme-primary/10 text-theme-primary border-theme-primary/30"
                      >
                        Damage: {allocation.beneficiary.damageSeverity}/10
                        (Weight)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Damage: {allocation.beneficiary.damageSeverity}/10
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Allocation Preview */}
                {!isDisabled && availableFunds > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-theme-primary">
                      {formatAmount(amount)} USDC
                    </p>
                    <p className="text-xs text-theme-text/60">
                      {percentage.toFixed(1)}% of pool
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={onSubmit}
        disabled={isLoading || selectedCount === 0}
        className="w-full"
      >
        {isLoading
          ? "Processing..."
          : `Create Distributions for ${selectedCount} Beneficiaries`}
      </Button>
    </div>
  );
}
