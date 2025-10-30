"use client";

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { AlertCircle, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParticleSystem } from "@/components/ui/particle-system";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useProgram } from "@/hooks/use-program";
import { useTransaction } from "@/hooks/use-transaction";
import { derivePlatformConfigPDA } from "@/lib/anchor/pdas";

export default function InitializePlatformPage() {
  const router = useRouter();
  const { program, wallet } = useProgram();
  const { submit, isLoading } = useTransaction();
  const [alreadyInitialized, setAlreadyInitialized] = useState(false);

  // Default values
  const [platformFeePercentage, setPlatformFeePercentage] = useState(100); // 1%
  const [verificationThreshold, setVerificationThreshold] = useState(3);
  const [maxVerifiers, setMaxVerifiers] = useState(5);
  const [minDonationAmount, setMinDonationAmount] = useState(0.01);
  const [maxDonationAmount, setMaxDonationAmount] = useState(1000000);
  const [usdcMint, setUsdcMint] = useState(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  ); // Devnet USDC
  const [platformName, setPlatformName] = useState("Sahara Administrator");
  const [platformVersion, setPlatformVersion] = useState("1.0.0");

  useEffect(() => {
    const checkIfInitialized = async () => {
      if (!program || !wallet.publicKey) return;

      try {
        const [configPDA] = derivePlatformConfigPDA();
        const accountInfo =
          await program.provider.connection.getAccountInfo(configPDA);
        setAlreadyInitialized(accountInfo !== null);
      } catch (_error) {
        // Account doesn't exist, not initialized
        setAlreadyInitialized(false);
      }
    };

    if (wallet.connected && program) {
      checkIfInitialized();
    }
  }, [wallet.connected, program, wallet.publicKey]);

  const handleInitialize = async () => {
    if (!program || !wallet.publicKey) return;

    const [configPDA] = derivePlatformConfigPDA();

    await submit(
      async () => {
        if (!wallet.publicKey) throw new Error("Wallet not connected");

        // Call the initialize_platform instruction
        // biome-ignore lint/suspicious/noExplicitAny: Anchor IDL types may not include all methods
        const tx = await (program.methods as any)
          .initializePlatform({
            platformFeePercentage,
            verificationThreshold,
            maxVerifiers,
            minDonationAmount: new BN(
              Math.floor(minDonationAmount * 1_000_000),
            ), // Convert to lamports
            maxDonationAmount: new BN(
              Math.floor(maxDonationAmount * 1_000_000),
            ),
            usdcMint: new PublicKey(usdcMint),
            platformName,
            platformVersion,
          })
          .accounts({
            config: configPDA,
            admin: wallet.publicKey,
          })
          .rpc();

        return tx;
      },
      {
        successMessage: "Platform initialized successfully! Refreshing page...",
        onSuccess: () => {
          // Refresh the page to reload with new platform config
          window.location.reload();
        },
        onError: (error) => {
          // If already initialized, redirect to admin page
          if (
            error.message.toLowerCase().includes("already in use") ||
            error.message.toLowerCase().includes("already initialized")
          ) {
            setTimeout(() => {
              router.push("/admin");
            }, 2000);
          }
        },
      },
    );
  };

  // Wallet not connected - Show hero with particle system
  if (!wallet.connected) {
    return (
      <div className="min-h-screen flex flex-col bg-theme-background">
        <main className="flex-1">
          {/* Hero Section with Particle System */}
          <section
            className="relative w-full bg-theme-background overflow-hidden"
            style={{ height: "100vh" }}
          >
            {/* Particle Background */}
            <div className="absolute inset-0 z-0">
              <ParticleSystem text="Admin" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center pointer-events-none">
              <div className="flex-1" />

              {/* Hero Content */}
              <div className="max-w-3xl mx-auto text-center space-y-6 pb-16 pointer-events-auto">
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                  Platform Initialization
                </h1>
                <p className="text-lg md:text-xl text-theme-text max-w-2xl mx-auto">
                  Initialize the SaharaSol platform and become the
                  administrator. Configure platform settings and manage disaster
                  relief operations.
                </p>
                <div className="flex flex-col items-center gap-4 pt-6">
                  <div className="scale-110">
                    <WalletButton />
                  </div>
                  <p className="text-sm text-theme-text/80">
                    Connect your wallet to initialize the platform
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Wallet connected - Split-screen design
  return (
    <div className="min-h-screen flex flex-col bg-theme-background">
      <main className="flex-1 flex">
        {/* Left Side - Particle Background (40%) */}
        <div className="hidden lg:flex lg:w-[40%] relative bg-linear-to-br from-theme-background to-theme-card-bg border-r border-theme-border">
          <div className="absolute inset-0">
            <ParticleSystem text="Admin" />
          </div>
        </div>

        {/* Right Side - Content (60%) */}
        <div className="flex-1 lg:w-[60%] flex items-center justify-center px-6 py-16 overflow-y-auto">
          <div className="max-w-2xl w-full space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-theme-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-theme-text-highlight">
                  {alreadyInitialized
                    ? "Platform Initialized"
                    : "Initialize Platform"}
                </h1>
              </div>
              <p className="text-lg text-theme-text">
                {alreadyInitialized
                  ? "The platform has already been initialized. You can access the admin dashboard."
                  : "Set up the SaharaSol platform. Your wallet will become the platform administrator."}
              </p>
            </div>

            {/* Wallet Address Display */}
            <div className="p-4 rounded-lg bg-theme-card-bg border border-theme-border">
              <p className="text-xs text-theme-text/60 mb-2 uppercase tracking-wide">
                Connected Wallet
              </p>
              <p className="text-sm font-mono text-theme-primary break-all">
                {wallet.publicKey?.toBase58()}
              </p>
            </div>

            {alreadyInitialized ? (
              <Alert className="border-theme-primary/50 bg-theme-primary/10">
                <AlertCircle className="h-4 w-4 text-theme-primary" />
                <AlertTitle className="text-theme-text-highlight">
                  Platform Already Initialized
                </AlertTitle>
                <AlertDescription className="text-theme-text">
                  The platform configuration already exists. You can proceed to
                  the admin dashboard to manage the platform.
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="bg-theme-card-bg border-theme-border">
                <CardHeader>
                  <CardTitle className="text-theme-text-highlight">
                    Platform Configuration
                  </CardTitle>
                  <CardDescription className="text-theme-text">
                    Configure the initial platform settings. These can be
                    updated later by the admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="platformName" className="text-theme-text">
                        Platform Name
                      </Label>
                      <Input
                        id="platformName"
                        value={platformName}
                        onChange={(e) => setPlatformName(e.target.value)}
                        className="bg-theme-background border-theme-border text-theme-text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="platformVersion"
                        className="text-theme-text"
                      >
                        Platform Version
                      </Label>
                      <Input
                        id="platformVersion"
                        value={platformVersion}
                        onChange={(e) => setPlatformVersion(e.target.value)}
                        className="bg-theme-background border-theme-border text-theme-text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="platformFee" className="text-theme-text">
                        Platform Fee (Basis Points)
                      </Label>
                      <Input
                        id="platformFee"
                        type="number"
                        value={platformFeePercentage}
                        onChange={(e) =>
                          setPlatformFeePercentage(Number(e.target.value))
                        }
                        className="bg-theme-background border-theme-border text-theme-text"
                      />
                      <p className="text-xs text-theme-text/60">
                        100 = 1%, 1000 = 10% (max)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="verificationThreshold"
                        className="text-theme-text"
                      >
                        Verification Threshold
                      </Label>
                      <Input
                        id="verificationThreshold"
                        type="number"
                        min="1"
                        max={maxVerifiers}
                        value={verificationThreshold}
                        onChange={(e) =>
                          setVerificationThreshold(Number(e.target.value))
                        }
                        className="bg-theme-background border-theme-border text-theme-text"
                      />
                      <p className="text-xs text-theme-text/60">
                        Required approvals (3 of 5 recommended)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxVerifiers" className="text-theme-text">
                        Max Verifiers
                      </Label>
                      <Input
                        id="maxVerifiers"
                        type="number"
                        min={verificationThreshold}
                        value={maxVerifiers}
                        onChange={(e) =>
                          setMaxVerifiers(Number(e.target.value))
                        }
                        className="bg-theme-background border-theme-border text-theme-text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minDonation" className="text-theme-text">
                        Min Donation (USDC)
                      </Label>
                      <Input
                        id="minDonation"
                        type="number"
                        step="0.01"
                        value={minDonationAmount}
                        onChange={(e) =>
                          setMinDonationAmount(Number(e.target.value))
                        }
                        className="bg-theme-background border-theme-border text-theme-text"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxDonation" className="text-theme-text">
                        Max Donation (USDC)
                      </Label>
                      <Input
                        id="maxDonation"
                        type="number"
                        value={maxDonationAmount}
                        onChange={(e) =>
                          setMaxDonationAmount(Number(e.target.value))
                        }
                        className="bg-theme-background border-theme-border text-theme-text"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="usdcMint" className="text-theme-text">
                        USDC Mint Address
                      </Label>
                      <Input
                        id="usdcMint"
                        value={usdcMint}
                        onChange={(e) => setUsdcMint(e.target.value)}
                        placeholder="Enter USDC mint address..."
                        className="font-mono text-sm bg-theme-background border-theme-border text-theme-text"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setUsdcMint(
                              "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
                            )
                          }
                        >
                          USDC (Devnet)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setUsdcMint(
                              "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                            )
                          }
                        >
                          USDC (Mainnet)
                        </Button>
                      </div>
                      <p className="text-xs text-theme-text/60">
                        SPL Token mint address for USDC - use quick buttons or
                        enter custom address
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA Button */}
            <div className="space-y-4">
              <Button
                onClick={
                  alreadyInitialized
                    ? () => router.push("/admin")
                    : handleInitialize
                }
                disabled={isLoading}
                size="lg"
                className="w-full text-base"
              >
                {isLoading
                  ? "Initializing..."
                  : alreadyInitialized
                    ? "Go to Admin Dashboard"
                    : "Initialize Platform"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
