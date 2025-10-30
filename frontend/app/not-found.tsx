"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ParticleSystem } from "@/components/ui/particle-system";

export default function NotFound() {
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
            <ParticleSystem text="404" />
          </div>

          {/* Content Overlay */}
          <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center pointer-events-none">
            <div className="flex-1" />

            {/* Hero Content */}
            <div className="max-w-3xl mx-auto text-center space-y-6 pb-16 pointer-events-auto">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                Page Not Found
              </h1>
              <p className="text-lg md:text-xl text-theme-text max-w-2xl mx-auto">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <Button asChild size="lg">
                  <Link href="/">Go Home</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/disasters">View Disasters</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
