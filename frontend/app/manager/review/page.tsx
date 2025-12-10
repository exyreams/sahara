"use client";

import { PublicKey } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
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
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { generateActionIds } from "@/lib/utils/generateActionId";
import type { NGO } from "@/types/program";

export default function ManagerReviewPage() {
  const { ngos, loading: ngosLoading, refetch: refetchNGOs } = useAllNGOs();
  const { program, wallet } = useProgram();
  const { submit, isLoading: txLoading } = useTransaction();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const loading = ngosLoading;

  // Track when initial load is complete
  useEffect(() => {
    if (!loading) {
      setHasInitiallyLoaded(true);
    }
  }, [loading]);

  // Get NGOs that need review (not verified or pending re-verification after update)
  const ngosForReview = ngos.filter((ngo) => !ngo.isVerified);

  // Separate new registrations from updates (updates have verifiedAt timestamp)
  const isNGOUpdate = (ngo: NGO) => ngo.verifiedAt !== null;

  // Filter NGOs
  const filteredNGOs = useMemo(() => {
    return ngosForReview.filter((ngo) => {
      const matchesSearch =
        searchQuery === "" ||
        ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.registrationNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && !isNGOUpdate(ngo)) ||
        (statusFilter === "updates" && isNGOUpdate(ngo));

      return matchesSearch && matchesStatus;
    });
  }, [ngosForReview, searchQuery, statusFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchNGOs();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleApproveNGO = async (ngo: NGO) => {
    if (!program || !wallet.publicKey) return;

    const managerPublicKey = wallet.publicKey;

    await submit(
      async () => {
        if (!managerPublicKey) throw new Error("Wallet not connected");

        const [configPDA] = derivePlatformConfigPDA();

        // Generate unique action ID
        const [actionId] = generateActionIds(managerPublicKey, 1);

        // Derive admin action PDA with the action ID
        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            managerPublicKey.toBuffer(),
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
            admin: managerPublicKey,
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
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
              <div className="h-9 w-48 bg-theme-border rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(
                { length: 3 },
                (_, i) => `skeleton-item-${Date.now()}-${i}`,
              ).map((key) => (
                <div
                  key={key}
                  className="border border-theme-border rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
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
                      <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
                      <div className="flex gap-4">
                        <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-32 bg-theme-border rounded animate-pulse" />
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
          <h1 className="text-4xl font-bold tracking-tight">NGO Review</h1>
          <p className="text-muted-foreground mt-2">
            Review and verify NGO registrations and updates
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
            <Link href="/manager">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-lg">
                NGOs for Review ({filteredNGOs.length})
              </CardTitle>
              <CardDescription>
                {ngosForReview.filter((ngo) => !isNGOUpdate(ngo)).length} new
                registrations,{" "}
                {ngosForReview.filter((ngo) => isNGOUpdate(ngo)).length} updates
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or registration number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Dropdown
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Status"
              options={[
                { value: "all", label: "All NGOs" },
                { value: "pending", label: "New Registrations" },
                { value: "updates", label: "Updates" },
              ]}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isRefreshing ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => `refresh-skeleton-${i}`).map(
                (key) => (
                  <div
                    key={key}
                    className="border border-theme-border rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
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
                        <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />
                        <div className="flex gap-4">
                          <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-24 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-8 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-8 w-28 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : filteredNGOs.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {ngosForReview.length === 0
                  ? "No NGOs pending review"
                  : "No NGOs match your search criteria"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNGOs.map((ngo) => {
                const isExpanded = expandedItems.has(ngo.publicKey.toBase58());
                const isUpdate = isNGOUpdate(ngo);

                return (
                  <div
                    key={ngo.publicKey.toBase58()}
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
                              <Info className="h-5 w-5 text-blue-500 shrink-0" />
                              <h3 className="font-semibold text-lg truncate text-blue-600 dark:text-blue-500">
                                {ngo.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant={isUpdate ? "outline" : "default"}
                                className={
                                  isUpdate
                                    ? "border-orange-500 text-orange-500 bg-orange-500/10"
                                    : ""
                                }
                              >
                                {isUpdate ? "Update" : "New Registration"}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedItems((prev) => {
                                    const next = new Set(prev);
                                    const id = ngo.publicKey.toBase58();
                                    if (next.has(id)) {
                                      next.delete(id);
                                    } else {
                                      next.add(id);
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

                          <p className="text-sm text-muted-foreground mb-2">
                            {ngo.email} • {ngo.phoneNumber}
                          </p>
                          <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                            <span>Reg: {ngo.registrationNumber}</span>
                            <span>
                              Districts: {ngo.operatingDistricts.length}
                            </span>
                            {isUpdate ? (
                              <>
                                <span>
                                  Last Updated: {formatDate(ngo.lastActivityAt)}
                                </span>
                                <span className="text-orange-600 font-medium">
                                  Needs Re-verification
                                </span>
                              </>
                            ) : (
                              <span>
                                Registered: {formatDate(ngo.registeredAt)}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveNGO(ngo)}
                              disabled={txLoading}
                            >
                              Verify NGO
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/directory`}>View Directory</Link>
                            </Button>
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
                                  <div className="space-y-4">
                                    {isUpdate && (
                                      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                                          ⚠️ NGO Information Updated
                                        </p>
                                        <p className="text-xs text-orange-700 dark:text-orange-300">
                                          This NGO was previously verified on{" "}
                                          {ngo.verifiedAt &&
                                            formatDate(
                                              ngo.verifiedAt as number,
                                            )}
                                          . They updated their information on{" "}
                                          {formatDate(ngo.lastActivityAt)} and
                                          require re-verification. Please review
                                          all details carefully before
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
                                          {ngo.contactPersonName} -{" "}
                                          {ngo.contactPersonRole}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium mb-1">
                                          Address
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {ngo.address}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium mb-1">
                                          Operating Districts
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {ngo.operatingDistricts
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
                                          {ngo.operatingDistricts.length >
                                            5 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              +
                                              {ngo.operatingDistricts.length -
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
                                          {ngo.focusAreas
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
                                          {ngo.focusAreas.length > 3 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              +{ngo.focusAreas.length - 3} more
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      {ngo.description && (
                                        <div className="col-span-2">
                                          <p className="text-sm font-medium mb-1">
                                            Description
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {ngo.description}
                                          </p>
                                        </div>
                                      )}
                                      {ngo.website && (
                                        <div className="col-span-2">
                                          <p className="text-sm font-medium mb-1">
                                            Website
                                          </p>
                                          <a
                                            href={ngo.website || ""}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-theme-primary hover:underline"
                                          >
                                            {ngo.website}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
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
