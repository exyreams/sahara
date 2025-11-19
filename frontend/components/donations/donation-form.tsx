"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useQueryClient } from "@tanstack/react-query";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveActivityLogPDA,
  deriveBeneficiaryPDA,
  deriveDisasterPDA,
  deriveDonationRecordPDA,
  deriveFundPoolPDA,
  deriveNGOPDA,
  derivePlatformConfigPDA,
  derivePoolTokenAccountPDA,
} from "@/lib/anchor/pdas";
import { parseSOL, parseUSDC } from "@/lib/formatters";
import { type DonationFormData, donationFormSchema } from "@/types/forms";

interface DonationFormProps {
  recipientAddress: string;
  recipientType: "beneficiary" | "pool";
  disasterId: string;
  poolId?: string;
  onSuccess?: () => void;
}

export function DonationForm({
  recipientAddress,
  recipientType,
  disasterId,
  poolId,
  onSuccess,
}: DonationFormProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      amount: 0,
      token: "USDC",
      message: "",
      isAnonymous: false,
    },
  });

  const onSubmit = async (data: DonationFormData) => {
    if (!program || !wallet.publicKey) return;

    const amountInSmallestUnit =
      data.token === "USDC" ? parseUSDC(data.amount) : parseSOL(data.amount);
    const timestamp = Math.floor(Date.now() / 1000);

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        if (recipientType === "beneficiary") {
          // Get platform config first to get the correct USDC mint (same as pools)
          const [configPDA] = derivePlatformConfigPDA();
          const configAccount =
            await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
            (program.account as any).platformConfig.fetch(configPDA);

          // Use the USDC mint from platform config (same as pools use)
          const tokenMint = configAccount.usdcMint;

          console.log("=== Beneficiary Donation Debug ===");
          console.log("Token Mint:", tokenMint.toBase58());
          console.log("Donor:", wallet.publicKey.toBase58());
          console.log("Timestamp:", timestamp);
          console.log("Timestamp BN:", new BN(timestamp).toString());

          // Direct donation to beneficiary
          const beneficiaryAuthority = new PublicKey(recipientAddress);
          const [beneficiaryPDA] = deriveBeneficiaryPDA(
            beneficiaryAuthority,
            disasterId
          );
          const [disasterPDA] = deriveDisasterPDA(disasterId);
          const [donationRecordPDA] = deriveDonationRecordPDA(
            wallet.publicKey,
            beneficiaryPDA,
            timestamp
          );

          console.log("Beneficiary PDA:", beneficiaryPDA.toBase58());
          console.log("Donation Record PDA:", donationRecordPDA.toBase58());

          // Get connection
          const connection = program.provider.connection;

          // Get token accounts
          const donorTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            wallet.publicKey
          );
          const beneficiaryTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            beneficiaryAuthority
          );

          console.log("Donor Token Account:", donorTokenAccount.toBase58());
          console.log(
            "Beneficiary Token Account:",
            beneficiaryTokenAccount.toBase58()
          );

          // Check if donor token account exists
          const donorTokenAccountInfo = await connection.getAccountInfo(
            donorTokenAccount
          );

          console.log("Donor Token Account Exists:", !!donorTokenAccountInfo);

          if (!donorTokenAccountInfo) {
            throw new Error(
              `You don't have a ${data.token} token account yet. Please receive some ${data.token} first to create your token account, then try donating again.`
            );
          }

          // Check if beneficiary token account exists
          const beneficiaryTokenAccountInfo = await connection.getAccountInfo(
            beneficiaryTokenAccount
          );

          console.log(
            "Beneficiary Token Account Exists:",
            !!beneficiaryTokenAccountInfo
          );

          // Get platform fee recipient
          const platformFeeRecipient = await getAssociatedTokenAddress(
            tokenMint,
            configAccount.platformFeeRecipient
          );

          console.log(
            "Platform Fee Recipient:",
            platformFeeRecipient.toBase58()
          );

          // Derive activity log PDA
          const [activityLogPDA] = deriveActivityLogPDA(
            wallet.publicKey,
            timestamp
          );

          console.log("Activity Log PDA:", activityLogPDA.toBase58());
          console.log("=== End Debug ===");

          // Build the transaction
          const txBuilder = program.methods
            .donateDirect(
              beneficiaryAuthority,
              disasterId,
              {
                amount: new BN(amountInSmallestUnit.toString()),
                message: data.message || "",
                isAnonymous: data.isAnonymous,
              },
              new BN(timestamp)
            )
            .accounts({
              beneficiary: beneficiaryPDA,
              disaster: disasterPDA,
              donationRecord: donationRecordPDA,
              donorTokenAccount,
              beneficiaryTokenAccount,
              config: configPDA,
              platformFeeRecipient,
              donor: wallet.publicKey,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            });

          // If beneficiary token account doesn't exist, add instruction to create it
          if (!beneficiaryTokenAccountInfo) {
            console.log("Creating beneficiary token account...");
            txBuilder.preInstructions([
              createAssociatedTokenAccountInstruction(
                wallet.publicKey, // payer
                beneficiaryTokenAccount, // associated token account
                beneficiaryAuthority, // owner
                tokenMint, // mint
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
              ),
            ]);
          }

          const tx = await txBuilder.rpc();

          return tx;
        } else {
          // Donation to pool
          if (!poolId)
            throw new Error("Pool ID is required for pool donations");

          const [poolPDA] = deriveFundPoolPDA(disasterId, poolId);
          const [poolTokenAccountPDA] = derivePoolTokenAccountPDA(
            disasterId,
            poolId
          );
          const [_disasterPDA] = deriveDisasterPDA(disasterId);
          const [donationRecordPDA] = deriveDonationRecordPDA(
            wallet.publicKey,
            poolPDA,
            timestamp
          );
          const [configPDA] = derivePlatformConfigPDA();

          // Get connection
          const connection = program.provider.connection;

          // Get pool data to find the token mint it uses
          // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          const poolAccount = await (program.account as any).fundPool.fetch(
            poolPDA
          );
          const tokenMint = poolAccount.tokenMint;

          // Fetch the mint account to determine which token program it uses
          const mintInfo = await connection.getAccountInfo(tokenMint);
          if (!mintInfo) {
            throw new Error("Token mint not found");
          }

          // Determine the token program based on the mint's owner
          const mintTokenProgram = mintInfo.owner;

          // Get donor token account using the correct token program
          const donorTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            wallet.publicKey,
            false, // allowOwnerOffCurve
            mintTokenProgram // programId
          );

          // Check if donor token account exists
          const donorTokenAccountInfo = await connection.getAccountInfo(
            donorTokenAccount
          );

          // Derive activity log PDA
          const [activityLogPDA] = deriveActivityLogPDA(
            wallet.publicKey,
            timestamp
          );

          // Derive NGO PDA from pool authority (we already fetched poolAccount above)
          const [ngoPDA] = deriveNGOPDA(poolAccount.authority);

          // Get platform fee recipient token account
          const configAccount =
            await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
            (program.account as any).platformConfig.fetch(configPDA);
          const platformFeeRecipient = await getAssociatedTokenAddress(
            tokenMint,
            configAccount.platformFeeRecipient
          );

          // Check if donor token account exists
          if (!donorTokenAccountInfo) {
            throw new Error(
              `You don't have a ${data.token} token account yet. Please receive some ${data.token} first to create your token account, then try donating again.`
            );
          }

          // Now send the donation transaction
          const tx = await program.methods
            .donateToPool(
              disasterId,
              poolId,
              {
                amount: new BN(amountInSmallestUnit.toString()),
                message: data.message || "",
                isAnonymous: data.isAnonymous,
              },
              new BN(timestamp.toString())
            )
            .accounts({
              pool: poolPDA,
              poolTokenAccount: poolTokenAccountPDA,
              donationRecord: donationRecordPDA,
              donorTokenAccount,
              config: configPDA,
              platformFeeRecipient,
              activityLog: activityLogPDA,
              donor: wallet.publicKey,
              tokenProgram: mintTokenProgram,
            })
            .remainingAccounts([
              {
                pubkey: ngoPDA,
                isWritable: false,
                isSigner: false,
              },
            ])
            .rpc();

          return tx;
        }
      },
      {
        successMessage: `Donated ${data.amount} ${
          data.token === "SOL" ? "wSOL" : data.token
        } successfully`,
        onSuccess: () => {
          // Invalidate donations and pools queries to refetch data
          queryClient.invalidateQueries({ queryKey: ["donations"] });
          queryClient.invalidateQueries({ queryKey: ["pools"] });

          form.reset();
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] items-start">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="10.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="SOL">wSOL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <p className="text-sm text-muted-foreground">Minimum: 0.01</p>
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add a message of support..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Donate anonymously</FormLabel>
                <FormDescription>
                  Your wallet address will not be publicly displayed
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading
            ? "Processing..."
            : `Donate ${form.watch("amount") || 0} ${
                form.watch("token") === "SOL" ? "wSOL" : form.watch("token")
              }`}
        </Button>
      </form>
    </Form>
  );
}
