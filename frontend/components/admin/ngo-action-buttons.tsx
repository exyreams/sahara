"use client";

import { Ban, CheckCircle, Power, ShieldCheck, XCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NGO } from "@/types/program";

interface NGOActionButtonsProps {
  ngo: NGO;
  onVerify: () => Promise<void>;
  onRevokeVerification: () => Promise<void>;
  onActivate: () => Promise<void>;
  onDeactivate: () => Promise<void>;
  onBlacklist: (reason: string) => Promise<void>;
  onRemoveBlacklist: () => Promise<void>;
  disabled?: boolean;
}

export function NGOActionButtons({
  ngo,
  onVerify,
  onRevokeVerification,
  onActivate,
  onDeactivate,
  onBlacklist,
  onRemoveBlacklist,
  disabled = false,
}: NGOActionButtonsProps) {
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [removeBlacklistDialogOpen, setRemoveBlacklistDialogOpen] =
    useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");

  const handleVerify = async () => {
    await onVerify();
    setVerifyDialogOpen(false);
  };

  const handleRevokeVerification = async () => {
    await onRevokeVerification();
    setRevokeDialogOpen(false);
  };

  const handleActivate = async () => {
    await onActivate();
    setActivateDialogOpen(false);
  };

  const handleDeactivate = async () => {
    await onDeactivate();
    setDeactivateDialogOpen(false);
  };

  const handleBlacklist = async () => {
    if (!blacklistReason.trim()) {
      return;
    }
    await onBlacklist(blacklistReason);
    setBlacklistDialogOpen(false);
    setBlacklistReason("");
  };

  const handleRemoveBlacklist = async () => {
    await onRemoveBlacklist();
    setRemoveBlacklistDialogOpen(false);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Verification Actions */}
      {!ngo.isVerified ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setVerifyDialogOpen(true)}
            disabled={disabled || ngo.isBlacklisted}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Verify
          </Button>
          <AlertDialog
            open={verifyDialogOpen}
            onOpenChange={setVerifyDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Verify NGO</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to verify {ngo.name}? Verified NGOs will
                  receive higher operational limits and a verified badge.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleVerify}>
                  Verify
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRevokeDialogOpen(true)}
            disabled={disabled}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Revoke Verification
          </Button>
          <AlertDialog
            open={revokeDialogOpen}
            onOpenChange={setRevokeDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke Verification</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to revoke verification from {ngo.name}?
                  They will lose their verified status and higher operational
                  limits.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevokeVerification}>
                  Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Active Status Actions */}
      {ngo.isActive ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeactivateDialogOpen(true)}
            disabled={disabled}
          >
            <Power className="h-4 w-4 mr-1" />
            Deactivate
          </Button>
          <AlertDialog
            open={deactivateDialogOpen}
            onOpenChange={setDeactivateDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate NGO</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to deactivate {ngo.name}? They will not
                  be able to create pools or register field workers until
                  reactivated.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate}>
                  Deactivate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActivateDialogOpen(true)}
            disabled={disabled || ngo.isBlacklisted}
          >
            <Power className="h-4 w-4 mr-1" />
            Activate
          </Button>
          <AlertDialog
            open={activateDialogOpen}
            onOpenChange={setActivateDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Activate NGO</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to activate {ngo.name}? They will be
                  able to resume operations on the platform.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleActivate}>
                  Activate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Blacklist Actions */}
      {!ngo.isBlacklisted ? (
        <>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBlacklistDialogOpen(true)}
            disabled={disabled}
          >
            <Ban className="h-4 w-4 mr-1" />
            Blacklist
          </Button>
          <AlertDialog
            open={blacklistDialogOpen}
            onOpenChange={setBlacklistDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Blacklist NGO</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently ban {ngo.name} from the platform. They
                  will not be able to perform any operations. Please provide a
                  reason.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="blacklist-reason">Reason (required)</Label>
                <Textarea
                  id="blacklist-reason"
                  placeholder="Enter reason for blacklisting..."
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  maxLength={500}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {blacklistReason.length}/500 characters
                </p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBlacklistReason("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBlacklist}
                  disabled={!blacklistReason.trim()}
                >
                  Blacklist
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRemoveBlacklistDialogOpen(true)}
            disabled={disabled}
          >
            <ShieldCheck className="h-4 w-4 mr-1" />
            Remove Blacklist
          </Button>
          <AlertDialog
            open={removeBlacklistDialogOpen}
            onOpenChange={setRemoveBlacklistDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Blacklist</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {ngo.name} from the blacklist?
                  They will be able to resume operations on the platform.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveBlacklist}>
                  Remove Blacklist
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
