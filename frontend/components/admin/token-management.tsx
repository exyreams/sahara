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
import { useState } from "react";
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
  const { data: metadata, isLoading } = useTokenMetadata(mintAddress);
  const isUSDC = mintAddress === usdcMint;

  return (
    <div className="flex items-center justify-between p-4 border border-theme-border rounded-lg hover:bg-theme-primary/5 hover:border-theme-primary/50 transition-colors bg-theme-card-bg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {isLoading ? (
            <div className="h-5 w-24 bg-theme-border rounded animate-pulse" />
          ) : (
            <span className="font-semibold text-theme-text-highlight">
              {metadata?.name || "Unknown Token"}
            </span>
          )}
          {isUSDC && (
            <Badge
              variant="default"
              className="bg-green-500/20 text-green-500 border-green-500/30"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Primary (USDC)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-theme-text/60">
          <code className="font-mono bg-theme-background px-2 py-0.5 rounded text-xs">
            {mintAddress}
          </code>
          {!isLoading && metadata && (
            <Badge
              variant="outline"
              className="text-xs border-theme-border text-theme-primary"
            >
              {metadata.symbol}
            </Badge>
          )}
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

  const [newTokenMint, setNewTokenMint] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [addReason, setAddReason] = useState("");
  const [removeToken, setRemoveToken] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  // Fetch metadata for the new token being added
  const { data: newTokenMetadata, isLoading: isNewTokenLoading } =
    useTokenMetadata(newTokenMint.length >= 32 ? newTokenMint : null);

  // Use custom symbol if provided, otherwise use fetched metadata
  const displaySymbol = customSymbol || newTokenMetadata?.symbol || "";
  const displayName = newTokenMetadata?.name || "Unknown Token";

  const allowedTokens = config?.allowedTokens || [];
  const usdcMint = config?.usdcMint?.toBase58();

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
            onSuccess();
            setNewTokenMint("");
            setCustomSymbol("");
            setAddReason("");
            setAddDialogOpen(false);
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
            onSuccess();
            setRemoveToken(null);
            setRemoveReason("");
            setRemoveDialogOpen(false);
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
                {isNewTokenLoading && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
            {newTokenMetadata && (
              <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Found: {newTokenMetadata.name} ({newTokenMetadata.symbol})
                </span>
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
                  Mint: <code className="text-xs">{newTokenMint}</code>
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
              <Shield className="h-12 w-12 text-theme-text/30 mx-auto mb-3" />
              <p className="text-theme-text/60">No tokens whitelisted yet</p>
              <p className="text-sm text-theme-text/40 mt-1">
                Add your first token above
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
                  pools. The primary USDC token cannot be removed. All
                  add/remove actions are logged in the audit log with admin
                  information.
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
