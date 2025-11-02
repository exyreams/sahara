"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ParticleSystem } from "@/components/ui/particle-system";

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
      {/* Particle Background */}
      <div className="absolute inset-0 z-0">
        <ParticleSystem text={text} />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center pointer-events-none">
        {/* Spacer to push content below particles */}
        <div className="flex-1" />

        {/* Hero Content */}
        <div className="max-w-3xl mx-auto text-center space-y-6 pb-16 pointer-events-auto">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
            Transparent Disaster Relief on Solana
          </h1>
          <p className="text-lg md:text-xl text-theme-text max-w-2xl mx-auto">
            Direct aid distribution to verified beneficiaries with complete
            transparency. Every transaction tracked on-chain.
          </p>
          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Button size="lg" asChild>
              <Link href="/disasters">
                View Active Disasters
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/ngo/register">Register as NGO</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
