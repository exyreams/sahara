"use client";

import { PublicKey } from "@solana/web3.js";
import { Plus, Trash2, UserCheck } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import type { PlatformConfig } from "@/types/program";

interface ManagerManagementProps {
  config: PlatformConfig | null;
  onSuccess: () => void;
  isRefreshing?: boolean;
}

export function ManagerManagement({
  config,
  onSuccess,
  isRefreshing = false,
}: ManagerManagementProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();

  const [newManagerAddress, setNewManagerAddress] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [managerToRemove, setManagerToRemove] = useState<PublicKey | null>(
    null,
  );

  const handleAddManager = async () => {
    if (!program || !wallet.publicKey || !newManagerAddress) return;

    try {
      const managerPubkey = new PublicKey(newManagerAddress);
      const adminPublicKey = wallet.publicKey;

      await submit(
        async () => {
          const [configPDA] = derivePlatformConfigPDA();
          const timestamp = Math.floor(Date.now() / 1000);

          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              Buffer.from(
                new (await import("bn.js")).default(timestamp).toArray("le", 8),
              ),
            ],
            program.programId,
          );

          const tx = await program.methods
            .addManager(
              new (await import("bn.js")).default(timestamp),
              managerPubkey,
              "Added via admin settings",
            )
            .accounts({
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .rpc();

          return tx;
        },
        {
          successMessage: "Manager added successfully",
          onSuccess: () => {
            onSuccess();
            setNewManagerAddress("");
            setAddDialogOpen(false);
          },
        },
      );
    } catch (err) {
      console.error("Invalid public key:", err);
    }
  };

  const handleRemoveManager = async () => {
    if (!program || !wallet.publicKey || !managerToRemove) return;

    const adminPublicKey = wallet.publicKey;

    await submit(
      async () => {
        const [configPDA] = derivePlatformConfigPDA();
        const timestamp = Math.floor(Date.now() / 1000);

        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            adminPublicKey.toBuffer(),
            Buffer.from(
              new (await import("bn.js")).default(timestamp).toArray("le", 8),
            ),
          ],
          program.programId,
        );

        const tx = await program.methods
          .removeManager(
            new (await import("bn.js")).default(timestamp),
            managerToRemove,
            "Removed via admin settings",
          )
          .accounts({
            config: configPDA,
            adminAction: adminActionPDA,
            admin: adminPublicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: "Manager removed successfully",
        onSuccess: () => {
          onSuccess();
          setManagerToRemove(null);
          setRemoveDialogOpen(false);
        },
      },
    );
  };

  const managers = config?.managers || [];
  const isManager =
    wallet.publicKey && managers.some((m) => m.equals(wallet.publicKey));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Platform Managers</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Managers can verify NGOs and manage their status (max 10)
          </p>
        </div>
        {isManager && !isRefreshing && (
          <Badge variant="secondary">
            <UserCheck className="h-3 w-3 mr-1" />
            You are a manager
          </Badge>
        )}
      </div>

      {isRefreshing ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-12 bg-theme-border rounded animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {managers.length === 0 ? (
            <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
              No managers added yet
            </div>
          ) : (
            <div className="space-y-2">
              {managers.map((manager, index) => (
                <div
                  key={manager.toString()}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-theme-primary break-all">
                      {manager.toString()}
                    </code>
                    {wallet.publicKey?.equals(manager) && (
                      <Badge variant="secondary" className="ml-2">
                        You
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setManagerToRemove(manager);
                      setRemoveDialogOpen(true);
                    }}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {managers.length < 10 && (
            <div className="space-y-2">
              <Label htmlFor="new-manager">Add New Manager</Label>
              <div className="flex gap-2">
                <Input
                  id="new-manager"
                  placeholder="Enter manager public key..."
                  value={newManagerAddress}
                  onChange={(e) => setNewManagerAddress(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  onClick={() => setAddDialogOpen(true)}
                  disabled={!newManagerAddress || isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {managers.length >= 10 && (
            <p className="text-sm text-muted-foreground">
              Maximum number of managers reached (10/10)
            </p>
          )}
        </>
      )}

      {/* Add Manager Dialog */}
      <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Manager</AlertDialogTitle>
            <AlertDialogDescription>
              This will grant manager permissions to the specified address.
              Managers can verify NGOs, update their status, and manage
              blacklists, but cannot add/remove other managers or transfer admin
              rights.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddManager}>
              Add Manager
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Manager Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Manager</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this manager? They will lose all
              manager permissions immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveManager}>
              Remove Manager
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
