"use client";

import { PublicKey } from "@solana/web3.js";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useProgram } from "@/hooks/use-program";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import { HARDCODED_TOKEN_METADATA } from "@/lib/constants";
import { generateActionIds } from "@/lib/utils/generateActionId";
import type { PlatformConfig } from "@/types/program";

interface TokenManagementProps {
  config: PlatformConfig | null;
  isRefreshing: boolean;
  onSuccess: () => void;
}

function AllowedTokenRow({
  mint,
  usdcMint,
  onRemove,
  disabled,
}: {
  mint: PublicKey;
  usdcMint: string | undefined;
  onRemove: (mint: string) => void;
  disabled: boolean;
}) {
  const mintAddress = mint.toBase58();
  const isMountedRef = useRef(true);

  // Use hardcoded metadata for USDC if available, otherwise fetch metadata
  const hardcodedMetadata =
    HARDCODED_TOKEN_METADATA[
      mintAddress as keyof typeof HARDCODED_TOKEN_METADATA
    ];

  // Only fetch metadata if we don't have hardcoded data and component is mounted
  const { data: fetchedMetadata, isLoading } = useTokenMetadata(
    hardcodedMetadata ? null : mint,
  );

  const isUSDC = mintAddress === usdcMint;
  const metadata = hardcodedMetadata || fetchedMetadata;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div className="flex items-center justify-between p-4 border border-theme-border rounded-lg hover:bg-theme-primary/5 hover:border-theme-primary/50 transition-colors bg-theme-card-bg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Token Logo */}
        <div className="shrink-0">
          {isLoading && !hardcodedMetadata ? (
            <div className="h-10 w-10 bg-theme-border rounded-full animate-pulse" />
          ) : metadata?.image ? (
            <img
              src={metadata.image}
              alt={metadata.name || "Token"}
              className="h-10 w-10 rounded-full object-cover border border-theme-border"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          {/* Fallback placeholder */}
          <div
            className={`h-10 w-10 rounded-full bg-gradient-to-br from-theme-primary/20 to-theme-primary/40 flex items-center justify-center border border-theme-border ${
              metadata?.image ? "hidden" : ""
            }`}
          >
            <span className="text-sm font-semibold text-theme-primary">
              {metadata?.symbol?.charAt(0) || "?"}
            </span>
          </div>
        </div>

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLoading && !hardcodedMetadata ? (
              <div className="h-5 w-24 bg-theme-border rounded animate-pulse" />
            ) : (
              <span className="font-semibold text-theme-text-highlight">
                {metadata?.name || "Unknown Token"}
              </span>
            )}
            {metadata && (
              <Badge
                variant="outline"
                className="text-xs border-theme-border text-theme-primary"
              >
                {metadata.symbol}
              </Badge>
            )}
            {isUSDC && (
              <Badge
                variant="default"
                className="bg-green-500/20 text-green-500 border-green-500/30"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Primary
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-theme-text/60">
            <code className="font-mono bg-theme-card-bg border border-theme-border px-2 py-0.5 rounded text-xs text-theme-text-highlight">
              {mintAddress}
            </code>
          </div>
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => onRemove(mintAddress)}
        disabled={isUSDC || disabled}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TokenManagement({
  config,
  isRefreshing,
  onSuccess,
}: TokenManagementProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [newTokenMint, setNewTokenMint] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [addReason, setAddReason] = useState("");
  const [removeToken, setRemoveToken] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Debounce the new token mint to prevent excessive API calls
  const [debouncedNewTokenMint, setDebouncedNewTokenMint] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNewTokenMint(newTokenMint);
    }, 300);

    return () => clearTimeout(timer);
  }, [newTokenMint]);

  // Fetch metadata for the new token being added (only if valid length and component is mounted)
  const validNewTokenMint =
    debouncedNewTokenMint.length >= 32 ? debouncedNewTokenMint : null;
  const { data: fetchedNewTokenMetadata, isLoading: isNewTokenLoading } =
    useTokenMetadata(validNewTokenMint);

  // Use hardcoded metadata for USDC if available, otherwise use fetched metadata
  const hardcodedNewTokenMetadata =
    debouncedNewTokenMint.length >= 32
      ? HARDCODED_TOKEN_METADATA[
          debouncedNewTokenMint as keyof typeof HARDCODED_TOKEN_METADATA
        ]
      : null;
  const newTokenMetadata = hardcodedNewTokenMetadata || fetchedNewTokenMetadata;

  // Use custom symbol if provided, otherwise use fetched metadata
  const displaySymbol = customSymbol || newTokenMetadata?.symbol || "";
  const displayName = newTokenMetadata?.name || "Unknown Token";

  const rawAllowedTokens = config?.allowedTokens || [];
  const usdcMint = config?.usdcMint?.toBase58();

  // Sort tokens: Primary token first, then alphabetically by name
  const allowedTokens = [...rawAllowedTokens].sort((a, b) => {
    const aAddress = a.toBase58();
    const bAddress = b.toBase58();

    // Primary token always comes first
    const aIsPrimary = aAddress === usdcMint;
    const bIsPrimary = bAddress === usdcMint;

    if (aIsPrimary && !bIsPrimary) return -1;
    if (!aIsPrimary && bIsPrimary) return 1;

    // For non-primary tokens, sort alphabetically by name
    const aHardcoded =
      HARDCODED_TOKEN_METADATA[
        aAddress as keyof typeof HARDCODED_TOKEN_METADATA
      ];
    const bHardcoded =
      HARDCODED_TOKEN_METADATA[
        bAddress as keyof typeof HARDCODED_TOKEN_METADATA
      ];

    const aName = aHardcoded?.name || "Unknown Token";
    const bName = bHardcoded?.name || "Unknown Token";

    return aName.localeCompare(bName);
  });

  const handleAddToken = async () => {
    if (!program || !wallet.publicKey || !newTokenMint || !addReason) return;

    try {
      const tokenMint = new PublicKey(newTokenMint);
      const adminPublicKey = wallet.publicKey;

      await submit(
        async () => {
          const [configPDA] = derivePlatformConfigPDA();
          const [actionId] = generateActionIds(adminPublicKey, 1);
          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              actionId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
          );

          const tx = await program.methods
            .addAllowedToken(actionId, tokenMint, addReason)
            .accounts({
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .rpc();

          return tx;
        },
        {
          successMessage: `Token ${displaySymbol || ""}  added to whitelist`,
          onSuccess: () => {
            if (isMountedRef.current) {
              onSuccess();
              setNewTokenMint("");
              setCustomSymbol("");
              setAddReason("");
              setAddDialogOpen(false);
            }
          },
        },
      );
    } catch (err) {
      console.error("Error adding token:", err);
    }
  };

  const handleRemoveToken = async () => {
    if (!program || !wallet.publicKey || !removeToken || !removeReason) return;

    try {
      const tokenMint = new PublicKey(removeToken);
      const adminPublicKey = wallet.publicKey;

      await submit(
        async () => {
          const [configPDA] = derivePlatformConfigPDA();
          const [actionId] = generateActionIds(adminPublicKey, 1);
          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              actionId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
          );

          const tx = await program.methods
            .removeAllowedToken(actionId, tokenMint, removeReason)
            .accounts({
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .rpc();

          return tx;
        },
        {
          successMessage: "Token removed from whitelist successfully",
          onSuccess: () => {
            if (isMountedRef.current) {
              onSuccess();
              setRemoveToken(null);
              setRemoveReason("");
              setRemoveDialogOpen(false);
            }
          },
        },
      );
    } catch (err) {
      console.error("Error removing token:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Token Card */}
      <Card className="bg-theme-card-bg border-theme-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-theme-text-highlight">
            Add Allowed Token
          </CardTitle>
          <CardDescription className="text-theme-text/60">
            Add a new SPL token to the whitelist. Maximum of 10 tokens allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-mint" className="text-theme-text">
              Token Mint Address
            </Label>
            {isRefreshing ? (
              <div className="h-10 bg-theme-border rounded animate-pulse" />
            ) : (
              <div className="relative">
                <Input
                  id="token-mint"
                  placeholder="Enter SPL token mint address..."
                  value={newTokenMint}
                  onChange={(e) => setNewTokenMint(e.target.value)}
                  disabled={isLoading}
                  className={
                    newTokenMetadata
                      ? "border-green-500 focus-visible:ring-green-500"
                      : ""
                  }
                />
                {isNewTokenLoading && !hardcodedNewTokenMetadata && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
            {newTokenMetadata && (
              <div className="flex items-center gap-3 text-sm text-green-600 mt-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {newTokenMetadata.image ? (
                  <img
                    src={newTokenMetadata.image}
                    alt={newTokenMetadata.name || "Token"}
                    className="h-8 w-8 rounded-full object-cover border border-green-300 dark:border-green-700"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove(
                        "hidden",
                      );
                    }}
                  />
                ) : null}
                <div
                  className={`h-8 w-8 rounded-full bg-gradient-to-br from-green-400/20 to-green-600/40 flex items-center justify-center border border-green-300 dark:border-green-700 ${
                    newTokenMetadata.image ? "hidden" : ""
                  }`}
                >
                  <span className="text-xs font-semibold text-green-600">
                    {newTokenMetadata.symbol?.charAt(0) || "?"}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-green-700 dark:text-green-300">
                    {newTokenMetadata.name}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Symbol: {newTokenMetadata.symbol}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-symbol" className="text-theme-text">
              Token Symbol (Optional Override)
            </Label>
            {isRefreshing ? (
              <div className="h-10 bg-theme-border rounded animate-pulse" />
            ) : (
              <Input
                id="custom-symbol"
                placeholder={newTokenMetadata?.symbol || "e.g., USDC, SOL..."}
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                disabled={isLoading}
                maxLength={10}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to use the on-chain symbol. Override if the token has
              no metadata or wrong symbol.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-reason" className="text-theme-text">
              Reason for Adding
            </Label>
            {isRefreshing ? (
              <div className="h-20 bg-theme-border rounded animate-pulse" />
            ) : (
              <Textarea
                id="add-reason"
                placeholder="Explain why this token should be whitelisted..."
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAddDialogOpen(true)}
              disabled={
                !newTokenMint ||
                !addReason ||
                isLoading ||
                isRefreshing ||
                allowedTokens.length >= 10 ||
                !newTokenMetadata // Require metadata found to ensure valid token
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Token
            </Button>
            {allowedTokens.length >= 10 && (
              <Badge variant="destructive">Maximum tokens reached</Badge>
            )}
          </div>

          {/* Add Token Confirmation Dialog */}
          <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Add Token to Whitelist</AlertDialogTitle>
                <AlertDialogDescription>
                  This will allow fund pools to accept donations in{" "}
                  <span className="font-semibold text-foreground">
                    {displayName} ({displaySymbol})
                  </span>
                  .
                  <br />
                  Mint:{" "}
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded border">
                    {newTokenMint}
                  </code>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddToken}>
                  Add Token
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Current Allowed Tokens */}
      <Card className="bg-theme-card-bg border-theme-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-theme-text-highlight">
            Allowed Tokens ({allowedTokens.length}/10)
          </CardTitle>
          <CardDescription className="text-theme-text/60">
            Tokens currently whitelisted for platform use
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRefreshing ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-theme-border rounded animate-pulse"
                />
              ))}
            </div>
          ) : allowedTokens.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-theme-primary/10 mb-4">
                <Shield className="h-8 w-8 text-theme-primary" />
              </div>
              <h3 className="text-lg font-semibold text-theme-text-highlight mb-2">
                No tokens whitelisted yet
              </h3>
              <p className="text-sm text-theme-text/60 max-w-sm mx-auto">
                Add your first SPL token above to enable donations and fund
                pools on the platform
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allowedTokens.map((token: PublicKey) => (
                <AllowedTokenRow
                  key={token.toBase58()}
                  mint={token}
                  usdcMint={usdcMint}
                  onRemove={(mint) => {
                    setRemoveToken(mint);
                    setRemoveDialogOpen(true);
                  }}
                  disabled={isLoading}
                />
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 p-4 border border-theme-primary/30 rounded-lg bg-theme-primary/10">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-theme-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm text-theme-text-highlight">
                  Token Whitelist Info
                </p>
                <p className="text-sm text-theme-text/70">
                  Only whitelisted tokens can be used for donations and fund
                  pools. The primary token cannot be removed. All add/remove
                  actions are logged in the audit log with admin information.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove Token Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Token from Whitelist</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will prevent new fund pools from accepting this token.
                Existing pools using this token will not be affected.
              </p>
              <div className="space-y-2">
                <Label htmlFor="remove-reason">Reason for Removal</Label>
                <Textarea
                  id="remove-reason"
                  placeholder="Explain why this token should be removed..."
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemoveReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveToken}
              disabled={!removeReason}
            >
              Remove Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
