"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { type PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import {
  deriveActivityLogPDA,
  deriveDisasterPDA,
  deriveNGOPDA,
  derivePlatformConfigPDA,
} from "@/lib/anchor/pdas";
import { DISASTER_TYPES, NEPAL_DISTRICTS } from "@/lib/constants";
import { type DisasterFormData, disasterFormSchema } from "@/types/forms";

import type { DisasterEvent } from "@/types/program";

interface DisasterFormProps {
  onSuccess?: () => void;
  disaster?: DisasterEvent;
  mode?: "create" | "edit";
}

export function DisasterForm({
  onSuccess,
  disaster,
  mode = "create",
}: DisasterFormProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const queryClient = useQueryClient();

  const isEditMode = mode === "edit" && !!disaster;

  // Local state for affected areas text input
  const [affectedAreasText, setAffectedAreasText] = useState(
    disaster?.affectedAreas.join(", ") || ""
  );

  const form = useForm({
    resolver: zodResolver(disasterFormSchema),
    defaultValues: isEditMode
      ? {
          eventId: disaster.eventId,
          name: disaster.name,
          eventType: disaster.eventType,
          severity: disaster.severity,
          latitude: disaster.location.latitude,
          longitude: disaster.location.longitude,
          district: disaster.location.district,
          ward: disaster.location.ward,
          address: "",
          affectedAreas: disaster.affectedAreas,
          description: disaster.description,
          estimatedAffectedPopulation: disaster.estimatedAffectedPopulation,
        }
      : {
          eventId: "",
          name: "",
          eventType: "Earthquake",
          severity: 5,
          latitude: 27.7172,
          longitude: 85.324,
          district: "Kathmandu",
          ward: 1,
          address: "",
          affectedAreas: [],
          description: "",
          estimatedAffectedPopulation: 0,
        },
  });

  const onSubmit = async (data: DisasterFormData) => {
    if (!program || !wallet.publicKey) {
      return;
    }

    const authority = wallet.publicKey;

    await submit(
      async () => {
        // Generate timestamp for activity log
        const timestamp = Math.floor(Date.now() / 1000);

        const [disasterPDA] = deriveDisasterPDA(data.eventId);
        const [activityLogPDA] = deriveActivityLogPDA(authority, timestamp);

        // Handle update mode
        if (isEditMode) {
          const tx = await program.methods
            .updateDisaster(data.eventId, new BN(timestamp), {
              name: data.name,
              severity: data.severity,
              isActive: null,
              affectedAreas: data.affectedAreas,
              description: data.description,
              estimatedAffectedPopulation: data.estimatedAffectedPopulation,
            })
            .accounts({
              disaster: disasterPDA,
              activityLog: activityLogPDA,
              authority,
              systemProgram: SystemProgram.programId,
            })
            .rpc();

          return tx;
        }

        // Handle create mode
        const [configPDA] = derivePlatformConfigPDA();
        const [ngoPDA] = deriveNGOPDA(authority);

        // Check if user is admin
        const configAccount =
          await // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
          (program.account as any).platformConfig.fetch(configPDA);
        const isAdmin = configAccount.admin.toBase58() === authority.toBase58();

        // Build remaining accounts - pass NGO account if not admin
        const remainingAccounts: Array<{
          pubkey: PublicKey;
          isSigner: boolean;
          isWritable: boolean;
        }> = [];

        if (!isAdmin) {
          // Verify NGO account exists and is valid before proceeding
          try {
            // biome-ignore lint/suspicious/noExplicitAny: Anchor account types are dynamic
            const ngoAccount = await (program.account as any).ngo.fetch(ngoPDA);

            if (!ngoAccount.isVerified) {
              throw new Error(
                "Your NGO is not verified yet. Please wait for admin verification."
              );
            }
            if (!ngoAccount.isActive) {
              throw new Error("Your NGO account is not active.");
            }
            if (ngoAccount.isBlacklisted) {
              throw new Error("Your NGO has been blacklisted.");
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to validate NGO account";
            throw new Error(errorMessage);
          }

          // For non-admin users, we must pass the NGO account
          // The program will validate it exists and is verified
          remainingAccounts.push({
            pubkey: ngoPDA,
            isSigner: false,
            isWritable: false,
          });
        }

        // Build and send the instruction
        const tx = await program.methods
          .initializeDisaster(
            {
              eventId: data.eventId,
              name: data.name,
              eventType: { [data.eventType.toLowerCase()]: {} },
              location: {
                district: data.district,
                ward: data.ward,
                latitude: data.latitude,
                longitude: data.longitude,
              },
              severity: data.severity,
              affectedAreas: data.affectedAreas,
              description: data.description,
              estimatedAffectedPopulation: data.estimatedAffectedPopulation,
            },
            new BN(timestamp)
          )
          .accounts({
            disaster: disasterPDA,
            config: configPDA,
            activityLog: activityLogPDA,
            authority,
            systemProgram: SystemProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .rpc();

        return tx;
      },
      {
        successMessage: isEditMode
          ? "Disaster event updated successfully"
          : "Disaster event created successfully",
        onSuccess: () => {
          // Invalidate disasters query to refetch data
          queryClient.invalidateQueries({ queryKey: ["disasters"] });

          if (!isEditMode) {
            form.reset();
          }
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Event ID & Severity - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="eventId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Event ID{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/32)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="earthquake-2025-01"
                    maxLength={32}
                    {...field}
                    disabled={isEditMode}
                  />
                </FormControl>
                <FormDescription>
                  {isEditMode
                    ? "Event ID cannot be changed"
                    : "Unique identifier for this disaster"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity (1-10)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>1 = Low, 10 = Critical</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Disaster Name & Estimated Affected Population - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Disaster Name{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/100)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Kathmandu Earthquake 2025"
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
            name="estimatedAffectedPopulation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Affected Population</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Number of people affected"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Both Dropdowns - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disaster Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DISASTER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
            name="district"
            render={({ field }) => (
              <FormItem>
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
        </div>

        {/* Specific Address & Ward Number - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Specific Address{" "}
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
            name="ward"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ward Number</FormLabel>
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

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
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
              <FormItem>
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description{" "}
                <span className="text-xs text-muted-foreground">
                  ({field.value?.length || 0}/500)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the disaster event and its impact..."
                  className="min-h-[100px]"
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
          name="affectedAreas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Affected Areas (Optional){" "}
                <span className="text-xs text-muted-foreground">
                  ({affectedAreasText.length}/500)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter affected areas separated by commas (e.g., Kathmandu Valley, Pokhara, Chitwan)"
                  className="min-h-[80px]"
                  maxLength={500}
                  value={affectedAreasText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAffectedAreasText(value);
                    // Convert to array for form state
                    const areas = value
                      .split(",")
                      .map((area) => area.trim())
                      .filter((area) => area.length > 0);
                    field.onChange(areas);
                  }}
                />
              </FormControl>
              <FormDescription>
                List specific areas, villages, or regions affected by this
                disaster
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
            ? "Update Disaster Event"
            : "Create Disaster Event"}
        </Button>
      </form>
    </Form>
  );
}
