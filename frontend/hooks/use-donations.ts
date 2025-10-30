"use client";

import type { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { useProgram } from "./use-program";

export interface DonationRecord {
  publicKey: PublicKey;
  donor: PublicKey;
  recipient: PublicKey;
  donationType: string;
  amount: number;
  tokenMint: PublicKey;
  disasterId: string;
  pool: PublicKey | null;
  transactionSignature: string;
  timestamp: number;
  isAnonymous: boolean;
  message: string;
  platformFee: number;
  netAmount: number;
  donorName: string | null;
  donorEmail: string | null;
  receiptSent: boolean;
}

interface UseDonationsReturn {
  donations: DonationRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  filterByPool: (poolAddress: PublicKey) => DonationRecord[];
  filterByDisaster: (disasterId: string) => DonationRecord[];
  filterByRecipient: (recipientAddress: PublicKey) => DonationRecord[];
}

export function useDonations(): UseDonationsReturn {
  const { program } = useProgram();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDonations = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all donation records from the Solana blockchain via Anchor program
      const donationAccounts =
        await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (program.account as any).donationRecord.all();

      const formattedDonations: DonationRecord[] = donationAccounts.map(
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        (account: any) => ({
          publicKey: account.publicKey,
          donor: account.account.donor,
          recipient: account.account.recipient,
          donationType: Object.keys(account.account.donationType)[0],
          amount: account.account.amount.toNumber(),
          tokenMint: account.account.tokenMint,
          disasterId: account.account.disasterId,
          pool: account.account.pool,
          transactionSignature: account.account.transactionSignature,
          timestamp: account.account.timestamp.toNumber(),
          isAnonymous: account.account.isAnonymous,
          message: account.account.message,
          platformFee: account.account.platformFee.toNumber(),
          netAmount: account.account.netAmount.toNumber(),
          donorName: account.account.donorName,
          donorEmail: account.account.donorEmail,
          receiptSent: account.account.receiptSent,
        }),
      );

      setDonations(formattedDonations);
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching donations:", err);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const filterByPool = useCallback(
    (poolAddress: PublicKey) => {
      return donations.filter((d) => d.pool?.equals(poolAddress));
    },
    [donations],
  );

  const filterByDisaster = useCallback(
    (disasterId: string) => {
      return donations.filter((d) => d.disasterId === disasterId);
    },
    [donations],
  );

  const filterByRecipient = useCallback(
    (recipientAddress: PublicKey) => {
      return donations.filter((d) => d.recipient.equals(recipientAddress));
    },
    [donations],
  );

  return {
    donations,
    loading,
    error,
    refetch: fetchDonations,
    filterByPool,
    filterByDisaster,
    filterByRecipient,
  };
}
