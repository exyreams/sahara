"use client";

import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { AlertCircle, AlertTriangle, Pause, Play } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";

interface EmergencyPauseToggleProps {
  onSuccess?: () => void;
  config?: ReturnType<typeof usePlatformConfig>["config"];
}

export function EmergencyPauseToggle({
  onSuccess,
  config: configProp,
}: EmergencyPauseToggleProps) {
  const { config: hookConfig, error } = usePlatformConfig();
  const config = configProp || hookConfig;
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleTogglePause = async () => {
    if (!program || !wallet.publicKey || !config) return;

    const walletPubkey = wallet.publicKey; // Store in const to satisfy TypeScript

    // Check if user is admin
    if (!walletPubkey.equals(config.admin)) {
      alert("Only the platform admin can toggle emergency pause");
      return;
    }

    const action = config.isPaused ? "unpause" : "pause";

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
          platformFeePercentage: null,
          platformFeeRecipient: null,
          verificationThreshold: null,
          maxVerifiers: null,
          minDonationAmount: null,
          maxDonationAmount: null,
          isPaused: !config.isPaused, // Toggle pause state
          solUsdOracle: null,
        };

        const params = {
          configParams,
          reason: `Emergency ${action} triggered`,
          metadata: `Platform ${action}d at ${new Date().toISOString()}`,
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
        successMessage: `Platform ${action}d successfully`,
        onSuccess: () => {
          onSuccess?.();
        },
      },
    );
  };

  if (error || !config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emergency Pause</CardTitle>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Emergency Pause</CardTitle>
            <CardDescription>
              Pause all platform operations in case of emergency
            </CardDescription>
          </div>
          <Badge
            variant={config.isPaused ? "destructive" : "default"}
            className="text-sm"
          >
            {config.isPaused ? "PAUSED" : "ACTIVE"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.isPaused && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Platform is Currently Paused</AlertTitle>
            <AlertDescription>
              All transactions and operations are currently disabled. Users
              cannot donate, register, or perform any actions.
            </AlertDescription>
          </Alert>
        )}

        {!isAdmin && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are not the platform admin. Emergency pause controls are
              disabled.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {config.isPaused
              ? "Resume platform operations to allow users to interact with the system."
              : "Pause the platform to prevent all transactions in case of emergency or maintenance."}
          </p>

          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={isLoading || !isAdmin}
            variant={config.isPaused ? "default" : "destructive"}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              "Processing..."
            ) : config.isPaused ? (
              <>
                <Play className="mr-2 h-4 w-4" />
                Resume Platform Operations
              </>
            ) : (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Emergency Pause Platform
              </>
            )}
          </Button>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={async () => {
            await handleTogglePause();
            setShowConfirmModal(false);
          }}
          title={config.isPaused ? "Resume Platform" : "Pause Platform"}
          description={
            config.isPaused
              ? "Are you sure you want to resume platform operations? Users will be able to interact with the system again."
              : "Are you sure you want to pause all platform operations? This will prevent all transactions including donations, registrations, and distributions."
          }
          confirmText={config.isPaused ? "Resume" : "Pause"}
          cancelText="Cancel"
          type={config.isPaused ? "info" : "danger"}
          isLoading={isLoading}
        />

        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">
            What happens when paused?
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• All donations are blocked</li>
            <li>• Beneficiary registration is disabled</li>
            <li>• Fund distributions are prevented</li>
            <li>• Pool creation is disabled</li>
            <li>• Only admin can unpause the platform</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
