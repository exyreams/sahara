"use client";

import { CheckCircle2, Globe, Heart, Shield, Users, Zap } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-theme-bg">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-theme-text-highlight mb-6">
              About Sahara
            </h1>
            <p className="text-xl text-theme-text/80 leading-relaxed">
              A decentralized disaster relief platform built on Solana
              blockchain, providing transparent and efficient aid distribution
              to those who need it most.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="bg-theme-card-bg border-y border-theme-border py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-theme-text-highlight mb-6 text-center">
                Our Mission
              </h2>
              <p className="text-lg text-theme-text leading-relaxed text-center">
                Sahara aims to revolutionize disaster relief by eliminating
                middlemen, reducing overhead costs, and ensuring that aid
                reaches beneficiaries directly and instantly. We leverage
                blockchain technology to provide complete transparency and
                accountability in every transaction.
              </p>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-theme-text-highlight mb-12 text-center">
            Why Sahara?
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <Zap className="h-10 w-10 text-theme-primary mb-4" />
                <CardTitle>Instant Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Aid reaches beneficiaries in seconds, not weeks. Powered by
                  Solana's high-speed blockchain for immediate impact.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <Shield className="h-10 w-10 text-theme-primary mb-4" />
                <CardTitle>100% Transparent</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Every transaction is recorded on-chain. Donors can track
                  exactly where their contributions go and who receives them.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <Users className="h-10 w-10 text-theme-primary mb-4" />
                <CardTitle>Multi-Sig Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Beneficiaries are verified by multiple field workers from
                  different NGOs, ensuring legitimacy and preventing fraud.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <Heart className="h-10 w-10 text-theme-primary mb-4" />
                <CardTitle>Direct Aid</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Funds go directly to beneficiaries' wallets. No
                  intermediaries, no delays, no corruption.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <Globe className="h-10 w-10 text-theme-primary mb-4" />
                <CardTitle>Cross-NGO Coordination</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Multiple NGOs can work together seamlessly, sharing verified
                  beneficiary data and coordinating relief efforts.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CheckCircle2 className="h-10 w-10 text-theme-primary mb-4" />
                <CardTitle>Low Overhead</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Minimal platform fees mean more of your donation reaches those
                  in need. Traditional systems lose 30-40% to overhead.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-theme-card-bg border-y border-theme-border py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-theme-text-highlight mb-12 text-center">
              How It Works
            </h2>
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/20 flex items-center justify-center text-theme-primary font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-theme-text-highlight mb-2">
                    Disaster Occurs
                  </h3>
                  <p className="text-theme-text">
                    NGOs create disaster events and fund pools on the platform
                    to coordinate relief efforts.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/20 flex items-center justify-center text-theme-primary font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-theme-text-highlight mb-2">
                    Beneficiaries Registered
                  </h3>
                  <p className="text-theme-text">
                    Field workers on the ground register affected individuals
                    with verified identity and damage assessment.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/20 flex items-center justify-center text-theme-primary font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-theme-text-highlight mb-2">
                    Multi-Sig Verification
                  </h3>
                  <p className="text-theme-text">
                    Multiple field workers from different NGOs verify each
                    beneficiary to ensure legitimacy.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/20 flex items-center justify-center text-theme-primary font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-theme-text-highlight mb-2">
                    Donations Flow In
                  </h3>
                  <p className="text-theme-text">
                    Donors contribute to fund pools or directly to verified
                    beneficiaries with complete transparency.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-theme-primary/20 flex items-center justify-center text-theme-primary font-bold">
                  5
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-theme-text-highlight mb-2">
                    Instant Distribution
                  </h3>
                  <p className="text-theme-text">
                    Funds are distributed directly to beneficiaries' wallets
                    instantly, with full on-chain tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-theme-text-highlight mb-6">
              Join Us in Making a Difference
            </h2>
            <p className="text-lg text-theme-text mb-8">
              Whether you're a donor, NGO, or field worker, you can be part of
              the solution to make disaster relief more efficient and
              transparent.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/disasters">View Active Disasters</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/support">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
