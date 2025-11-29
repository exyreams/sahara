"use client";

import { PublicKey } from "@solana/web3.js";
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmergencyPauseToggle } from "@/components/admin/emergency-pause-toggle";
import { PlatformConfigForm } from "@/components/admin/platform-config-form";
import { TokenManagement } from "@/components/admin/token-management";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin } from "@/hooks/use-admin";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import { generateActionIds } from "@/lib/utils/generateActionId";

export default function AdminSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { config, loading: configLoading, refetch } = usePlatformConfig();
  const { program, wallet } = useProgram();
  const { submit, isLoading: txLoading } = useTransaction();

  // Get tab from URL or default to "administration"
  const tabParam = searchParams.get("tab") || "administration";
  const [activeTab, setActiveTab] = useState(tabParam);

  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [initiateDialogOpen, setInitiateDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const loading = adminLoading || configLoading;

  // Track when initial load is complete
  useEffect(() => {
    if (!loading && config) {
      setHasInitiallyLoaded(true);
    }
  }, [loading, config]);

  // Set default URL param on initial load
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) {
      router.replace(`/admin/settings?tab=administration`, { scroll: false });
    }
  }, [router.replace, searchParams.get]);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get("tab") || "administration";
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  // Handle tab change with URL update
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/admin/settings?tab=${value}`, { scroll: false });
  };

  // Handle refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    // Small delay to show the refreshing state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Calculate transfer status
  const transferStatus = useMemo(() => {
    if (!config || !config.pendingAdmin) {
      return {
        isPending: false,
        pendingAdmin: null,
        initiatedAt: null,
        expiresAt: null,
        isExpired: false,
        timeRemaining: null,
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const initiatedAt = config.adminTransferInitiatedAt ?? 0;
    const expiresAt = initiatedAt + config.adminTransferTimeout;
    const isExpired = now > expiresAt;
    const timeRemaining = isExpired ? 0 : expiresAt - now;

    return {
      isPending: true,
      pendingAdmin: config.pendingAdmin,
      initiatedAt: config.adminTransferInitiatedAt,
      expiresAt,
      isExpired,
      timeRemaining,
    };
  }, [config]);

  // Check if current wallet is pending admin
  const isPendingAdmin = useMemo(() => {
    if (!wallet.publicKey || !transferStatus.pendingAdmin) {
      return false;
    }
    return wallet.publicKey.equals(transferStatus.pendingAdmin);
  }, [wallet.publicKey, transferStatus.pendingAdmin]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return "Expired";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""}, ${hours} hour${
        hours !== 1 ? "s" : ""
      }`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}, ${minutes} minute${
        minutes !== 1 ? "s" : ""
      }`;
    }
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  // Transaction handlers
  const handleInitiateTransfer = async () => {
    if (!program || !wallet.publicKey || !newAdminAddress) return;

    try {
      const newAdmin = new PublicKey(newAdminAddress);
      const adminPublicKey = wallet.publicKey;

      await submit(
        async () => {
          const [configPDA] = derivePlatformConfigPDA();

          // Generate unique action ID
          const [actionId] = generateActionIds(adminPublicKey, 1);

          // Derive admin action PDA with action ID
          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              actionId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
          );

          const tx = await program.methods
            .initiateAdminTransfer(newAdmin, { reason: "" }, actionId)
            .accounts({
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .rpc();

          return tx;
        },
        {
          successMessage: "Admin transfer initiated successfully",
          onSuccess: () => {
            refetch();
            setNewAdminAddress("");
            setInitiateDialogOpen(false);
          },
        },
      );
    } catch (err) {
      console.error("Invalid public key:", err);
    }
  };

  const handleAcceptTransfer = async () => {
    if (!program || !wallet.publicKey) return;

    const adminPublicKey = wallet.publicKey;
    await submit(
      async () => {
        const [configPDA] = derivePlatformConfigPDA();

        // Generate unique action ID
        const [actionId] = generateActionIds(adminPublicKey, 1);

        // Derive admin action PDA with action ID
        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            adminPublicKey.toBuffer(),
            actionId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        const tx = await program.methods
          .acceptAdminTransfer({ reason: "" }, actionId)
          .accounts({
            config: configPDA,
            adminAction: adminActionPDA,
            pendingAdmin: adminPublicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: "Admin transfer accepted successfully",
        onSuccess: () => {
          refetch();
          setAcceptDialogOpen(false);
        },
      },
    );
  };

  const handleCancelTransfer = async () => {
    if (!program || !wallet.publicKey) return;

    const adminPublicKey = wallet.publicKey;
    await submit(
      async () => {
        const [configPDA] = derivePlatformConfigPDA();

        // Generate unique action ID
        const [actionId] = generateActionIds(adminPublicKey, 1);

        // Derive admin action PDA with action ID
        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            adminPublicKey.toBuffer(),
            actionId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        const tx = await program.methods
          .cancelAdminTransfer({ reason: "" }, actionId)
          .accounts({
            config: configPDA,
            adminAction: adminActionPDA,
            admin: adminPublicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: "Admin transfer cancelled successfully",
        onSuccess: () => {
          refetch();
          setCancelDialogOpen(false);
        },
      },
    );
  };

  if (loading && !hasInitiallyLoaded) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-6">
          <div className="flex gap-2 max-w-md">
            <div className="h-10 flex-1 bg-theme-border rounded animate-pulse" />
            <div className="h-10 flex-1 bg-theme-border rounded animate-pulse" />
          </div>

          {/* Show different skeleton based on active tab */}
          {activeTab === "configuration" ? (
            <>
              {/* Config Form Skeleton */}
              <Card className="bg-theme-card-bg border-theme-border">
                <CardHeader>
                  <div className="space-y-2">
                    <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Array.from(
                    { length: 5 },
                    (_, i) => `form-skeleton-${i}`,
                  ).map((key) => (
                    <div key={key} className="space-y-2">
                      <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                      <div className="h-10 w-full bg-theme-border rounded animate-pulse" />
                    </div>
                  ))}
                  <div className="h-10 w-full bg-theme-border rounded animate-pulse" />
                </CardContent>
              </Card>

              {/* Debug Config Skeleton */}
              <Card className="bg-theme-card-bg border-theme-border border-dashed">
                <CardHeader>
                  <div className="space-y-2">
                    <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                    <div className="h-3 w-80 bg-theme-border rounded animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from(
                    { length: 6 },
                    (_, i) => `debug-skeleton-${i}`,
                  ).map((key) => (
                    <div
                      key={key}
                      className="flex justify-between items-center"
                    >
                      <div className="h-3 w-32 bg-theme-border rounded animate-pulse" />
                      <div className="h-3 w-40 bg-theme-border rounded animate-pulse" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            /* Administration Tab Skeleton */
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <div className="space-y-2">
                  <div className="h-6 w-40 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Admin Skeleton */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-48 bg-theme-border rounded animate-pulse" />
                    <div className="h-6 w-16 bg-theme-border rounded-full animate-pulse" />
                  </div>
                  <div className="h-10 w-full bg-theme-border rounded animate-pulse" />
                </div>

                {/* Divider */}
                <div className="border-t border-theme-border" />

                {/* Transfer Section Skeleton */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-5 w-56 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                    <div className="h-10 w-full bg-theme-border rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
                </div>

                {/* Warning Box Skeleton */}
                <div className="h-24 w-full bg-theme-border rounded animate-pulse" />

                {/* Divider */}
                <div className="border-t border-theme-border" />

                {/* Emergency Pause Section Skeleton */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-80 bg-theme-border rounded animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between p-4 border border-theme-border rounded-lg">
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                      <div className="h-4 w-48 bg-theme-border rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-12 bg-theme-border rounded-full animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Platform Pause Alert */}
      {config?.isPaused && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Platform is Paused
            </CardTitle>
            <CardDescription>
              All transactions are currently disabled. Unpause to resume
              operations.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Platform Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage platform configuration, administration, and emergency
            controls
          </p>
        </div>
        {!loading && (
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
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="administration" className="cursor-pointer">
            Administration
          </TabsTrigger>
          <TabsTrigger value="configuration" className="cursor-pointer">
            Configuration
          </TabsTrigger>
          <TabsTrigger value="tokens" className="cursor-pointer">
            Token Management
          </TabsTrigger>
        </TabsList>

        {/* Admin Tab */}
        <TabsContent value="administration" className="space-y-6">
          {/* Combined Admin Card - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle>Administration</CardTitle>
              <CardDescription>
                Manage current administrator and emergency transfers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Admin Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Current Administrator
                  </Label>
                  {isAdmin && !isRefreshing && (
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      You
                    </Badge>
                  )}
                </div>
                {isRefreshing ? (
                  <div className="h-10 bg-theme-border rounded animate-pulse" />
                ) : (
                  <code className="block px-3 py-2 bg-theme-card-bg border border-theme-border rounded text-sm font-mono text-theme-primary">
                    {config?.admin.toString()}
                  </code>
                )}
              </div>

              <div className="border-t border-theme-border" />

              {/* Emergency Admin Transfer Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">
                    Emergency Admin Transfer
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Transfer admin privileges to a new wallet (7-day acceptance
                    window)
                  </p>
                </div>

                {!transferStatus.isPending ? (
                  // No pending transfer - show initiate form
                  isAdmin && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-admin">New Admin Address</Label>
                        {isRefreshing ? (
                          <div className="h-10 bg-theme-border rounded animate-pulse" />
                        ) : (
                          <Input
                            id="new-admin"
                            placeholder="Enter new admin public key..."
                            value={newAdminAddress}
                            onChange={(e) => setNewAdminAddress(e.target.value)}
                            disabled={txLoading}
                          />
                        )}
                      </div>
                      <Button
                        onClick={() => setInitiateDialogOpen(true)}
                        disabled={!newAdminAddress || txLoading || isRefreshing}
                      >
                        Initiate Transfer
                      </Button>

                      <AlertDialog
                        open={initiateDialogOpen}
                        onOpenChange={setInitiateDialogOpen}
                      >
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Initiate Admin Transfer
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will start a 7-day transfer process. The new
                              admin must accept within this timeframe. You can
                              cancel at any time before acceptance.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleInitiateTransfer}>
                              Initiate Transfer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )
                ) : (
                  // Pending transfer - show status
                  <div className="space-y-4">
                    {isRefreshing ? (
                      <div className="h-32 bg-theme-border rounded animate-pulse" />
                    ) : (
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="font-medium">Transfer Pending</p>
                              <p className="text-sm text-muted-foreground">
                                New Admin:{" "}
                                {transferStatus.pendingAdmin?.toString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {transferStatus.isExpired ? (
                                <Badge variant="destructive">Expired</Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {formatTimeRemaining(
                                    transferStatus.timeRemaining,
                                  )}{" "}
                                  remaining
                                </Badge>
                              )}
                              {isPendingAdmin && (
                                <Badge variant="default">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  You are the pending admin
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isRefreshing && (
                      <div className="flex gap-2">
                        {isAdmin && (
                          <Button
                            variant="destructive"
                            onClick={() => setCancelDialogOpen(true)}
                            disabled={txLoading}
                          >
                            Cancel Transfer
                          </Button>
                        )}
                        {isPendingAdmin && !transferStatus.isExpired && (
                          <Button
                            onClick={() => setAcceptDialogOpen(true)}
                            disabled={txLoading}
                          >
                            Accept Transfer
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Cancel Dialog */}
                    <AlertDialog
                      open={cancelDialogOpen}
                      onOpenChange={setCancelDialogOpen}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Cancel Admin Transfer
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel the pending admin
                            transfer? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            No, Keep Transfer
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancelTransfer}>
                            Yes, Cancel Transfer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Accept Dialog */}
                    <AlertDialog
                      open={acceptDialogOpen}
                      onOpenChange={setAcceptDialogOpen}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Accept Admin Transfer
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            You are about to become the platform administrator.
                            This will give you full control over the platform.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleAcceptTransfer}>
                            Accept Transfer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}

                {/* Warning */}
                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-sm">Warning</p>
                      <p className="text-sm text-muted-foreground">
                        Admin transfer is irreversible once accepted. The new
                        admin will have complete control over the platform
                        including NGO management, configuration, and future
                        admin transfers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-theme-border" />

              {/* Emergency Pause Section */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">
                    Emergency Pause
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pause all platform operations in case of emergency
                  </p>
                </div>
                <EmergencyPauseToggle
                  config={config}
                  onSuccess={() => {
                    refetch();
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <PlatformConfigForm
            config={config}
            isRefreshing={isRefreshing}
            onSuccess={() => {
              refetch();
            }}
          />

          {/* Debug: Current Config Values */}
          {config && (
            <Card className="bg-theme-card-bg border-theme-border border-dashed">
              <CardHeader>
                <CardTitle className="text-theme-text-highlight text-sm">
                  Current On-Chain Config
                </CardTitle>
                <CardDescription className="text-xs">
                  This shows the actual values stored on the blockchain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="text-theme-text/60 font-medium">
                      USDC Mint:
                    </span>
                    <code className="text-theme-primary font-mono text-right break-all max-w-[70%]">
                      {config.usdcMint.toBase58()}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-text/60 font-medium">
                      Platform Fee:
                    </span>
                    <span className="text-theme-text">
                      {(config.platformFeePercentage / 100).toFixed(2)}% (
                      {config.platformFeePercentage} bps)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-text/60 font-medium">
                      Verification Threshold:
                    </span>
                    <span className="text-theme-text">
                      {config.verificationThreshold}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-text/60 font-medium">
                      Min Donation:
                    </span>
                    <span className="text-theme-text">
                      ${(config.minDonationAmount / 1_000_000).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-text/60 font-medium">
                      Max Donation:
                    </span>
                    <span className="text-theme-text">
                      ${(config.maxDonationAmount / 1_000_000).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-text/60 font-medium">
                      Is Paused:
                    </span>
                    <span className="text-theme-text">
                      {config.isPaused ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-6">
          <TokenManagement
            config={config}
            isRefreshing={isRefreshing}
            onSuccess={() => {
              refetch();
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
