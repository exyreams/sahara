"use client";

import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import type { SaharasolCore } from "@/lib/anchor/idl";
import { IDL } from "@/lib/anchor/idl";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Create a read-only provider for when wallet is not connected
  const readOnlyProvider = useMemo(() => {
    // Create a dummy wallet for read-only operations
    const dummyWallet = {
      publicKey: null,
      signTransaction: async () => {
        throw new Error("Wallet not connected");
      },
      signAllTransactions: async () => {
        throw new Error("Wallet not connected");
      },
    };

    return new AnchorProvider(connection, dummyWallet as unknown as Wallet, {
      commitment: "confirmed",
    });
  }, [connection]);

  const provider = useMemo(() => {
    if (!wallet.publicKey) {
      return readOnlyProvider;
    }

    // Wallet adapter type is compatible with Anchor's Wallet interface
    return new AnchorProvider(connection, wallet as unknown as Wallet, {
      commitment: "confirmed",
    });
  }, [connection, wallet, readOnlyProvider]);

  const program = useMemo(() => {
    if (!provider) {
      return null;
    }

    return new Program(IDL as SaharasolCore, provider);
  }, [provider]);

  const isReady = useMemo(() => {
    return !!(wallet.connected && wallet.publicKey && program);
  }, [wallet.connected, wallet.publicKey, program]);

  return {
    program,
    connection,
    wallet,
    provider,
    isReady,
  };
}
