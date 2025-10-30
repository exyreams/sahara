"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";

// USDC Mint addresses
const USDC_MINTS = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

const platformConfigSchema = z.object({
  usdcMint: z.string().min(1, "USDC Mint is required"),
  platformFeePercentage: z
    .number()
    .min(0, "Fee must be at least 0")
    .max(1000, "Fee cannot exceed 1000 basis points (10%)"),
  verificationThreshold: z
    .number()
    .min(1, "Threshold must be at least 1")
    .max(5, "Threshold cannot exceed max verifiers (5)"),
  minDonationAmount: z
    .number()
    .min(0.01, "Minimum donation must be at least 0.01"),
  maxDonationAmount: z.number().min(1, "Maximum donation must be at least 1"),
});

type PlatformConfigFormData = z.infer<typeof platformConfigSchema>;

interface PlatformConfigFormProps {
  onSuccess?: () => void;
  config?: ReturnType<typeof usePlatformConfig>["config"];
  isRefreshing?: boolean;
}

export function PlatformConfigForm({
  onSuccess,
  config: configProp,
  isRefreshing = false,
}: PlatformConfigFormProps) {
  const { config: hookConfig, error } = usePlatformConfig();
  const config = configProp || hookConfig;
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();

  const form = useForm<PlatformConfigFormData>({
    resolver: zodResolver(platformConfigSchema),
    defaultValues: {
      usdcMint: USDC_MINTS.devnet,
      platformFeePercentage: 0,
      verificationThreshold: 3,
      minDonationAmount: 0.01,
      maxDonationAmount: 1000000,
    },
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      const usdcMintStr = config.usdcMint.toBase58();

      form.reset({
        usdcMint: usdcMintStr,
        platformFeePercentage: config.platformFeePercentage,
        verificationThreshold: config.verificationThreshold,
        // Convert from microUSDC (6 decimals) to USDC
        minDonationAmount: config.minDonationAmount / 1_000_000,
        maxDonationAmount: config.maxDonationAmount / 1_000_000,
      });
    }
  }, [config, form]);

  const onSubmit = async (data: PlatformConfigFormData) => {
    if (!program || !wallet.publicKey) return;

    const walletPubkey = wallet.publicKey; // Store in const to satisfy TypeScript

    if (!config) {
      alert("Platform config not loaded");
      return;
    }

    // Check if user is admin
    if (!walletPubkey.equals(config.admin)) {
      alert("Only the platform admin can update configuration");
      return;
    }

    await submit(
      async () => {
        // Derive platform config PDA
        const [platformConfigPDA] = derivePlatformConfigPDA();

        // Generate timestamp for activity log
        const timestamp = Math.floor(Date.now() / 1000);
        const timestampBN = new BN(timestamp);

        // Derive admin action PDA using timestamp (must match Rust seeds)
        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            walletPubkey.toBuffer(),
            timestampBN.toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        // Build instruction params with audit info
        const configParams = {
          platformFeePercentage: data.platformFeePercentage,
          platformFeeRecipient: null,
          verificationThreshold: data.verificationThreshold,
          maxVerifiers: null,
          minDonationAmount: new BN(
            Math.floor(data.minDonationAmount * 1_000_000),
          ),
          maxDonationAmount: new BN(
            Math.floor(data.maxDonationAmount * 1_000_000),
          ),
          usdcMint: new PublicKey(data.usdcMint),
          isPaused: null,
          solUsdOracle: null,
        };

        const params = {
          configParams,
          reason: "Platform configuration updated via settings",
          metadata: `Fee: ${data.platformFeePercentage}bps, Threshold: ${data.verificationThreshold}`,
        };

        // Call update_platform_config instruction with timestamp and audit logging
        const tx = await program.methods
          .updatePlatformConfig(timestampBN, params)
          .accounts({
            config: platformConfigPDA,
            adminAction: adminActionPDA,
            admin: walletPubkey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: "Platform configuration updated successfully",
        onSuccess: () => {
          onSuccess?.();
        },
      },
    );
  };

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-theme-border border-t-theme-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message || "Failed to load platform configuration"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isAdmin = wallet.publicKey?.equals(config.admin);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Configuration</CardTitle>
        <CardDescription>
          Update platform-wide settings and parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are not the platform admin. Configuration changes are
              disabled.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* USDC Mint Address */}
            <FormField
              control={form.control}
              name="usdcMint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>USDC Mint Address</FormLabel>
                  <FormControl>
                    {isRefreshing ? (
                      <div className="h-10 bg-theme-border rounded animate-pulse" />
                    ) : (
                      <Input
                        {...field}
                        placeholder="Enter USDC mint address..."
                        className="font-mono text-sm"
                        disabled={!isAdmin}
                      />
                    )}
                  </FormControl>
                  {!isRefreshing && (
                    <>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            form.setValue("usdcMint", USDC_MINTS.devnet)
                          }
                          disabled={!isAdmin}
                        >
                          USDC (Devnet)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            form.setValue("usdcMint", USDC_MINTS.mainnet)
                          }
                          disabled={!isAdmin}
                        >
                          USDC (Mainnet)
                        </Button>
                      </div>
                      {config && (
                        <div className="mt-2 p-2 bg-theme-card-bg border border-theme-border rounded text-xs">
                          <p className="text-theme-text/60 mb-1">
                            Current on-chain USDC mint:
                          </p>
                          <code className="text-theme-primary font-mono break-all">
                            {config.usdcMint.toBase58()}
                          </code>
                        </div>
                      )}
                    </>
                  )}
                  <FormDescription>
                    SPL Token mint address for USDC - use quick buttons or enter
                    custom address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="platformFeePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform Fee (Basis Points)</FormLabel>
                    <FormControl>
                      {isRefreshing ? (
                        <div className="h-10 bg-theme-border rounded animate-pulse" />
                      ) : (
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="1000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={!isAdmin}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Fee in basis points (100 = 1%, max 1000 = 10%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="verificationThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Threshold</FormLabel>
                    <FormControl>
                      {isRefreshing ? (
                        <div className="h-10 bg-theme-border rounded animate-pulse" />
                      ) : (
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          max="5"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={!isAdmin}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Number of approvals required (max {config.maxVerifiers})
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minDonationAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Donation (USDC)</FormLabel>
                    <FormControl>
                      {isRefreshing ? (
                        <div className="h-10 bg-theme-border rounded animate-pulse" />
                      ) : (
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={!isAdmin}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Minimum donation amount in USDC
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxDonationAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Donation (USDC)</FormLabel>
                    <FormControl>
                      {isRefreshing ? (
                        <div className="h-10 bg-theme-border rounded animate-pulse" />
                      ) : (
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          disabled={!isAdmin}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Maximum donation amount in USDC
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !isAdmin || isRefreshing}
              className="w-full"
            >
              {isLoading ? "Updating..." : "Update Configuration"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
