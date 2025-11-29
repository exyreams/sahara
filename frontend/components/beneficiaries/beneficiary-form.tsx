"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import BN from "bn.js";
import { AlertTriangle } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Button } from "@/components/ui/button";
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
import { useDisasters } from "@/hooks/use-disasters";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveActivityLogPDA,
  deriveBeneficiaryPDA,
  deriveDisasterPDA,
  deriveFieldWorkerPDA,
  deriveNationalIdRegistryPDA,
  derivePhoneRegistryPDA,
  derivePlatformConfigPDA,
} from "@/lib/anchor/pdas";
import { NEPAL_DISTRICTS } from "@/lib/constants";
import { type BeneficiaryFormData, beneficiaryFormSchema } from "@/types/forms";

import type { Beneficiary } from "@/types/program";

interface BeneficiaryFormProps {
  disasterId?: string;
  beneficiary?: Beneficiary; // Optional: if provided, form is in edit mode
  onSuccess?: () => void;
}

export function BeneficiaryForm({
  disasterId,
  beneficiary,
  onSuccess,
}: BeneficiaryFormProps) {
  const isEditMode = !!beneficiary;
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const { disasters } = useDisasters();
  const queryClient = useQueryClient();
  const [isFieldWorker, setIsFieldWorker] = React.useState<boolean | null>(
    null,
  );

  // Check if user is a field worker
  React.useEffect(() => {
    const checkFieldWorker = async () => {
      if (!program || !wallet.publicKey) {
        setIsFieldWorker(null);
        return;
      }

      try {
        const [fieldWorkerPDA] = deriveFieldWorkerPDA(wallet.publicKey);
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        await (program.account as any).fieldWorker.fetch(fieldWorkerPDA);
        setIsFieldWorker(true);
      } catch {
        setIsFieldWorker(false);
      }
    };

    checkFieldWorker();
  }, [program, wallet.publicKey]);

  // Filter only active disasters
  const activeDisasters = disasters.filter((d) => d.isActive);

  // Prepare disaster options for autocomplete
  const disasterOptions = activeDisasters.map((disaster) => ({
    value: disaster.eventId,
    label: `${disaster.name} (${disaster.eventId})`,
  }));

  const form = useForm({
    resolver: zodResolver(beneficiaryFormSchema),
    defaultValues:
      isEditMode && beneficiary
        ? {
            walletAddress: beneficiary.authority.toBase58(),
            disasterId: beneficiary.disasterId,
            name: beneficiary.name,
            phone: beneficiary.phoneNumber,
            latitude: beneficiary.location.latitude,
            longitude: beneficiary.location.longitude,
            district: beneficiary.location.district,
            ward: beneficiary.location.ward,
            address: "",
            familySize: beneficiary.familySize,
            damageSeverity: beneficiary.damageSeverity,
            nationalId: beneficiary.nationalId,
            age: beneficiary.age,
            gender: beneficiary.gender,
            occupation: beneficiary.occupation || "",
            damageDescription: beneficiary.damageDescription || "",
            specialNeeds: beneficiary.specialNeeds || "",
          }
        : {
            walletAddress: "",
            disasterId: disasterId || "",
            name: "",
            phone: "",
            latitude: 27.7172,
            longitude: 85.324,
            district: "Kathmandu",
            ward: 1,
            address: "",
            familySize: 1,
            damageSeverity: 5,
            nationalId: "",
            age: 0,
            gender: "",
            occupation: "",
            damageDescription: "",
            specialNeeds: "",
          },
  });

  const onSubmit = async (data: BeneficiaryFormData) => {
    if (!program || !wallet.publicKey) return;

    // Handle edit mode
    if (isEditMode && beneficiary) {
      await submit(
        async () => {
          // Build params with all fields (null if not changed)
          const params = {
            name: data.name !== beneficiary.name ? data.name : null,
            phoneNumber:
              data.phone !== beneficiary.phoneNumber ? data.phone : null,
            location:
              data.district !== beneficiary.location.district ||
              data.ward !== beneficiary.location.ward
                ? {
                    district: data.district,
                    ward: data.ward,
                    latitude: data.latitude,
                    longitude: data.longitude,
                  }
                : null,
            familySize:
              data.familySize !== beneficiary.familySize
                ? data.familySize
                : null,
            damageSeverity:
              data.damageSeverity !== beneficiary.damageSeverity
                ? data.damageSeverity
                : null,
            age: data.age !== beneficiary.age ? data.age : null,
            gender: data.gender !== beneficiary.gender ? data.gender : null,
            occupation:
              data.occupation !== beneficiary.occupation
                ? data.occupation
                : null,
            ipfsDocumentHash: null, // Not editable in form
            damageDescription:
              data.damageDescription !== beneficiary.damageDescription
                ? data.damageDescription
                : null,
            specialNeeds:
              data.specialNeeds !== beneficiary.specialNeeds
                ? data.specialNeeds
                : null,
          };

          // The connected wallet must be the field worker who registered the beneficiary
          const walletPublicKey = wallet.publicKey;
          if (!walletPublicKey) throw new Error("Wallet not connected");
          const [fieldWorkerPDA] = deriveFieldWorkerPDA(walletPublicKey);

          const tx = await program.methods
            .updateBeneficiary(
              beneficiary.authority,
              beneficiary.disasterId,
              params,
            )
            .accounts({
              beneficiary: beneficiary.publicKey,
              fieldWorker: fieldWorkerPDA,
              fieldWorkerAuthority: walletPublicKey,
            })
            .rpc();

          return tx;
        },
        {
          successMessage: "Beneficiary updated successfully",
          onSuccess: () => {
            // Invalidate beneficiaries query to refetch data
            queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });

            onSuccess?.();
          },
        },
      );
      return;
    }

    // Handle create mode
    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        // Validate beneficiary wallet address
        let beneficiaryAuthority: PublicKey;
        try {
          beneficiaryAuthority = new PublicKey(data.walletAddress);
        } catch (_error) {
          throw new Error(
            "Invalid wallet address. Please enter a valid Solana wallet address.",
          );
        }

        // Check if beneficiary wallet exists and has SOL
        try {
          const beneficiaryAccountInfo =
            await program.provider.connection.getAccountInfo(
              beneficiaryAuthority,
            );
          if (!beneficiaryAccountInfo) {
            throw new Error(
              "Beneficiary wallet address does not exist on the blockchain. The wallet must be created first (by receiving SOL or tokens).",
            );
          }
          const balance =
            await program.provider.connection.getBalance(beneficiaryAuthority);
          console.log("Beneficiary wallet balance:", balance / 1e9, "SOL");
          if (balance === 0) {
            console.warn("Warning: Beneficiary wallet has 0 SOL balance");
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message?.includes("does not exist")
          ) {
            throw error;
          }
          console.error("Error checking beneficiary wallet:", error);
        }

        // Check if field worker account exists
        const [fieldWorkerPDA] = deriveFieldWorkerPDA(wallet.publicKey);
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        let fieldWorkerAccount: any;
        try {
          // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          fieldWorkerAccount = await (program.account as any).fieldWorker.fetch(
            fieldWorkerPDA,
          );
          console.log("Field Worker Account:", fieldWorkerAccount);
        } catch (error) {
          console.error("Field Worker fetch error:", error);
          throw new Error(
            "Field worker account not found. Please register as a field worker first.",
          );
        }

        // Check if field worker is active
        if (!fieldWorkerAccount.isActive) {
          throw new Error(
            "Your field worker account is not active. Please contact your NGO administrator.",
          );
        }

        // Check if field worker's NGO exists
        if (fieldWorkerAccount.ngo) {
          try {
            // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
            const ngoAccount = await (program.account as any).ngo.fetch(
              fieldWorkerAccount.ngo,
            );
            console.log("NGO Account:", ngoAccount);

            if (!ngoAccount.isVerified) {
              throw new Error(
                "Your NGO is not verified. Only verified NGOs can register beneficiaries.",
              );
            }
          } catch (error) {
            console.error("NGO fetch error:", error);
            throw new Error(
              "Field worker's NGO account not found. Please contact your administrator.",
            );
          }
        }

        const [beneficiaryPDA] = deriveBeneficiaryPDA(
          beneficiaryAuthority,
          data.disasterId,
        );
        const [disasterPDA] = deriveDisasterPDA(data.disasterId);
        const [configPDA] = derivePlatformConfigPDA();

        // Verify disaster exists and is active
        // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
        let disasterAccount: any;
        try {
          // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          disasterAccount = await (program.account as any).disasterEvent.fetch(
            disasterPDA,
          );
          console.log("Disaster Account:", disasterAccount);
        } catch (error) {
          console.error("Disaster fetch error:", error);
          throw new Error(
            `Disaster "${data.disasterId}" not found on blockchain. Please select a valid disaster.`,
          );
        }

        if (!disasterAccount.isActive) {
          throw new Error(
            `Disaster "${data.disasterId}" is not active. Please select an active disaster.`,
          );
        }

        // Verify platform config exists
        try {
          // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          await (program.account as any).platformConfig.fetch(configPDA);
        } catch (error) {
          console.error("Platform config fetch error:", error);
          throw new Error(
            "Platform configuration not found. Please contact the administrator.",
          );
        }

        // Check if beneficiary already exists
        try {
          const existingBeneficiary =
            await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
            (program.account as any).beneficiary.fetch(beneficiaryPDA);
          if (existingBeneficiary) {
            throw new Error(
              `A beneficiary with this wallet address already exists for disaster "${data.disasterId}".`,
            );
          }
        } catch (error) {
          // If account doesn't exist, that's what we want
          if (
            !(error instanceof Error) ||
            !error.message?.includes("Account does not exist")
          ) {
            throw error;
          }
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const [activityLogPDA] = deriveActivityLogPDA(
          wallet.publicKey,
          timestamp,
        );
        const [phoneRegistryPDA] = derivePhoneRegistryPDA(
          data.disasterId,
          data.phone,
        );
        const [nationalIdRegistryPDA] = deriveNationalIdRegistryPDA(
          data.disasterId,
          data.nationalId,
        );

        console.log("All accounts verified. Proceeding with registration...");
        console.log("Beneficiary PDA:", beneficiaryPDA.toString());
        console.log("Disaster PDA:", disasterPDA.toString());
        console.log("Field Worker PDA:", fieldWorkerPDA.toString());
        console.log("Config PDA:", configPDA.toString());
        console.log("Activity Log PDA:", activityLogPDA.toString());
        console.log("Phone Registry PDA:", phoneRegistryPDA.toString());
        console.log(
          "National ID Registry PDA:",
          nationalIdRegistryPDA.toString(),
        );

        const params = {
          disasterId: data.disasterId,
          name: data.name,
          phoneNumber: data.phone,
          location: {
            district: data.district,
            ward: data.ward,
            latitude: data.latitude,
            longitude: data.longitude,
          },
          familySize: data.familySize,
          damageSeverity: data.damageSeverity,
          ipfsDocumentHash: data.ipfsDocumentHash || "",
          householdId: data.householdId || null,
          nationalId: data.nationalId,
          age: data.age,
          gender: data.gender,
          occupation: data.occupation,
          damageDescription: data.damageDescription,
          specialNeeds: data.specialNeeds,
        };

        console.log("Sending transaction with accounts:");
        console.log(
          JSON.stringify(
            {
              beneficiary: beneficiaryPDA.toString(),
              disaster: disasterPDA.toString(),
              fieldWorker: fieldWorkerPDA.toString(),
              phoneRegistry: phoneRegistryPDA.toString(),
              nationalIdRegistry: nationalIdRegistryPDA.toString(),
              config: configPDA.toString(),
              activityLog: activityLogPDA.toString(),
              authority: beneficiaryAuthority.toString(),
              fieldWorkerAuthority: wallet.publicKey.toString(),
              payer: wallet.publicKey.toString(),
            },
            null,
            2,
          ),
        );

        // If field worker has an NGO, we need to pass the NGO PDA as a remaining account
        const remainingAccounts = [];
        if (fieldWorkerAccount.ngo) {
          // The field worker's 'ngo' field is already the NGO PDA
          console.log(
            "Adding NGO PDA as remaining account:",
            fieldWorkerAccount.ngo.toString(),
          );
          remainingAccounts.push({
            pubkey: fieldWorkerAccount.ngo,
            isWritable: false,
            isSigner: false,
          });
        }

        try {
          const tx = await program.methods
            .registerBeneficiary(params, new BN(timestamp))
            .accounts({
              beneficiary: beneficiaryPDA,
              disaster: disasterPDA,
              fieldWorker: fieldWorkerPDA,
              phoneRegistry: phoneRegistryPDA,
              nationalIdRegistry: nationalIdRegistryPDA,
              config: configPDA,
              activityLog: activityLogPDA,
              authority: beneficiaryAuthority,
              fieldWorkerAuthority: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .remainingAccounts(remainingAccounts)
            .rpc();

          return tx;
        } catch (error) {
          console.error("Transaction error:", error);
          console.error(
            "Error logs:",
            error instanceof Error ? error : "Unknown error",
          );
          throw error;
        }
      },
      {
        successMessage: "Beneficiary registered successfully",
        onSuccess: () => {
          // Invalidate beneficiaries query to refetch data
          queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });

          form.reset();
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Field Worker Warning */}
        {isFieldWorker === false && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                  Field Worker Access Required
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Only field workers can register beneficiaries. Please visit
                  the{" "}
                  <a
                    href="/ngo/field-workers"
                    className="underline font-medium hover:text-red-900 dark:hover:text-red-100"
                  >
                    Field Workers page
                  </a>{" "}
                  to register as a field worker first.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disaster ID - First (with autocomplete) */}
        <FormField
          control={form.control}
          name="disasterId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Disaster Event</FormLabel>
              <FormControl>
                <AutocompleteInput
                  value={field.value}
                  onChange={field.onChange}
                  options={disasterOptions}
                  placeholder="Type or select disaster..."
                  disabled={!!disasterId}
                />
              </FormControl>
              <FormDescription>
                The disaster event this beneficiary is associated with
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Wallet Address & Damage Severity */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="walletAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wallet Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Solana wallet address"
                    {...field}
                    disabled={isEditMode}
                  />
                </FormControl>
                <FormDescription>
                  {isEditMode
                    ? "Wallet address cannot be changed"
                    : "Beneficiary's Solana wallet"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="damageSeverity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Damage Severity (1-10)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  1 = Minor damage, 10 = Complete destruction
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Full Name{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/100)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" maxLength={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+977 1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* National ID, District, Ward, Age */}
        <div className="grid gap-4 md:grid-cols-12">
          <FormField
            control={form.control}
            name="nationalId"
            render={({ field }) => (
              <FormItem className="md:col-span-4">
                <FormLabel>National ID</FormLabel>
                <FormControl>
                  <Input placeholder="ID Number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem className="md:col-span-4">
                <FormLabel>District</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NEPAL_DISTRICTS.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ward"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Ward</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={50}
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
            name="age"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={150}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Gender, Occupation & Family Size */}
        <div className="grid gap-4 md:grid-cols-12">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>Gender</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="occupation"
            render={({ field }) => (
              <FormItem className="md:col-span-6">
                <FormLabel>
                  Occupation (Optional){" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/100)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Farmer, Teacher, etc."
                    maxLength={100}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="familySize"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>Family Size</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Address, Latitude, Longitude */}
        <div className="grid gap-4 md:grid-cols-12">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="md:col-span-6">
                <FormLabel>
                  Address{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/200)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Specific location details"
                    maxLength={200}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.000001"
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
            name="longitude"
            render={({ field }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.000001"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="damageDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Damage Description{" "}
                <span className="text-xs text-muted-foreground">
                  ({field.value?.length || 0}/500)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the damage to property..."
                  className="resize-none"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialNeeds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Special Needs (Optional){" "}
                <span className="text-xs text-muted-foreground">
                  ({field.value?.length || 0}/500)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Medical conditions, disabilities, etc."
                  className="resize-none"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isLoading || (isEditMode ? false : isFieldWorker === false)}
          className="w-full"
        >
          {isLoading
            ? isEditMode
              ? "Updating..."
              : "Registering..."
            : isEditMode
              ? "Update Beneficiary"
              : "Register Beneficiary"}
        </Button>
      </form>
    </Form>
  );
}
