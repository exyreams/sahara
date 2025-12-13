"use client";

import { PublicKey } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  Flag,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { useAllNGOs } from "@/hooks/use-all-ngos";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveBeneficiaryPDA,
  derivePlatformConfigPDA,
} from "@/lib/anchor/pdas";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { generateActionIds } from "@/lib/utils/generateActionId";
import type { Beneficiary, NGO } from "@/types/program";

export default function AdminReviewPage() {
  const { ngos, loading: ngosLoading, refetch: refetchNGOs } = useAllNGOs();
  const {
    beneficiaries,
    loading: beneficiariesLoading,
    refetch: refetchBeneficiaries,
  } = useBeneficiaries();
  const { fieldWorkers } = useFieldWorkers();
  const { program, wallet } = useProgram();
  const { submit, isLoading: txLoading } = useTransaction();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const loading = ngosLoading || beneficiariesLoading;

  // Track when initial load is complete
  useEffect(() => {
    if (!loading) {
      setHasInitiallyLoaded(true);
    }
  }, [loading]);

  // Get flagged beneficiaries
  const flaggedBeneficiaries = beneficiaries.filter(
    (b) => b.verificationStatus === "Flagged" && b.flaggedBy,
  );

  // Get NGOs that need review (not verified or pending re-verification after update)
  const ngosForReview = ngos.filter((ngo) => !ngo.isVerified);

  // Separate new registrations from updates (updates have verifiedAt timestamp)
  const isNGOUpdate = (ngo: NGO) => ngo.verifiedAt !== null;

  // Combine all review items
  const allReviewItems = useMemo(() => {
    const items: Array<
      | {
          id: string;
          type: "flag" | "ngo";
          name: string;
          data: Beneficiary;
        }
      | {
          id: string;
          type: "flag" | "ngo";
          name: string;
          data: NGO;
        }
    > = [];

    for (const b of flaggedBeneficiaries) {
      items.push({
        id: b.publicKey.toBase58(),
        type: "flag",
        name: b.name,
        data: b,
      });
    }

    for (const ngo of ngosForReview) {
      items.push({
        id: ngo.publicKey.toBase58(),
        type: "ngo",
        name: ngo.name,
        data: ngo,
      });
    }

    return items;
  }, [flaggedBeneficiaries, ngosForReview]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allReviewItems.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "flags" && item.type === "flag") ||
        (typeFilter === "ngos" && item.type === "ngo");

      return matchesSearch && matchesType;
    });
  }, [allReviewItems, searchQuery, typeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchNGOs(), refetchBeneficiaries()]);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleApproveBeneficiary = async (beneficiary: Beneficiary) => {
    if (!program || !wallet.publicKey) return;

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          beneficiary.authority,
          beneficiary.disasterId,
        );

        // Approve and clear flag
        const tx = await program.methods
          .reviewFlaggedBeneficiary(
            beneficiary.authority,
            beneficiary.disasterId,
            {
              approve: true,
              notes: null,
            },
          )
          .accounts({
            beneficiary: beneficiaryPDA,
            admin: wallet.publicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: `${beneficiary.name} approved and flag cleared`,
        onSuccess: () => {
          refetchBeneficiaries();
        },
      },
    );
  };

  const handleRejectBeneficiary = async (beneficiary: Beneficiary) => {
    if (!program || !wallet.publicKey) return;

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          beneficiary.authority,
          beneficiary.disasterId,
        );

        // Reject and keep flag
        const tx = await program.methods
          .reviewFlaggedBeneficiary(
            beneficiary.authority,
            beneficiary.disasterId,
            {
              approve: false,
              notes: null,
            },
          )
          .accounts({
            beneficiary: beneficiaryPDA,
            admin: wallet.publicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: `${beneficiary.name} rejected`,
        onSuccess: () => {
          refetchBeneficiaries();
        },
      },
    );
  };

  const handleApproveNGO = async (ngo: NGO) => {
    if (!program || !wallet.publicKey) return;

    const adminPublicKey = wallet.publicKey;

    await submit(
      async () => {
        if (!adminPublicKey) throw new Error("Wallet not connected");

        const [configPDA] = derivePlatformConfigPDA();

        // Generate unique action ID
        const [actionId] = generateActionIds(adminPublicKey, 1);

        // Derive admin action PDA with the action ID
        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            adminPublicKey.toBuffer(),
            actionId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        const tx = await program.methods
          .verifyNgo(ngo.authority, { reason: "" }, actionId)
          .accounts({
            ngo: ngo.publicKey,
            config: configPDA,
            adminAction: adminActionPDA,
            admin: adminPublicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: `${ngo.name} verified successfully`,
        onSuccess: () => {
          refetchNGOs();
        },
      },
    );
  };

  if (loading && !hasInitiallyLoaded) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-theme-border rounded animate-pulse" />
            <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
          </div>
        </div>

        {/* Card Skeleton */}
        <Card>
          <CardHeader>
            {/* Title and Description Skeleton */}
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
              </div>
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
              <div className="h-9 w-48 bg-theme-border rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(
                { length: 5 },
                (_, i) => `skeleton-item-${Date.now()}-${i}`,
              ).map((key) => (
                <div
                  key={key}
                  className="border border-theme-border rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Title row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
                          <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                          <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                      {/* Details row */}
                      <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
                      {/* Stats row */}
                      <div className="flex gap-4">
                        <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      </div>
                      {/* Buttons row */}
                      <div className="flex gap-2">
                        <div className="h-8 w-32 bg-theme-border rounded animate-pulse" />
                        <div className="h-8 w-20 bg-theme-border rounded animate-pulse" />
                        <div className="h-8 w-28 bg-theme-border rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Review</h1>
          <p className="text-muted-foreground mt-2">
            Review flagged beneficiaries and NGO updates
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-lg">
                Review Items ({filteredItems.length})
              </CardTitle>
              <CardDescription>
                {flaggedBeneficiaries.length} flagged, {ngosForReview.length}{" "}
                NGO updates
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Dropdown
              value={typeFilter}
              onValueChange={setTypeFilter}
              placeholder="Type"
              options={[
                { value: "all", label: "All Types" },
                { value: "flags", label: "Flagged Beneficiaries" },
                { value: "ngos", label: "NGO Updates" },
              ]}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isRefreshing ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => `refresh-skeleton-${i}`).map(
                (key) => (
                  <div
                    key={key}
                    className="border border-theme-border rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Title row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
                            <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                            <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
                          </div>
                        </div>
                        {/* Details row */}
                        <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
                        {/* Stats row */}
                        <div className="flex gap-4">
                          <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                        </div>
                        {/* Buttons row */}
                        <div className="flex gap-2">
                          <div className="h-8 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-8 w-20 bg-theme-border rounded animate-pulse" />
                          <div className="h-8 w-28 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No items to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                const isFlagged = item.type === "flag";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "border border-theme-border rounded-lg overflow-hidden transition-all duration-200",
                      "hover:border-theme-primary/50",
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {isFlagged ? (
                                <Flag className="h-5 w-5 text-yellow-500 shrink-0" />
                              ) : (
                                <Info className="h-5 w-5 text-blue-500 shrink-0" />
                              )}
                              <h3
                                className={cn(
                                  "font-semibold text-lg truncate",
                                  isFlagged
                                    ? "text-yellow-600 dark:text-yellow-500"
                                    : "text-blue-600 dark:text-blue-500",
                                )}
                              >
                                {item.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant={isFlagged ? "outline" : "default"}
                                className={
                                  isFlagged
                                    ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                    : ""
                                }
                              >
                                {isFlagged
                                  ? "Flagged"
                                  : !isFlagged && isNGOUpdate(item.data as NGO)
                                    ? "NGO Update"
                                    : "New NGO"}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedItems((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(item.id)) {
                                      next.delete(item.id);
                                    } else {
                                      next.add(item.id);
                                    }
                                    return next;
                                  });
                                }}
                                className="shrink-0 hover:bg-theme-primary/10 rounded p-1 transition-colors cursor-pointer"
                              >
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{
                                    duration: 0.3,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <ChevronDown className="h-5 w-5 text-theme-text" />
                                </motion.div>
                              </button>
                            </div>
                          </div>

                          {isFlagged ? (
                            <>
                              <p className="text-sm text-muted-foreground mb-2">
                                {(item.data as Beneficiary).location.region},
                                {(item.data as Beneficiary).location.area}
                              </p>
                              <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                                <span>
                                  Family:{" "}
                                  {(item.data as Beneficiary).familySize}
                                </span>
                                <span>
                                  Damage:{" "}
                                  {(item.data as Beneficiary).damageSeverity}
                                  /10
                                </span>
                                <span>
                                  Flagged:{" "}
                                  {(item.data as Beneficiary).flaggedAt
                                    ? formatDate(
                                        (item.data as Beneficiary)
                                          .flaggedAt as number,
                                      )
                                    : "N/A"}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-muted-foreground mb-2">
                                {(item.data as NGO).email} •{" "}
                                {(item.data as NGO).phoneNumber}
                              </p>
                              <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                                <span>
                                  Reg: {(item.data as NGO).registrationNumber}
                                </span>
                                <span>
                                  Districts:{" "}
                                  {(item.data as NGO).operatingDistricts.length}
                                </span>
                                {isNGOUpdate(item.data as NGO) ? (
                                  <>
                                    <span>
                                      Last Updated:{" "}
                                      {formatDate(
                                        (item.data as NGO).lastActivityAt,
                                      )}
                                    </span>
                                    <span className="text-orange-600 font-medium">
                                      Needs Re-verification
                                    </span>
                                  </>
                                ) : (
                                  <span>
                                    Registered:{" "}
                                    {formatDate(
                                      (item.data as NGO).registeredAt,
                                    )}
                                  </span>
                                )}
                              </div>
                            </>
                          )}

                          <div className="flex gap-2">
                            {isFlagged ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() =>
                                    handleApproveBeneficiary(
                                      item.data as Beneficiary,
                                    )
                                  }
                                  disabled={txLoading}
                                >
                                  Clear Flag & Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleRejectBeneficiary(
                                      item.data as Beneficiary,
                                    )
                                  }
                                  disabled={txLoading}
                                >
                                  Mark as Rejected
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <Link
                                    href={`/beneficiaries/${(item.data as Beneficiary).authority.toBase58()}`}
                                  >
                                    View Details
                                  </Link>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() =>
                                    handleApproveNGO(item.data as NGO)
                                  }
                                  disabled={txLoading}
                                >
                                  Verify NGO
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/admin/ngos`}>
                                    View All NGOs
                                  </Link>
                                </Button>
                              </>
                            )}
                          </div>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-theme-border space-y-4">
                                  {isFlagged ? (
                                    <>
                                      {(item.data as Beneficiary)
                                        .flaggedReason && (
                                        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                          <div className="flex items-start gap-3">
                                            <Flag className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                                            <div className="flex-1 space-y-2">
                                              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                                                Flagged for Review
                                              </p>
                                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                This beneficiary has been
                                                flagged and is under review.
                                              </p>
                                              <div className="mt-3 space-y-2">
                                                <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
                                                  Reason
                                                </p>
                                                <div className="bg-yellow-100/50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                                                  <p className="text-sm italic text-yellow-900 dark:text-yellow-100">
                                                    "
                                                    {
                                                      (item.data as Beneficiary)
                                                        .flaggedReason
                                                    }
                                                    "
                                                  </p>
                                                </div>
                                              </div>
                                              {(item.data as Beneficiary)
                                                .flaggedBy && (
                                                <div className="mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                                                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                                    Flagged by: {(() => {
                                                      const flagger =
                                                        fieldWorkers.find(
                                                          (fw) =>
                                                            fw.authority.equals(
                                                              (
                                                                item.data as Beneficiary
                                                              ).flaggedBy!,
                                                            ),
                                                        );
                                                      return flagger
                                                        ? flagger.name
                                                        : (
                                                            item.data as Beneficiary
                                                          ).flaggedBy
                                                            ?.toBase58()
                                                            .slice(0, 8) +
                                                            "...";
                                                    })()}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="space-y-4">
                                      {isNGOUpdate(item.data as NGO) && (
                                        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                          <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                                            ⚠️ NGO Information Updated
                                          </p>
                                          <p className="text-xs text-orange-700 dark:text-orange-300">
                                            This NGO was previously verified on{" "}
                                            {(item.data as NGO).verifiedAt &&
                                              formatDate(
                                                (item.data as NGO)
                                                  .verifiedAt as number,
                                              )}
                                            . They updated their information on{" "}
                                            {formatDate(
                                              (item.data as NGO).lastActivityAt,
                                            )}{" "}
                                            and require re-verification. Please
                                            review all details carefully before
                                            approving.
                                          </p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm font-medium mb-1">
                                            Contact Person
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {
                                              (item.data as NGO)
                                                .contactPersonName
                                            }{" "}
                                            -{" "}
                                            {
                                              (item.data as NGO)
                                                .contactPersonRole
                                            }
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium mb-1">
                                            Address
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {(item.data as NGO).address}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium mb-1">
                                            Operating Districts
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {(
                                              item.data as NGO
                                            ).operatingDistricts
                                              .slice(0, 5)
                                              .map((district: string) => (
                                                <Badge
                                                  key={district}
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {district}
                                                </Badge>
                                              ))}
                                            {(item.data as NGO)
                                              .operatingDistricts.length >
                                              5 && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                +
                                                {(item.data as NGO)
                                                  .operatingDistricts.length -
                                                  5}{" "}
                                                more
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium mb-1">
                                            Focus Areas
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {(item.data as NGO).focusAreas
                                              .slice(0, 3)
                                              .map((area: string) => (
                                                <Badge
                                                  key={area}
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {area}
                                                </Badge>
                                              ))}
                                            {(item.data as NGO).focusAreas
                                              .length > 3 && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                +
                                                {(item.data as NGO).focusAreas
                                                  .length - 3}{" "}
                                                more
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        {(item.data as NGO).description && (
                                          <div className="col-span-2">
                                            <p className="text-sm font-medium mb-1">
                                              Description
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {(item.data as NGO).description}
                                            </p>
                                          </div>
                                        )}
                                        {(item.data as NGO).website && (
                                          <div className="col-span-2">
                                            <p className="text-sm font-medium mb-1">
                                              Website
                                            </p>
                                            <a
                                              href={
                                                (item.data as NGO).website || ""
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm text-theme-primary hover:underline"
                                            >
                                              {(item.data as NGO).website}
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
