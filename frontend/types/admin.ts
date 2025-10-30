import type { PublicKey } from "@solana/web3.js";

/**
 * Admin Action Types
 */
export enum AdminActionType {
  VerifyNGO = "VerifyNGO",
  RevokeVerification = "RevokeVerification",
  ActivateNGO = "ActivateNGO",
  DeactivateNGO = "DeactivateNGO",
  BlacklistNGO = "BlacklistNGO",
  RemoveBlacklist = "RemoveBlacklist",
  InitiateAdminTransfer = "InitiateAdminTransfer",
  AcceptAdminTransfer = "AcceptAdminTransfer",
  CancelAdminTransfer = "CancelAdminTransfer",
  UpdatePlatformConfig = "UpdatePlatformConfig",
  PausePlatform = "PausePlatform",
  UnpausePlatform = "UnpausePlatform",
}

/**
 * Admin Action Log Entry
 */
export interface AdminAction {
  publicKey: PublicKey;
  actionType: AdminActionType;
  target: PublicKey;
  admin: PublicKey;
  reason: string;
  timestamp: number;
  metadata: string;
  bump: number;
}

/**
 * Admin Transfer Status
 */
export interface AdminTransferStatus {
  isPending: boolean;
  pendingAdmin: PublicKey | null;
  initiatedAt: number | null;
  expiresAt: number | null;
  isExpired: boolean;
  timeRemaining: number | null; // in seconds
}
