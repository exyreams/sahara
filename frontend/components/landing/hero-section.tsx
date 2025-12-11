"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GridBackground } from "@/components/ui/grid-background";

interface HeroSectionProps {
  text?: string;
  height?: string;
}

export function HeroSection({
  text = "Sahara",
  height = "100vh",
}: HeroSectionProps) {
  return (
    <section
      className="relative w-full bg-theme-background overflow-hidden border-b border-theme-border"
      style={{ height }}
    >
      {/* Professional Grid Background */}
      <div className="absolute inset-0 z-0">
        <GridBackground />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center">
        {/* Hero Content */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Status Badge */}
          <div className="inline-flex items-center rounded-full border border-theme-primary/20 bg-theme-primary/10 px-3 py-1 text-xs font-medium text-theme-primary backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-theme-primary mr-2 animate-pulse" />
            Live on Solana Devnet
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white/90 pb-2">
            Transparent Disaster <br className="hidden md:block" />
            <span className="font-extrabold text-transparent bg-clip-text bg-linear-to-r from-theme-primary via-theme-secondary to-theme-primary bg-size-[200%_auto] animate-gradient pr-2 py-1">
              Relief & Aid
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base md:text-lg text-theme-text/80 max-w-2xl mx-auto leading-relaxed">
            Connect directly with verified beneficiaries. Zero intermediaries,
            instant distribution, and complete on-chain transparency for every
            donation.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button
              className="h-10 px-6 text-sm bg-theme-primary hover:bg-theme-secondary text-theme-background font-semibold shadow-[0_0_20px_rgba(57,211,241,0.3)] hover:shadow-[0_0_30px_rgba(57,211,241,0.5)] transition-all duration-300"
              asChild
            >
              <Link href="/disasters">
                Start Donating
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-10 px-6 text-sm border-theme-border text-theme-text hover:bg-theme-text hover:text-theme-background backdrop-blur-sm bg-theme-background/30"
              asChild
            >
              <Link href="/ngo/register">Register Organization</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
