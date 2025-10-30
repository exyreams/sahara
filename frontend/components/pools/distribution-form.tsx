"use client";

import { SystemProgram } from "@solana/web3.js";
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
  const [allocations, setAllocations] = useState<BeneficiaryAllocation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "family" | "damage">("name");

  const availableFunds =
    (pool.totalDeposited - pool.totalDistributed) / 1_000_000; // Convert from microUSDC

  // Filter verified beneficiaries for this disaster and check for existing distributions
  useEffect(() => {
    const loadBeneficiaries = async () => {
      if (!loadingBeneficiaries && program) {
        const eligibleBeneficiaries = beneficiaries.filter(
          (b) =>
            b.disasterId === pool.disasterId &&
            b.verificationStatus === "Verified" &&
            (!pool.minimumFamilySize ||
              b.familySize >= pool.minimumFamilySize) &&
            (!pool.minimumDamageSeverity ||
              b.damageSeverity >= pool.minimumDamageSeverity),
        );

        // Check which beneficiaries already have distributions
        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);
        const allocationsWithStatus = await Promise.all(
          eligibleBeneficiaries.map(async (b) => {
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

    loadBeneficiaries();
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

  const onSubmit = async () => {
    if (!program || !wallet.publicKey) return;

    const walletPubkey = wallet.publicKey; // Store in const to satisfy TypeScript

    const selectedAllocations = allocations.filter((a) => a.selected);

    if (selectedAllocations.length === 0) {
      alert("Please select at least one beneficiary");
      return;
    }

    await submit(
      async () => {
        if (!pool) return "error";

        // Derive pool PDAs
        const [poolPDA] = deriveFundPoolPDA(pool.disasterId, pool.poolId);
        const [disasterPDA] = deriveDisasterPDA(pool.disasterId);

        // Batch distribute to all selected beneficiaries
        const signatures: string[] = [];
        const skipped: string[] = [];
        const failed: string[] = [];

        for (const allocation of selectedAllocations) {
          const [beneficiaryPDA] = deriveBeneficiaryPDA(
            allocation.beneficiary.authority,
            pool.disasterId,
          );
          const [distributionPDA] = deriveDistributionPDA(
            allocation.beneficiary.authority,
            poolPDA,
          );

          // Check if distribution already exists by trying to fetch account info
          try {
            const accountInfo =
              await program.provider.connection.getAccountInfo(distributionPDA);
            if (accountInfo) {
              console.log(
                `Distribution already exists for ${allocation.beneficiary.name}`,
              );
              skipped.push(allocation.beneficiary.name);
              continue;
            }
          } catch (_err) {
            // Distribution doesn't exist, continue with creation
          }

          const params = {
            beneficiaryAuthority: allocation.beneficiary.authority,
          };

          try {
            const tx = await program.methods
              .distributeFromPool(pool.disasterId, pool.poolId, params)
              .accounts({
                pool: poolPDA,
                distribution: distributionPDA,
                beneficiary: beneficiaryPDA,
                disaster: disasterPDA,
                authority: walletPubkey,
                systemProgram: SystemProgram.programId,
              })
              .rpc();

            signatures.push(tx);
          } catch (err) {
            console.error(
              `Failed to create distribution for ${allocation.beneficiary.name}:`,
              err,
            );
            const errorMessage =
              err instanceof Error ? err.message : "Unknown error";
            failed.push(`${allocation.beneficiary.name}: ${errorMessage}`);
          }
        }

        // Build result message
        let resultMessage = "";
        if (signatures.length > 0) {
          resultMessage += `Created ${signatures.length} new distribution${
            signatures.length === 1 ? "" : "s"
          }`;
        }
        if (skipped.length > 0) {
          if (resultMessage) resultMessage += ". ";
          resultMessage += `Skipped ${skipped.length} (already distributed)`;
        }
        if (failed.length > 0) {
          if (resultMessage) resultMessage += ". ";
          resultMessage += `Failed ${failed.length}`;
        }

        // If everything was skipped or failed, throw error
        if (signatures.length === 0) {
          if (skipped.length > 0 && failed.length === 0) {
            throw new Error(
              `All selected beneficiaries already have distributions for this pool.`,
            );
          } else {
            throw new Error(
              `Failed to create distributions:\n${failed.join("\n")}`,
            );
          }
        }

        // Store result for success message
        // biome-ignore lint/suspicious/noExplicitAny: Using window for temporary storage
        (window as any).__distributionResult = resultMessage;

        // Return first signature
        return signatures[0];
      },
      {
        successMessage:
          // biome-ignore lint/suspicious/noExplicitAny: Reading from window temporary storage
          (window as any).__distributionResult ||
          `Successfully processed distributions`,
        onSuccess: () => {
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
          No Eligible Beneficiaries
        </h3>
        <p className="text-sm text-muted-foreground">
          There are no verified beneficiaries eligible for this pool
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
          <p className="text-2xl font-bold text-theme-text capitalize">
            {Object.keys(pool.distributionType)[0]}
          </p>
        </div>
      </div>

      <div className="bg-blue-500/10 text-blue-500 p-3 rounded-md text-sm">
        Amounts will be calculated automatically based on the pool's
        distribution type and rules
      </div>

      {/* Beneficiaries List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-theme-text-highlight">
              Eligible Beneficiaries (
              {allocations.filter((a) => !a.hasDistribution).length} available)
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

            return (
              <div
                key={allocation.beneficiary.publicKey.toString()}
                className={`flex items-center gap-4 p-3 border rounded-lg transition-all ${
                  isDisabled
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
                      className={`font-medium ${
                        isDisabled ? "text-muted-foreground" : ""
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
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Family: {allocation.beneficiary.familySize}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Damage: {allocation.beneficiary.damageSeverity}/10
                    </Badge>
                  </div>
                </div>
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
