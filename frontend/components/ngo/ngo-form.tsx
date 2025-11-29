"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import BN from "bn.js";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { deriveNGOPDA, derivePlatformConfigPDA } from "@/lib/anchor/pdas";
import { NEPAL_DISTRICTS, NGO_FOCUS_AREAS, NGO_LIMITS } from "@/lib/constants";
import { type NGOFormData, ngoFormSchema } from "@/types/forms";
import type { NGO } from "@/types/program";

interface NGOFormProps {
  onSuccess?: () => void;
  ngo?: NGO | null;
  mode?: "create" | "edit";
}

export function NGOForm({ onSuccess, ngo, mode = "create" }: NGOFormProps) {
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
  const [pendingData, setPendingData] = useState<NGOFormData | null>(null);

  const form = useForm({
    resolver: zodResolver(ngoFormSchema),
    defaultValues: {
      name: "",
      registrationNumber: "",
      email: "",
      phoneNumber: "",
      website: "",
      description: "",
      address: "",
      verificationDocuments: "",
      operatingDistricts: [],
      focusAreas: [],
      contactPersonName: "",
      contactPersonRole: "",
      bankAccountInfo: "",
      taxId: "",
    },
  });

  // Populate form with existing NGO data in edit mode
  useEffect(() => {
    if (mode === "edit" && ngo) {
      form.reset({
        name: ngo.name,
        registrationNumber: ngo.registrationNumber,
        email: ngo.email,
        phoneNumber: ngo.phoneNumber,
        website: ngo.website || "",
        description: ngo.description || "",
        address: ngo.address,
        verificationDocuments: ngo.verificationDocuments || "",
        operatingDistricts: ngo.operatingDistricts,
        focusAreas: ngo.focusAreas,
        contactPersonName: ngo.contactPersonName,
        contactPersonRole: ngo.contactPersonRole,
        bankAccountInfo: ngo.bankAccountInfo || "",
        taxId: ngo.taxId || "",
      });
    }
  }, [mode, ngo, form]);

  const handleFormSubmit = (data: NGOFormData) => {
    // In edit mode, show warning dialog first
    if (mode === "edit") {
      setPendingData(data);
      setShowWarning(true);
      return;
    }

    // In create mode, submit directly
    onSubmit(data);
  };

  const onSubmit = async (data: NGOFormData) => {
    if (!program || !wallet.publicKey) return;

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        const [ngoPDA] = deriveNGOPDA(wallet.publicKey);
        const [configPDA] = derivePlatformConfigPDA();
        const timestamp = Math.floor(Date.now() / 1000);

        let tx: string;

        if (mode === "edit") {
          // Use updateNgo instruction for edit mode
          // Derive activity log PDA
          const [activityLogPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("activity"),
              wallet.publicKey.toBuffer(),
              Buffer.from(
                new Uint8Array(new BigInt64Array([BigInt(timestamp)]).buffer),
              ),
            ],
            program.programId,
          );

          tx = await program.methods
            .updateNgo(
              {
                name: data.name,
                email: data.email,
                phoneNumber: data.phoneNumber,
                website: data.website || null,
                description: data.description || null,
                address: data.address,
                verificationDocuments: data.verificationDocuments || null,
                operatingDistricts: data.operatingDistricts,
                focusAreas: data.focusAreas,
                contactPersonName: data.contactPersonName,
                contactPersonRole: data.contactPersonRole,
                bankAccountInfo: data.bankAccountInfo || null,
                taxId: data.taxId || null,
              },
              new BN(timestamp),
            )
            .accounts({
              ngo: ngoPDA,
              activityLog: activityLogPDA,
              config: configPDA,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
        } else {
          // Use registerNgo instruction for create mode
          tx = await program.methods
            .registerNgo({
              name: data.name,
              registrationNumber: data.registrationNumber,
              email: data.email,
              phoneNumber: data.phoneNumber,
              website: data.website || "",
              description: data.description || "",
              address: data.address,
              verificationDocuments: data.verificationDocuments || "",
              operatingDistricts: data.operatingDistricts,
              focusAreas: data.focusAreas,
              contactPersonName: data.contactPersonName,
              contactPersonRole: data.contactPersonRole,
              bankAccountInfo: data.bankAccountInfo || "",
              taxId: data.taxId || "",
            })
            .accounts({
              ngo: ngoPDA,
              config: configPDA,
              authority: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
        }

        return tx;
      },
      {
        successMessage:
          mode === "edit"
            ? "NGO updated successfully. Pending admin verification."
            : "NGO registered successfully",
        onSuccess: () => {
          // Invalidate NGO queries to refetch data
          queryClient.invalidateQueries({ queryKey: ["ngo"] });
          queryClient.invalidateQueries({ queryKey: ["ngos"] });

          // Small delay before calling parent onSuccess to ensure transaction is fully processed
          setTimeout(() => {
            if (mode === "create") {
              form.reset();
            }
            onSuccess?.();
          }, 50);
        },
      },
    );
  };

  const handleConfirmUpdate = async () => {
    setShowWarning(false);
    if (pendingData) {
      // Small delay to ensure warning dialog is fully closed
      await new Promise((resolve) => setTimeout(resolve, 100));
      onSubmit(pendingData);
      setPendingData(null);
    }
  };

  const handleCancelUpdate = () => {
    setShowWarning(false);
    setPendingData(null);
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Organization Name{" "}
                    <span className="text-xs text-muted-foreground">
                      ({field.value?.length || 0}/150)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Sahara Foundation Society"
                      maxLength={150}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Registration Number{" "}
                    <span className="text-xs text-muted-foreground">
                      ({field.value?.length || 0}/50)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="REG-12345" maxLength={50} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email{" "}
                    <span className="text-xs text-muted-foreground">
                      ({field.value?.length || 0}/100)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@ngo.org"
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
              name="phoneNumber"
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

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Website (Optional){" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/100)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://ngo.org"
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
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Address{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/300)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Kathmandu, Nepal"
                    maxLength={300}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Description{" "}
                  <span className="text-xs text-muted-foreground">
                    ({field.value?.length || 0}/1000)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of your organization..."
                    className="min-h-[120px]"
                    maxLength={1000}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="operatingDistricts"
            render={() => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Operating Districts</FormLabel>
                  <span className="text-sm text-muted-foreground">
                    {form.watch("operatingDistricts")?.length || 0}/
                    {NGO_LIMITS.MAX_DISTRICTS} selected
                  </span>
                </div>
                <FormDescription>
                  Select districts where your NGO operates (minimum 1, maximum{" "}
                  {NGO_LIMITS.MAX_DISTRICTS})
                </FormDescription>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto border rounded-md p-4">
                  {NEPAL_DISTRICTS.map((district) => (
                    <FormField
                      key={district}
                      control={form.control}
                      name="operatingDistricts"
                      render={({ field }) => {
                        const isChecked = field.value?.includes(district);
                        const isDisabled =
                          !isChecked &&
                          (field.value?.length || 0) >=
                            NGO_LIMITS.MAX_DISTRICTS;

                        return (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={isChecked}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, district])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value: string) => value !== district,
                                        ),
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel
                              className={`text-sm font-normal cursor-pointer ${
                                isDisabled ? "text-muted-foreground" : ""
                              }`}
                            >
                              {district}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="focusAreas"
            render={() => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Focus Areas</FormLabel>
                  <span className="text-sm text-muted-foreground">
                    {form.watch("focusAreas")?.length || 0}/
                    {NGO_LIMITS.MAX_FOCUS_AREAS} selected
                  </span>
                </div>
                <FormDescription>
                  Select your organization's areas of focus (minimum 1, maximum{" "}
                  {NGO_LIMITS.MAX_FOCUS_AREAS})
                </FormDescription>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {NGO_FOCUS_AREAS.map((area) => (
                    <FormField
                      key={area}
                      control={form.control}
                      name="focusAreas"
                      render={({ field }) => {
                        const isChecked = field.value?.includes(area);
                        const isDisabled =
                          !isChecked &&
                          (field.value?.length || 0) >=
                            NGO_LIMITS.MAX_FOCUS_AREAS;

                        return (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={isChecked}
                                disabled={isDisabled}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, area])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value: string) => value !== area,
                                        ),
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel
                              className={`text-sm font-normal cursor-pointer ${
                                isDisabled ? "text-muted-foreground" : ""
                              }`}
                            >
                              {area}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contactPersonName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contact Person Name{" "}
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
              name="contactPersonRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contact Person Role{" "}
                    <span className="text-xs text-muted-foreground">
                      ({field.value?.length || 0}/100)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Executive Director"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading
              ? mode === "edit"
                ? "Updating..."
                : "Registering..."
              : mode === "edit"
                ? "Update NGO"
                : "Register NGO"}
          </Button>
        </form>
      </Form>

      {/* Warning Dialog for Edit Mode */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Important: Verification Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="text-base font-medium text-theme-text">
                Updating your NGO information will have the following effects:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-theme-text/80">
                <li>
                  Your NGO verification status will be set to{" "}
                  <span className="font-semibold text-yellow-600">Pending</span>
                </li>
                <li>
                  All NGO operations will be{" "}
                  <span className="font-semibold text-red-600">
                    temporarily halted
                  </span>{" "}
                  until admin re-verification
                </li>
                <li>
                  Field workers will not be able to register new beneficiaries
                </li>
                <li>You will not be able to create new fund pools</li>
                <li>Existing operations will continue normally</li>
              </ul>
              <p className="text-sm text-theme-text/80 pt-2">
                The platform administrator will review your updated information.
                Once verified, all operations will resume.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUpdate}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUpdate}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              I Understand, Update NGO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
