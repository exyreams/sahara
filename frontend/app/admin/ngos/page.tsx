"use client";

import { PublicKey } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BatchOperationsToolbar } from "@/components/admin/batch-operations-toolbar";
import { NGOActionButtons } from "@/components/admin/ngo-action-buttons";
import { VerificationProgressModal } from "@/components/admin/verification-progress-modal";
import { VerifiedIcon } from "@/components/icons/verified-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/hooks/use-admin";
import { useAllNGOs } from "@/hooks/use-all-ngos";
import { useBeneficiaries } from "@/hooks/use-beneficiaries";
import { useFieldWorkers } from "@/hooks/use-field-workers";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import { cn } from "@/lib/utils";
import { generateActionIds } from "@/lib/utils/generateActionId";
import type { NGO } from "@/types/program";

export default function NGOManagementPage() {
  const { loading: adminLoading } = useAdmin();
  const { ngos, loading: ngosLoading, refetch } = useAllNGOs();
  const { beneficiaries, loading: beneficiariesLoading } = useBeneficiaries();
  const { fieldWorkers, loading: fieldWorkersLoading } = useFieldWorkers();
  const { config } = usePlatformConfig();
  const { program } = useProgram();
  const { submit, isLoading: txLoading } = useTransaction();

  const [searchQuery, setSearchQuery] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [blacklistFilter, setBlacklistFilter] = useState<string>("all");
  const [selectedNGOs, setSelectedNGOs] = useState<PublicKey[]>([]);
  const [expandedNGOs, setExpandedNGOs] = useState<Set<string>>(new Set());

  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [verificationItems, setVerificationItems] = useState<
    Array<{
      name: string;
      status: "pending" | "processing" | "success" | "error";
      error?: string;
    }>
  >([]);
  const [currentVerificationIndex, setCurrentVerificationIndex] = useState(0);
  const [modalTitle, setModalTitle] = useState("Processing NGOs");
  const [modalDescription, setModalDescription] = useState("");
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const loading =
    adminLoading || ngosLoading || beneficiariesLoading || fieldWorkersLoading;

  // Calculate actual beneficiary counts and total aid distributed for each NGO
  const ngoStats = useMemo(() => {
    const stats = new Map<
      string,
      { beneficiaryCount: number; totalAidDistributed: number }
    >();

    for (const ngo of ngos) {
      // Get field workers for this NGO
      const ngoFieldWorkers = fieldWorkers.filter((fw) =>
        fw.ngo?.equals(ngo.publicKey),
      );

      // Get beneficiaries registered by this NGO's field workers
      const ngoBeneficiaries = beneficiaries.filter((b) =>
        ngoFieldWorkers.some((fw) => fw.authority.equals(b.registeredBy)),
      );

      // Count beneficiaries
      const beneficiaryCount = ngoBeneficiaries.length;

      // Sum up total aid distributed (totalReceived from all beneficiaries)
      const totalAidDistributed = ngoBeneficiaries.reduce(
        (sum, b) => sum + b.totalReceived,
        0,
      );

      stats.set(ngo.publicKey.toBase58(), {
        beneficiaryCount,
        totalAidDistributed,
      });
    }

    return stats;
  }, [ngos, beneficiaries, fieldWorkers]);

  // Track when initial load is complete
  useEffect(() => {
    if (!loading) {
      setHasInitiallyLoaded(true);
    }
  }, [loading]);

  // Filter NGOs based on search and filters
  const filteredNGOs = useMemo(() => {
    return ngos.filter((ngo) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.registrationNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Verified filter
      const matchesVerified =
        verifiedFilter === "all" ||
        (verifiedFilter === "verified" && ngo.isVerified) ||
        (verifiedFilter === "unverified" && !ngo.isVerified);

      // Active filter
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && ngo.isActive) ||
        (activeFilter === "inactive" && !ngo.isActive);

      // Blacklist filter
      const matchesBlacklist =
        blacklistFilter === "all" ||
        (blacklistFilter === "blacklisted" && ngo.isBlacklisted) ||
        (blacklistFilter === "not-blacklisted" && !ngo.isBlacklisted);

      return (
        matchesSearch && matchesVerified && matchesActive && matchesBlacklist
      );
    });
  }, [ngos, searchQuery, verifiedFilter, activeFilter, blacklistFilter]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNGOs(filteredNGOs.map((ngo) => ngo.authority));
    } else {
      setSelectedNGOs([]);
    }
  };

  // Handle individual selection
  const handleSelectNGO = (authority: PublicKey, checked: boolean) => {
    if (checked) {
      setSelectedNGOs([...selectedNGOs, authority]);
    } else {
      setSelectedNGOs(selectedNGOs.filter((a) => !a.equals(authority)));
    }
  };

  // Bundled verification - groups NGOs into batches of 5 for fewer wallet popups
  const BATCH_SIZE = 5;

  const handleSequentialVerification = async (ngosToVerify: NGO[]) => {
    if (!program || !program.provider.publicKey || ngosToVerify.length === 0) {
      return;
    }

    const adminPublicKey = program.provider.publicKey;
    const [configPDA] = derivePlatformConfigPDA();

    // Filter out already verified NGOs
    const unverifiedNgos = ngosToVerify.filter((ngo) => !ngo.isVerified);
    if (unverifiedNgos.length === 0) {
      alert("All selected NGOs are already verified");
      return;
    }

    // Pre-generate all action IDs at once
    const actionIds = generateActionIds(adminPublicKey, unverifiedNgos.length);

    // Split into batches of BATCH_SIZE
    const batches: NGO[][] = [];
    for (let i = 0; i < unverifiedNgos.length; i += BATCH_SIZE) {
      batches.push(unverifiedNgos.slice(i, i + BATCH_SIZE));
    }

    // Initialize progress modal
    const items = unverifiedNgos.map((ngo) => ({
      name: ngo.name,
      status: "pending" as const,
    }));
    setModalTitle("Verifying NGOs");
    setModalDescription(
      `Processing ${unverifiedNgos.length} NGO${unverifiedNgos.length > 1 ? "s" : ""} in ${batches.length} batch${batches.length > 1 ? "es" : ""} (${BATCH_SIZE} per transaction)...`,
    );
    setVerificationItems(items);
    setCurrentVerificationIndex(0);
    setShowProgressModal(true);

    let globalIndex = 0;

    // Process each batch
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchStartIndex = globalIndex;

      // Mark batch items as processing
      setVerificationItems((prev) =>
        prev.map((item, idx) =>
          idx >= batchStartIndex && idx < batchStartIndex + batch.length
            ? { ...item, status: "processing" }
            : item,
        ),
      );
      setCurrentVerificationIndex(batchStartIndex);

      try {
        // Build bundled transaction with multiple instructions
        const tx = new (await import("@solana/web3.js")).Transaction();

        for (let i = 0; i < batch.length; i++) {
          const ngo = batch[i];
          const actionId = actionIds[globalIndex + i];

          // Derive admin action PDA
          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              actionId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
          );

          // Build instruction (not execute yet)
          const instruction = await program.methods
            .verifyNgo(ngo.authority, { reason: "" }, actionId)
            .accounts({
              ngo: ngo.publicKey,
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .instruction();

          tx.add(instruction);
        }

        // Send bundled transaction - 1 wallet popup for entire batch
        if (!program.provider.sendAndConfirm) {
          throw new Error("Provider does not support sendAndConfirm");
        }
        await program.provider.sendAndConfirm(tx);

        // Mark all items in batch as success
        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx >= batchStartIndex && idx < batchStartIndex + batch.length
              ? { ...item, status: "success" }
              : item,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAlreadyProcessed =
          errorMessage.includes("already been processed") ||
          errorMessage.includes("AlreadyProcessed");

        if (isAlreadyProcessed) {
          // Mark batch as success
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx >= batchStartIndex && idx < batchStartIndex + batch.length
                ? { ...item, status: "success" }
                : item,
            ),
          );
        } else {
          // Mark batch as failed
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx >= batchStartIndex && idx < batchStartIndex + batch.length
                ? { ...item, status: "error", error: errorMessage }
                : item,
            ),
          );
        }
      }

      globalIndex += batch.length;

      // Small delay between batches
      if (batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Refresh data after all verifications
    await refetch();
  };

  // Bundled revoke verification - groups NGOs into batches of 5
  const handleSequentialRevokeVerification = async (ngosToRevoke: NGO[]) => {
    if (!program || !program.provider.publicKey || ngosToRevoke.length === 0) {
      return;
    }

    const adminPublicKey = program.provider.publicKey;
    const [configPDA] = derivePlatformConfigPDA();

    // Filter out already unverified NGOs
    const verifiedNgos = ngosToRevoke.filter((ngo) => ngo.isVerified);
    if (verifiedNgos.length === 0) {
      alert("All selected NGOs are already unverified");
      return;
    }

    // Pre-generate all action IDs at once
    const actionIds = generateActionIds(adminPublicKey, verifiedNgos.length);

    // Split into batches of BATCH_SIZE
    const batches: NGO[][] = [];
    for (let i = 0; i < verifiedNgos.length; i += BATCH_SIZE) {
      batches.push(verifiedNgos.slice(i, i + BATCH_SIZE));
    }

    // Initialize progress modal
    const items = verifiedNgos.map((ngo) => ({
      name: ngo.name,
      status: "pending" as const,
    }));
    setModalTitle("Revoking Verification");
    setModalDescription(
      `Processing ${verifiedNgos.length} NGO${verifiedNgos.length > 1 ? "s" : ""} in ${batches.length} batch${batches.length > 1 ? "es" : ""}...`,
    );
    setVerificationItems(items);
    setCurrentVerificationIndex(0);
    setShowProgressModal(true);

    let globalIndex = 0;

    // Process each batch
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchStartIndex = globalIndex;

      // Mark batch items as processing
      setVerificationItems((prev) =>
        prev.map((item, idx) =>
          idx >= batchStartIndex && idx < batchStartIndex + batch.length
            ? { ...item, status: "processing" }
            : item,
        ),
      );
      setCurrentVerificationIndex(batchStartIndex);

      try {
        // Build bundled transaction
        const tx = new (await import("@solana/web3.js")).Transaction();

        for (let i = 0; i < batch.length; i++) {
          const ngo = batch[i];
          const actionId = actionIds[globalIndex + i];

          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              actionId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
          );

          const instruction = await program.methods
            .revokeNgoVerification(ngo.authority, { reason: "" }, actionId)
            .accounts({
              ngo: ngo.publicKey,
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .instruction();

          tx.add(instruction);
        }

        if (!program.provider.sendAndConfirm) {
          throw new Error("Provider does not support sendAndConfirm");
        }
        await program.provider.sendAndConfirm(tx);

        // Mark batch as success
        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx >= batchStartIndex && idx < batchStartIndex + batch.length
              ? { ...item, status: "success" }
              : item,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAlreadyProcessed =
          errorMessage.includes("already been processed") ||
          errorMessage.includes("AlreadyProcessed");

        if (isAlreadyProcessed) {
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx >= batchStartIndex && idx < batchStartIndex + batch.length
                ? { ...item, status: "success" }
                : item,
            ),
          );
        } else {
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx >= batchStartIndex && idx < batchStartIndex + batch.length
                ? { ...item, status: "error", error: errorMessage }
                : item,
            ),
          );
        }
      }

      globalIndex += batch.length;

      if (batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    await refetch();
  };

  // Bundled deactivation - groups NGOs into batches of 5
  const handleSequentialDeactivation = async (ngosToDeactivate: NGO[]) => {
    if (
      !program ||
      !program.provider.publicKey ||
      ngosToDeactivate.length === 0
    ) {
      return;
    }

    const adminPublicKey = program.provider.publicKey;
    const [configPDA] = derivePlatformConfigPDA();

    // Filter out already inactive NGOs
    const activeNgos = ngosToDeactivate.filter((ngo) => ngo.isActive);
    if (activeNgos.length === 0) {
      alert("All selected NGOs are already deactivated");
      return;
    }

    const actionIds = generateActionIds(adminPublicKey, activeNgos.length);

    // Split into batches
    const batches: NGO[][] = [];
    for (let i = 0; i < activeNgos.length; i += BATCH_SIZE) {
      batches.push(activeNgos.slice(i, i + BATCH_SIZE));
    }

    const items = activeNgos.map((ngo) => ({
      name: ngo.name,
      status: "pending" as const,
    }));
    setModalTitle("Deactivating NGOs");
    setModalDescription(
      `Processing ${activeNgos.length} NGO${activeNgos.length > 1 ? "s" : ""} in ${batches.length} batch${batches.length > 1 ? "es" : ""}...`,
    );
    setVerificationItems(items);
    setCurrentVerificationIndex(0);
    setShowProgressModal(true);

    let globalIndex = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchStartIndex = globalIndex;

      setVerificationItems((prev) =>
        prev.map((item, idx) =>
          idx >= batchStartIndex && idx < batchStartIndex + batch.length
            ? { ...item, status: "processing" }
            : item,
        ),
      );
      setCurrentVerificationIndex(batchStartIndex);

      try {
        const tx = new (await import("@solana/web3.js")).Transaction();

        for (let i = 0; i < batch.length; i++) {
          const ngo = batch[i];
          const actionId = actionIds[globalIndex + i];

          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              actionId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
          );

          const instruction = await program.methods
            .updateNgoStatus(
              ngo.authority,
              { isActive: false, reason: "" },
              actionId,
            )
            .accounts({
              ngo: ngo.publicKey,
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .instruction();

          tx.add(instruction);
        }

        if (!program.provider.sendAndConfirm) {
          throw new Error("Provider does not support sendAndConfirm");
        }
        await program.provider.sendAndConfirm(tx);

        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx >= batchStartIndex && idx < batchStartIndex + batch.length
              ? { ...item, status: "success" }
              : item,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAlreadyProcessed = errorMessage.includes(
          "already been processed",
        );

        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx >= batchStartIndex && idx < batchStartIndex + batch.length
              ? {
                  ...item,
                  status: isAlreadyProcessed ? "success" : "error",
                  error: isAlreadyProcessed ? undefined : errorMessage,
                }
              : item,
          ),
        );
      }

      globalIndex += batch.length;

      if (batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    await refetch();
  };

  // Bundled activation - groups NGOs into batches of 5
  const handleSequentialActivation = async (ngosToActivate: NGO[]) => {
    if (
      !program ||
      !program.provider.publicKey ||
      ngosToActivate.length === 0
    ) {
      return;
    }

    const adminPublicKey = program.provider.publicKey;
    const [configPDA] = derivePlatformConfigPDA();

    const inactiveNgos = ngosToActivate.filter((ngo) => !ngo.isActive);
    if (inactiveNgos.length === 0) {
      alert("All selected NGOs are already active");
      return;
    }

    const actionIds = generateActionIds(adminPublicKey, inactiveNgos.length);

    const batches: NGO[][] = [];
    for (let i = 0; i < inactiveNgos.length; i += BATCH_SIZE) {
      batches.push(inactiveNgos.slice(i, i + BATCH_SIZE));
    }

    const items = inactiveNgos.map((ngo) => ({
      name: ngo.name,
      status: "pending" as const,
    }));
    setModalTitle("Activating NGOs");
    setModalDescription(
      `Processing ${inactiveNgos.length} NGO${inactiveNgos.length > 1 ? "s" : ""} in ${batches.length} batch${batches.length > 1 ? "es" : ""}...`,
    );
    setVerificationItems(items);
    setCurrentVerificationIndex(0);
    setShowProgressModal(true);

    let globalIndex = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchStartIndex = globalIndex;

      setVerificationItems((prev) =>
        prev.map((item, idx) =>
          idx >= batchStartIndex && idx < batchStartIndex + batch.length
            ? { ...item, status: "processing" }
            : item,
        ),
      );
      setCurrentVerificationIndex(batchStartIndex);

      try {
        const tx = new (await import("@solana/web3.js")).Transaction();

        for (let i = 0; i < batch.length; i++) {
          const ngo = batch[i];
          const actionId = actionIds[globalIndex + i];

          const [adminActionPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("admin-action"),
              adminPublicKey.toBuffer(),
              actionId.toArrayLike(Buffer, "le", 8),
            ],
            program.programId,
          );

          const instruction = await program.methods
            .updateNgoStatus(
              ngo.authority,
              { isActive: true, reason: "" },
              actionId,
            )
            .accounts({
              ngo: ngo.publicKey,
              config: configPDA,
              adminAction: adminActionPDA,
              admin: adminPublicKey,
            })
            .instruction();

          tx.add(instruction);
        }

        if (!program.provider.sendAndConfirm) {
          throw new Error("Provider does not support sendAndConfirm");
        }
        await program.provider.sendAndConfirm(tx);

        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx >= batchStartIndex && idx < batchStartIndex + batch.length
              ? { ...item, status: "success" }
              : item,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAlreadyProcessed = errorMessage.includes(
          "already been processed",
        );

        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx >= batchStartIndex && idx < batchStartIndex + batch.length
              ? {
                  ...item,
                  status: isAlreadyProcessed ? "success" : "error",
                  error: isAlreadyProcessed ? undefined : errorMessage,
                }
              : item,
          ),
        );
      }

      globalIndex += batch.length;

      if (batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    await refetch();
  };

  // Sequential blacklist with progress modal
  const handleSequentialBlacklist = async (ngosToBlacklist: NGO[]) => {
    if (
      !program ||
      !program.provider.publicKey ||
      ngosToBlacklist.length === 0
    ) {
      return;
    }

    const adminPublicKey = program.provider.publicKey;
    const [configPDA] = derivePlatformConfigPDA();

    // Pre-generate all action IDs at once
    const actionIds = generateActionIds(adminPublicKey, ngosToBlacklist.length);

    // Initialize progress modal
    const items = ngosToBlacklist.map((ngo) => ({
      name: ngo.name,
      status: "pending" as const,
    }));
    setModalTitle("Blacklisting NGOs");
    setModalDescription(
      `Processing ${ngosToBlacklist.length} NGO${
        ngosToBlacklist.length > 1 ? "s" : ""
      } sequentially...`,
    );
    setVerificationItems(items);
    setCurrentVerificationIndex(0);
    setShowProgressModal(true);

    // Process each NGO sequentially
    for (let i = 0; i < ngosToBlacklist.length; i++) {
      const ngo = ngosToBlacklist[i];
      const actionId = actionIds[i];

      setCurrentVerificationIndex(i);
      setVerificationItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: "processing" } : item,
        ),
      );

      // Check if NGO is already blacklisted
      if (ngo.isBlacklisted) {
        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "success",
                  error: "Already blacklisted",
                }
              : item,
          ),
        );

        // Small delay before next item
        if (i < ngosToBlacklist.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        continue;
      }

      try {
        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            adminPublicKey.toBuffer(),
            actionId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        const txSignature = await program.methods
          .blacklistNgo(ngo.authority, { reason: "Batch blacklist" }, actionId)
          .accounts({
            ngo: ngo.publicKey,
            config: configPDA,
            adminAction: adminActionPDA,
            admin: adminPublicKey,
          })
          .rpc();

        await program.provider.connection.confirmTransaction(
          txSignature,
          "confirmed",
        );

        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "success" } : item,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAlreadyProcessed = errorMessage.includes(
          "already been processed",
        );

        if (isAlreadyProcessed) {
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "success" } : item,
            ),
          );
        } else {
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "error",
                    error: errorMessage,
                  }
                : item,
            ),
          );
        }
      }

      if (i < ngosToBlacklist.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await refetch();
  };

  // Sequential remove blacklist with progress modal
  const handleSequentialRemoveBlacklist = async (
    ngosToRemoveBlacklist: NGO[],
  ) => {
    if (
      !program ||
      !program.provider.publicKey ||
      ngosToRemoveBlacklist.length === 0
    ) {
      return;
    }

    const adminPublicKey = program.provider.publicKey;
    const [configPDA] = derivePlatformConfigPDA();

    // Pre-generate all action IDs at once
    const actionIds = generateActionIds(
      adminPublicKey,
      ngosToRemoveBlacklist.length,
    );

    // Initialize progress modal
    const items = ngosToRemoveBlacklist.map((ngo) => ({
      name: ngo.name,
      status: "pending" as const,
    }));
    setModalTitle("Removing Blacklist");
    setModalDescription(
      `Processing ${ngosToRemoveBlacklist.length} NGO${
        ngosToRemoveBlacklist.length > 1 ? "s" : ""
      } sequentially...`,
    );
    setVerificationItems(items);
    setCurrentVerificationIndex(0);
    setShowProgressModal(true);

    // Process each NGO sequentially
    for (let i = 0; i < ngosToRemoveBlacklist.length; i++) {
      const ngo = ngosToRemoveBlacklist[i];
      const actionId = actionIds[i];

      setCurrentVerificationIndex(i);
      setVerificationItems((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: "processing" } : item,
        ),
      );

      // Check if NGO is not blacklisted
      if (!ngo.isBlacklisted) {
        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "success",
                  error: "Not blacklisted",
                }
              : item,
          ),
        );

        // Small delay before next item
        if (i < ngosToRemoveBlacklist.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        continue;
      }

      try {
        const [adminActionPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("admin-action"),
            adminPublicKey.toBuffer(),
            actionId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId,
        );

        const txSignature = await program.methods
          .removeBlacklist(ngo.authority, { reason: "" }, actionId)
          .accounts({
            ngo: ngo.publicKey,
            config: configPDA,
            adminAction: adminActionPDA,
            admin: adminPublicKey,
          })
          .rpc();

        await program.provider.connection.confirmTransaction(
          txSignature,
          "confirmed",
        );

        setVerificationItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "success" } : item,
          ),
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAlreadyProcessed = errorMessage.includes(
          "already been processed",
        );

        if (isAlreadyProcessed) {
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "success" } : item,
            ),
          );
        } else {
          setVerificationItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "error",
                    error: errorMessage,
                  }
                : item,
            ),
          );
        }
      }

      if (i < ngosToRemoveBlacklist.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    await refetch();
  };

  // Transaction handlers
  const handleVerifyNGO = async (ngo: NGO) => {
    if (!program || !program.provider.publicKey) return;

    const adminPublicKey = program.provider.publicKey;

    await submit(
      async () => {
        const [configPDA] = derivePlatformConfigPDA();

        // Generate 1 unique action ID for this single operation
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

        const txSignature = await program.methods
          .verifyNgo(ngo.authority, { reason: "" }, actionId)
          .accounts({
            ngo: ngo.publicKey,
            config: configPDA,
            adminAction: adminActionPDA,
            admin: adminPublicKey,
          })
          .rpc();

        return txSignature;
      },
      {
        successMessage: `${ngo.name} verified successfully`,
        onSuccess: () => {
          refetch();
        },
      },
    );
  };

  const handleRevokeVerification = async (ngo: NGO) => {
    if (!program || !program.provider.publicKey) return;

    const adminPublicKey = program.provider.publicKey;

    await submit(
      async () => {
        const [configPDA] = derivePlatformConfigPDA();

        // Generate 1 unique action ID for this single operation
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
          .revokeNgoVerification(ngo.authority, { reason: "" }, actionId)
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
        successMessage: `Successfully revoked verification from ${ngo.name}`,
        onSuccess: () => refetch(),
      },
    );
  };

  const handleActivateNGO = async (ngo: NGO) => {
    if (!program || !program.provider.publicKey) return;

    const adminPublicKey = program.provider.publicKey;
    await submit(
      async () => {
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
          .updateNgoStatus(
            ngo.authority,
            {
              isActive: true,
              reason: "",
            },
            actionId,
          )
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
        successMessage: `Successfully activated ${ngo.name}`,
        onSuccess: () => refetch(),
      },
    );
  };

  const handleDeactivateNGO = async (ngo: NGO) => {
    if (!program || !program.provider.publicKey) return;

    const adminPublicKey = program.provider.publicKey;
    await submit(
      async () => {
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
          .updateNgoStatus(
            ngo.authority,
            {
              isActive: false,
              reason: "",
            },
            actionId,
          )
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
        successMessage: `Successfully deactivated ${ngo.name}`,
        onSuccess: () => refetch(),
      },
    );
  };

  const handleBlacklistNGO = async (ngo: NGO, reason: string) => {
    if (!program || !program.provider.publicKey) return;

    const adminPublicKey = program.provider.publicKey;
    await submit(
      async () => {
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
          .blacklistNgo(ngo.authority, { reason }, actionId)
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
        successMessage: `Successfully blacklisted ${ngo.name}`,
        onSuccess: () => refetch(),
      },
    );
  };

  const handleRemoveBlacklist = async (ngo: NGO) => {
    if (!program || !program.provider.publicKey) return;

    const adminPublicKey = program.provider.publicKey;
    await submit(
      async () => {
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
          .removeBlacklist(ngo.authority, { reason: "" }, actionId)
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
        successMessage: `Successfully removed blacklist from ${ngo.name}`,
        onSuccess: () => refetch(),
      },
    );
  };

  // Batch operation handlers
  const handleBatchVerify = async () => {
    if (selectedNGOs.length === 0) return;

    // Get the full NGO objects for selected authorities
    const ngosToVerify = ngos.filter((ngo) =>
      selectedNGOs.some((selected) => selected.equals(ngo.authority)),
    );

    // Use sequential verification with progress modal
    await handleSequentialVerification(ngosToVerify);

    // Clear selection after completion
    setSelectedNGOs([]);
  };

  const handleBatchRevokeVerification = async () => {
    if (selectedNGOs.length === 0) return;

    // Get the full NGO objects for selected authorities
    const ngosToRevoke = ngos.filter((ngo) =>
      selectedNGOs.some((selected) => selected.equals(ngo.authority)),
    );

    // Use sequential revoke verification with progress modal
    await handleSequentialRevokeVerification(ngosToRevoke);

    // Clear selection after completion
    setSelectedNGOs([]);
  };

  const handleBatchDeactivate = async () => {
    if (selectedNGOs.length === 0) return;

    // Get the full NGO objects for selected authorities
    const ngosToDeactivate = ngos.filter((ngo) =>
      selectedNGOs.some((selected) => selected.equals(ngo.authority)),
    );

    // Use sequential deactivation with progress modal
    await handleSequentialDeactivation(ngosToDeactivate);

    // Clear selection after completion
    setSelectedNGOs([]);
  };

  const handleBatchActivate = async () => {
    if (selectedNGOs.length === 0) return;

    // Get the full NGO objects for selected authorities
    const ngosToActivate = ngos.filter((ngo) =>
      selectedNGOs.some((selected) => selected.equals(ngo.authority)),
    );

    // Use sequential activation with progress modal
    await handleSequentialActivation(ngosToActivate);

    // Clear selection after completion
    setSelectedNGOs([]);
  };

  const handleBatchBlacklist = async () => {
    if (selectedNGOs.length === 0) return;

    // Get the full NGO objects for selected authorities
    const ngosToBlacklist = ngos.filter((ngo) =>
      selectedNGOs.some((selected) => selected.equals(ngo.authority)),
    );

    // Use sequential blacklist with progress modal
    await handleSequentialBlacklist(ngosToBlacklist);

    // Clear selection after completion
    setSelectedNGOs([]);
  };

  const handleBatchRemoveBlacklist = async () => {
    if (selectedNGOs.length === 0) return;

    // Get the full NGO objects for selected authorities
    const ngosToRemoveBlacklist = ngos.filter((ngo) =>
      selectedNGOs.some((selected) => selected.equals(ngo.authority)),
    );

    // Use sequential remove blacklist with progress modal
    await handleSequentialRemoveBlacklist(ngosToRemoveBlacklist);

    // Clear selection after completion
    setSelectedNGOs([]);
  };

  const handleClearSelection = () => {
    setSelectedNGOs([]);
  };

  // Handle refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  if (loading && !hasInitiallyLoaded) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-10 w-56 bg-theme-border rounded animate-pulse" />
            <div className="h-4 w-80 bg-theme-border rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-theme-border rounded animate-pulse" />
        </div>

        {/* Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <div className="h-6 w-24 bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                <div className="h-4 w-20 bg-theme-border rounded animate-pulse" />
              </div>
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="h-9 flex-1 bg-theme-border rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-9 w-40 bg-theme-border rounded animate-pulse" />
                <div className="h-9 w-36 bg-theme-border rounded animate-pulse" />
                <div className="h-9 w-40 bg-theme-border rounded animate-pulse" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* NGO Card Skeletons */}
              {Array.from({ length: 5 }, (_, i) => `ngo-skeleton-${i}`).map(
                (key) => (
                  <div
                    key={key}
                    className="border border-theme-border rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="h-4 w-4 bg-theme-border rounded mt-1 animate-pulse" />

                      <div className="flex-1 space-y-3">
                        {/* Title and Badges */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                            <div className="h-6 w-6 bg-theme-border rounded-full animate-pulse" />
                          </div>
                          <div className="flex gap-2">
                            <div className="h-6 w-16 bg-theme-border rounded animate-pulse" />
                            <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                          </div>
                        </div>

                        {/* Registration */}
                        <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />

                        {/* Stats */}
                        <div className="flex gap-4">
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                          <div className="h-4 w-20 bg-theme-border rounded animate-pulse" />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <div className="h-9 w-24 bg-theme-border rounded animate-pulse" />
                          <div className="h-9 w-24 bg-theme-border rounded animate-pulse" />
                          <div className="h-9 w-28 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Progress Modal */}
      <VerificationProgressModal
        open={showProgressModal}
        items={verificationItems}
        currentIndex={currentVerificationIndex}
        title={modalTitle}
        description={modalDescription}
        onClose={() => setShowProgressModal(false)}
      />

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
          <h1 className="text-4xl font-bold tracking-tight">NGO Management</h1>
          <p className="text-muted-foreground mt-2">
            Verify, manage, and monitor NGO organizations
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

      {/* Batch Operations Toolbar */}
      {selectedNGOs.length > 0 && (
        <div className="mb-6 bg-theme-card-bg border border-theme-border rounded-lg p-3">
          <BatchOperationsToolbar
            selectedCount={selectedNGOs.length}
            onBatchVerify={handleBatchVerify}
            onBatchRevokeVerification={handleBatchRevokeVerification}
            onBatchActivate={handleBatchActivate}
            onBatchDeactivate={handleBatchDeactivate}
            onBatchBlacklist={handleBatchBlacklist}
            onBatchRemoveBlacklist={handleBatchRemoveBlacklist}
            onClearSelection={handleClearSelection}
            disabled={txLoading}
          />
        </div>
      )}

      {/* Combined Filters and NGO List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-lg">
                NGOs ({filteredNGOs.length})
              </CardTitle>
              <CardDescription>
                {selectedNGOs.length > 0 && `${selectedNGOs.length} selected`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedNGOs.length === filteredNGOs.length &&
                  filteredNGOs.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-theme-text transition-colors bg-transparent border-0 p-0 cursor-pointer"
                onClick={() =>
                  handleSelectAll(
                    !(
                      selectedNGOs.length === filteredNGOs.length &&
                      filteredNGOs.length > 0
                    ),
                  )
                }
              >
                Select All
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or registration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex gap-2">
              <Dropdown
                value={verifiedFilter}
                onValueChange={setVerifiedFilter}
                placeholder="Verification"
                options={[
                  { value: "all", label: "All Verification" },
                  { value: "verified", label: "Verified" },
                  { value: "unverified", label: "Unverified" },
                ]}
                className="w-40"
              />

              <Dropdown
                value={activeFilter}
                onValueChange={setActiveFilter}
                placeholder="Status"
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                className="w-36"
              />

              <Dropdown
                value={blacklistFilter}
                onValueChange={setBlacklistFilter}
                placeholder="Blacklist"
                options={[
                  { value: "all", label: "All" },
                  { value: "not-blacklisted", label: "Not Blacklisted" },
                  { value: "blacklisted", label: "Blacklisted" },
                ]}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isRefreshing ? (
            <div className="space-y-3">
              {/* NGO Card Skeletons */}
              {Array.from(
                { length: 5 },
                (_, i) => `refresh-ngo-skeleton-${i}`,
              ).map((key) => (
                <div
                  key={key}
                  className="border border-theme-border rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="h-4 w-4 bg-theme-border rounded mt-1 animate-pulse" />

                    <div className="flex-1 space-y-3">
                      {/* Title and Badges */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-48 bg-theme-border rounded animate-pulse" />
                          <div className="h-6 w-6 bg-theme-border rounded-full animate-pulse" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-6 w-16 bg-theme-border rounded animate-pulse" />
                          <div className="h-6 w-20 bg-theme-border rounded animate-pulse" />
                        </div>
                      </div>

                      {/* Registration */}
                      <div className="h-4 w-64 bg-theme-border rounded animate-pulse" />

                      {/* Stats */}
                      <div className="flex gap-4">
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                        <div className="h-4 w-20 bg-theme-border rounded animate-pulse" />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <div className="h-9 w-24 bg-theme-border rounded animate-pulse" />
                        <div className="h-9 w-24 bg-theme-border rounded animate-pulse" />
                        <div className="h-9 w-28 bg-theme-border rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNGOs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No NGOs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNGOs.map((ngo) => {
                const ngoKey = ngo.publicKey.toString();
                const isExpanded = expandedNGOs.has(ngoKey);

                return (
                  <div
                    key={ngoKey}
                    className={cn(
                      "border border-theme-border rounded-lg overflow-hidden transition-all duration-200",
                      "hover:border-theme-primary/50",
                      !ngo.isActive && "opacity-60",
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedNGOs.some((a) =>
                            a.equals(ngo.authority),
                          )}
                          onCheckedChange={(checked) =>
                            handleSelectNGO(ngo.authority, checked as boolean)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-theme-text-highlight truncate">
                                {ngo.name}
                              </h3>
                              {ngo.isVerified && (
                                <VerifiedIcon
                                  className="h-6 w-6 shrink-0"
                                  tooltip="Verified NGO"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant={ngo.isActive ? "default" : "secondary"}
                              >
                                {ngo.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {ngo.isBlacklisted && (
                                <Badge variant="destructive">Blacklisted</Badge>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedNGOs((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(ngoKey)) {
                                      next.delete(ngoKey);
                                    } else {
                                      next.add(ngoKey);
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
                            Registration: {ngo.registrationNumber}
                          </p>
                          <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                            <span>
                              <span className="mr-2">
                                {ngo.fieldWorkersCount}
                              </span>
                              Field Workers
                            </span>
                            <span>
                              <span className="mr-2">
                                {ngoStats.get(ngo.publicKey.toBase58())
                                  ?.beneficiaryCount || 0}
                              </span>
                              Beneficiaries
                            </span>
                            <span>
                              <span className="mr-2">{ngo.poolsCreated}</span>
                              Pools
                            </span>
                          </div>
                          <NGOActionButtons
                            ngo={ngo}
                            onVerify={() => handleVerifyNGO(ngo)}
                            onRevokeVerification={() =>
                              handleRevokeVerification(ngo)
                            }
                            onActivate={() => handleActivateNGO(ngo)}
                            onDeactivate={() => handleDeactivateNGO(ngo)}
                            onBlacklist={(reason) =>
                              handleBlacklistNGO(ngo, reason)
                            }
                            onRemoveBlacklist={() => handleRemoveBlacklist(ngo)}
                            disabled={txLoading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden px-8 py-4 border-t border-theme-border"
                        >
                          <div className="bg-theme-background/50 p-4 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Contact Information */}
                              <div>
                                <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                                  Contact Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-theme-text/60">
                                      Email:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.email || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Phone:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.phoneNumber || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Website:
                                    </span>
                                    <p className="text-theme-text break-all">
                                      {ngo.website || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Address:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.address || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Contact Person:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.contactPersonName || "Not provided"}{" "}
                                      {ngo.contactPersonRole &&
                                        `(${ngo.contactPersonRole})`}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Organization Details */}
                              <div>
                                <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                                  Organization Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-theme-text/60">
                                      Description:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.description || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Operating Districts:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.operatingDistricts.length > 0
                                        ? ngo.operatingDistricts.join(", ")
                                        : "Not specified"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Focus Areas:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.focusAreas.length > 0
                                        ? ngo.focusAreas.join(", ")
                                        : "Not specified"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Tax ID:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.taxId || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Bank Account:
                                    </span>
                                    <p className="text-theme-text">
                                      {ngo.bankAccountInfo || "Not provided"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Statistics */}
                              <div>
                                <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                                  Statistics
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-theme-text/60">
                                      Total Aid Distributed:
                                    </span>
                                    <p className="text-theme-primary text-lg font-semibold">
                                      $
                                      {(
                                        (ngoStats.get(ngo.publicKey.toBase58())
                                          ?.totalAidDistributed || 0) /
                                        1_000_000
                                      ).toFixed(2)}{" "}
                                      USDC
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Field Workers: {ngo.fieldWorkersCount}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Beneficiaries Registered:{" "}
                                      {ngoStats.get(ngo.publicKey.toBase58())
                                        ?.beneficiaryCount || 0}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-theme-text/60">
                                      Pools Created: {ngo.poolsCreated}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Verification & Dates */}
                              <div>
                                <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                                  Verification & Timeline
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-theme-text/60">
                                      Registered At:
                                    </span>
                                    <p className="text-theme-text">
                                      {new Date(
                                        ngo.registeredAt * 1000,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  {ngo.verifiedAt && (
                                    <div>
                                      <span className="text-theme-text/60">
                                        Verified At:
                                      </span>
                                      <p className="text-theme-text">
                                        {new Date(
                                          ngo.verifiedAt * 1000,
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                  )}
                                  {ngo.verifiedBy && (
                                    <div>
                                      <span className="text-theme-text/60">
                                        Verified By:
                                      </span>
                                      <p className="text-theme-text font-mono text-xs break-all">
                                        {ngo.verifiedBy.toBase58()}
                                      </p>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-theme-text/60">
                                      Last Activity:
                                    </span>
                                    <p className="text-theme-text">
                                      {new Date(
                                        ngo.lastActivityAt * 1000,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  {ngo.verificationDocuments && (
                                    <div>
                                      <span className="text-theme-text/60">
                                        Verification Documents:
                                      </span>
                                      <p className="text-theme-text break-all">
                                        {ngo.verificationDocuments}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Wallet Address & Notes */}
                              <div className="md:col-span-2">
                                <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                                  Additional Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-theme-text/60">
                                      Wallet Address:
                                    </span>
                                    <p className="text-theme-text font-mono text-xs break-all">
                                      {ngo.authority.toBase58()}
                                    </p>
                                  </div>
                                  {ngo.notes && (
                                    <div>
                                      <span className="text-theme-text/60">
                                        Admin Notes:
                                      </span>
                                      <p className="text-theme-text">
                                        {ngo.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
