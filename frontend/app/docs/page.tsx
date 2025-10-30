"use client";

import {
  Book,
  Code,
  DollarSign,
  FileText,
  Heart,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DocsPage() {
  const [_activeSection, _setActiveSection] = useState("getting-started");

  return (
    <div className="min-h-screen flex flex-col bg-theme-bg">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-theme-card-bg border-b border-theme-border py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Book className="h-16 w-16 text-theme-primary mx-auto mb-4" />
              <h1 className="text-4xl font-bold tracking-tight text-theme-text-highlight mb-4">
                Documentation
              </h1>
              <p className="text-lg text-theme-text">
                Everything you need to know about using Sahara platform
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="getting-started" className="space-y-8">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                <TabsTrigger value="getting-started" className="py-3">
                  Getting Started
                </TabsTrigger>
                <TabsTrigger value="donors" className="py-3">
                  For Donors
                </TabsTrigger>
                <TabsTrigger value="ngos" className="py-3">
                  For NGOs
                </TabsTrigger>
                <TabsTrigger value="developers" className="py-3">
                  For Developers
                </TabsTrigger>
              </TabsList>

              {/* Getting Started */}
              <TabsContent value="getting-started" className="space-y-6">
                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-theme-primary" />
                      Setting Up Your Wallet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        1. Install a Solana Wallet
                      </h4>
                      <p className="text-sm mb-2">
                        You'll need a Solana wallet to interact with the
                        platform. We recommend:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>
                          <a
                            href="https://phantom.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-theme-primary hover:underline"
                          >
                            Phantom Wallet
                          </a>{" "}
                          (Recommended for beginners)
                        </li>
                        <li>
                          <a
                            href="https://solflare.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-theme-primary hover:underline"
                          >
                            Solflare
                          </a>
                        </li>
                        <li>
                          <a
                            href="https://backpack.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-theme-primary hover:underline"
                          >
                            Backpack
                          </a>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        2. Get Some USDC
                      </h4>
                      <p className="text-sm">
                        Donations on Sahara are made in USDC (USD Coin), a
                        stablecoin pegged to the US Dollar. You can purchase
                        USDC on exchanges like Coinbase, Binance, or directly
                        through your wallet.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        3. Connect Your Wallet
                      </h4>
                      <p className="text-sm">
                        Click the "Connect Wallet" button in the top right
                        corner of the platform and select your wallet. Approve
                        the connection request in your wallet extension.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-theme-primary" />
                      Understanding Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <p className="text-sm">
                      Sahara uses a multi-signature verification system to
                      ensure beneficiaries are legitimate:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-2 ml-4">
                      <li>
                        <strong>Field Workers:</strong> On-ground personnel from
                        NGOs who register and verify beneficiaries
                      </li>
                      <li>
                        <strong>Multi-Sig Verification:</strong> Multiple field
                        workers from different NGOs must verify each beneficiary
                      </li>
                      <li>
                        <strong>Blockchain Records:</strong> All verifications
                        are recorded on-chain for transparency
                      </li>
                      <li>
                        <strong>Verified Badge:</strong> Only verified
                        beneficiaries can receive donations
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-theme-primary" />
                      Key Concepts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Disasters
                      </h4>
                      <p className="text-sm">
                        Events created by NGOs to coordinate relief efforts for
                        specific disasters (earthquakes, floods, etc.)
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Fund Pools
                      </h4>
                      <p className="text-sm">
                        Collective donation pools for specific disasters with
                        transparent distribution rules
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Beneficiaries
                      </h4>
                      <p className="text-sm">
                        Verified disaster victims who receive aid directly to
                        their wallets
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Direct Donations
                      </h4>
                      <p className="text-sm">
                        Donations made directly to individual verified
                        beneficiaries
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* For Donors */}
              <TabsContent value="donors" className="space-y-6">
                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-theme-primary" />
                      How to Donate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Donating to Fund Pools
                      </h4>
                      <ol className="list-decimal list-inside text-sm space-y-2 ml-4">
                        <li>Browse active disasters on the Disasters page</li>
                        <li>Select a disaster and view available fund pools</li>
                        <li>Click "Donate" on a pool</li>
                        <li>Enter the amount in USDC</li>
                        <li>Add an optional message</li>
                        <li>Choose to donate anonymously (optional)</li>
                        <li>Confirm the transaction in your wallet</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Donating to Beneficiaries
                      </h4>
                      <ol className="list-decimal list-inside text-sm space-y-2 ml-4">
                        <li>
                          Browse verified beneficiaries on the Beneficiaries
                          page
                        </li>
                        <li>
                          View beneficiary profiles to see their story and needs
                        </li>
                        <li>Click "Donate" on a beneficiary's profile</li>
                        <li>Enter the amount in USDC</li>
                        <li>Add an optional message of support</li>
                        <li>Choose to donate anonymously (optional)</li>
                        <li>Confirm the transaction in your wallet</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Tracking Your Donations
                      </h4>
                      <p className="text-sm">
                        All donations are recorded on the Solana blockchain. You
                        can:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>View transaction details on Solana Explorer</li>
                        <li>See exactly where your funds went</li>
                        <li>
                          Verify that beneficiaries received the full amount
                          (minus small platform fee)
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-theme-primary" />
                      Fees & Transparency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <p className="text-sm">
                      Sahara charges a small platform fee to cover
                      infrastructure costs and maintain the platform. This fee
                      is significantly lower than traditional relief
                      organizations (typically 30-40% overhead).
                    </p>
                    <div className="bg-theme-background p-4 rounded-lg">
                      <p className="text-sm font-semibold text-theme-text-highlight mb-2">
                        Fee Breakdown:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>Platform Fee: Small percentage of each donation</li>
                        <li>
                          Solana Network Fee: Minimal (typically $0.00025 per
                          transaction)
                        </li>
                        <li>No hidden fees or charges</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* For NGOs */}
              <TabsContent value="ngos" className="space-y-6">
                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-theme-primary" />
                      NGO Registration & Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Registration Process
                      </h4>
                      <ol className="list-decimal list-inside text-sm space-y-2 ml-4">
                        <li>Connect your organization's wallet</li>
                        <li>Navigate to NGO registration</li>
                        <li>
                          Fill in organization details (name, registration
                          number, contact info)
                        </li>
                        <li>Provide verification documents</li>
                        <li>Submit for admin review</li>
                        <li>Wait for platform admin verification</li>
                      </ol>
                    </div>

                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        After Verification
                      </h4>
                      <p className="text-sm mb-2">
                        Once verified, your NGO can:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>Register field workers</li>
                        <li>Create disaster events</li>
                        <li>Create and manage fund pools</li>
                        <li>Register beneficiaries</li>
                        <li>Distribute funds to verified beneficiaries</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle>Managing Field Workers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <p className="text-sm">
                      Field workers are your on-ground personnel who register
                      and verify beneficiaries.
                    </p>
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Registering Field Workers
                      </h4>
                      <ol className="list-decimal list-inside text-sm space-y-2 ml-4">
                        <li>Go to your NGO dashboard</li>
                        <li>Navigate to Field Workers section</li>
                        <li>Click "Register Field Worker"</li>
                        <li>Enter worker details and wallet address</li>
                        <li>Submit registration</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle>Creating Fund Pools</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <p className="text-sm">
                      Fund pools allow you to collect donations for specific
                      disasters with transparent distribution rules.
                    </p>
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Pool Configuration
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>
                          Set distribution type (equal, weighted by family size,
                          weighted by damage)
                        </li>
                        <li>Define eligibility criteria</li>
                        <li>Set target amount (optional)</li>
                        <li>Configure time locks for phased distribution</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* For Developers */}
              <TabsContent value="developers" className="space-y-6">
                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-theme-primary" />
                      Technical Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Technology Stack
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>
                          <strong>Blockchain:</strong> Solana (high-speed,
                          low-cost transactions)
                        </li>
                        <li>
                          <strong>Smart Contracts:</strong> Anchor Framework
                          (Rust)
                        </li>
                        <li>
                          <strong>Frontend:</strong> Next.js 15 with TypeScript
                        </li>
                        <li>
                          <strong>Wallet Integration:</strong> Solana Wallet
                          Adapter
                        </li>
                        <li>
                          <strong>Token Standard:</strong> SPL Token (USDC)
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Program ID
                      </h4>
                      <div className="bg-theme-background p-3 rounded-lg">
                        <code className="text-xs font-mono text-theme-primary break-all">
                          EuN6BXkDt6jqRfDBQ2ePW8PyvjvkDNyuGmAh5qrXHNFe
                        </code>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Network
                      </h4>
                      <p className="text-sm">
                        Currently deployed on Solana Devnet for testing. Mainnet
                        deployment coming soon.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle>Smart Contract Architecture</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Key Instructions
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            initialize_platform
                          </code>{" "}
                          - Initialize platform configuration
                        </li>
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            register_ngo
                          </code>{" "}
                          - Register new NGO
                        </li>
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            register_beneficiary
                          </code>{" "}
                          - Register disaster victim
                        </li>
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            verify_beneficiary
                          </code>{" "}
                          - Multi-sig verification
                        </li>
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            donate_direct
                          </code>{" "}
                          - Direct donation to beneficiary
                        </li>
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            donate_to_pool
                          </code>{" "}
                          - Donate to fund pool
                        </li>
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            distribute_from_pool
                          </code>{" "}
                          - Allocate funds to beneficiaries
                        </li>
                        <li>
                          <code className="text-xs bg-theme-background px-1 py-0.5 rounded">
                            claim_distribution
                          </code>{" "}
                          - Beneficiary claims allocated funds
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-theme-card-bg border-theme-border">
                  <CardHeader>
                    <CardTitle>Contributing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-theme-text">
                    <p className="text-sm">
                      Sahara is open source and welcomes contributions from the
                      community.
                    </p>
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        Repository
                      </h4>
                      <a
                        href="https://github.com/exyreams/sahara"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-theme-primary hover:underline"
                      >
                        github.com/exyreams/sahara
                      </a>
                    </div>
                    <div>
                      <h4 className="font-semibold text-theme-text-highlight mb-2">
                        How to Contribute
                      </h4>
                      <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                        <li>Fork the repository</li>
                        <li>Create a feature branch</li>
                        <li>Make your changes</li>
                        <li>Submit a pull request</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Need Help Section */}
            <Card className="mt-12 bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Need More Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-theme-text mb-4">
                  Can't find what you're looking for? We're here to help!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild>
                    <Link href="/support">Contact Support</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <a
                      href="https://github.com/exyreams/sahara"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on GitHub
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
