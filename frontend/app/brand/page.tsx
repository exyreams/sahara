"use client";

import { Download } from "lucide-react";
import Image from "next/image";
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

export default function BrandPage() {
  const _downloadSVG = (theme: string) => {
    // Create SVG content based on theme
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${theme === "light" ? "#0EA5E9" : "#06B6D4"}">
  <path d="M50,10 L90,30 L90,70 L50,90 L10,70 L10,30 Z M50,25 L75,37.5 L75,62.5 L50,75 L25,62.5 L25,37.5 Z"/>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sahara-logo-${theme}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-theme-bg">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-theme-text-highlight mb-4">
              Brand Assets
            </h1>
            <p className="text-lg text-theme-text">
              Download our logo and brand assets for use in your projects,
              presentations, or media coverage.
            </p>
          </div>

          {/* Logo Previews */}
          <div className="space-y-8">
            {/* Primary Logo (Default) */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Primary Logo (Default)</CardTitle>
                <CardDescription>
                  Our main logo with cyan/blue theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-12 mb-4 flex items-center justify-center">
                  <Image
                    src="/logo_default.svg"
                    alt="Sahara Logo Default"
                    width={128}
                    height={128}
                    className="w-32 h-32"
                  />
                </div>
                <Button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/logo_default.svg";
                    a.download = "sahara-logo-default.svg";
                    a.click();
                  }}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download SVG
                </Button>
              </CardContent>
            </Card>

            {/* Emerald Logo */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Emerald Logo</CardTitle>
                <CardDescription>Logo with emerald green theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-12 mb-4 flex items-center justify-center">
                  <Image
                    src="/logo_emerald.svg"
                    alt="Sahara Logo Emerald"
                    width={128}
                    height={128}
                    className="w-32 h-32"
                  />
                </div>
                <Button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/logo_emerald.svg";
                    a.download = "sahara-logo-emerald.svg";
                    a.click();
                  }}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download SVG
                </Button>
              </CardContent>
            </Card>

            {/* Sunset Logo */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Sunset Logo</CardTitle>
                <CardDescription>
                  Logo with warm sunset orange theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-12 mb-4 flex items-center justify-center">
                  <Image
                    src="/logo_sunset.svg"
                    alt="Sahara Logo Sunset"
                    width={128}
                    height={128}
                    className="w-32 h-32"
                  />
                </div>
                <Button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = "/logo_sunset.svg";
                    a.download = "sahara-logo-sunset.svg";
                    a.click();
                  }}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download SVG
                </Button>
              </CardContent>
            </Card>

            {/* Dark Background Preview */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Dark Background Preview</CardTitle>
                <CardDescription>
                  How our logos look on dark backgrounds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-900 rounded-lg p-8 flex items-center justify-center">
                    <Image
                      src="/logo_default.svg"
                      alt="Default on dark"
                      width={96}
                      height={96}
                      className="w-24 h-24"
                    />
                  </div>
                  <div className="bg-gray-900 rounded-lg p-8 flex items-center justify-center">
                    <Image
                      src="/logo_emerald.svg"
                      alt="Emerald on dark"
                      width={96}
                      height={96}
                      className="w-24 h-24"
                    />
                  </div>
                  <div className="bg-gray-900 rounded-lg p-8 flex items-center justify-center">
                    <Image
                      src="/logo_sunset.svg"
                      alt="Sunset on dark"
                      width={96}
                      height={96}
                      className="w-24 h-24"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand Colors */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Brand Colors</CardTitle>
                <CardDescription>
                  Our official color palettes for different themes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Theme */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                    Default Theme (Cyan/Blue)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="h-20 rounded-lg bg-[#0EA5E9] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #0EA5E9
                      </p>
                      <p className="text-xs text-theme-text/60">Primary</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#06B6D4] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #06B6D4
                      </p>
                      <p className="text-xs text-theme-text/60">Secondary</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#0F172A] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #0F172A
                      </p>
                      <p className="text-xs text-theme-text/60">Dark</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#F8FAFC] border border-gray-200 mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #F8FAFC
                      </p>
                      <p className="text-xs text-theme-text/60">Light</p>
                    </div>
                  </div>
                </div>

                {/* Emerald Theme */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                    Emerald Theme (Green)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="h-20 rounded-lg bg-[#10B981] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #10B981
                      </p>
                      <p className="text-xs text-theme-text/60">Primary</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#059669] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #059669
                      </p>
                      <p className="text-xs text-theme-text/60">Secondary</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#064E3B] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #064E3B
                      </p>
                      <p className="text-xs text-theme-text/60">Dark</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#ECFDF5] border border-gray-200 mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #ECFDF5
                      </p>
                      <p className="text-xs text-theme-text/60">Light</p>
                    </div>
                  </div>
                </div>

                {/* Sunset Theme */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-text-highlight mb-3">
                    Sunset Theme (Orange)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="h-20 rounded-lg bg-[#F97316] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #F97316
                      </p>
                      <p className="text-xs text-theme-text/60">Primary</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#EA580C] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #EA580C
                      </p>
                      <p className="text-xs text-theme-text/60">Secondary</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#7C2D12] mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #7C2D12
                      </p>
                      <p className="text-xs text-theme-text/60">Dark</p>
                    </div>
                    <div>
                      <div className="h-20 rounded-lg bg-[#FFF7ED] border border-gray-200 mb-2" />
                      <p className="text-sm font-mono text-theme-text">
                        #FFF7ED
                      </p>
                      <p className="text-xs text-theme-text/60">Light</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Guidelines */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <CardTitle>Usage Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-theme-text">
                <div>
                  <h4 className="font-semibold text-theme-text-highlight mb-2">
                    Do's
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-theme-text/80">
                    <li>Use the logo in its original proportions</li>
                    <li>Maintain clear space around the logo</li>
                    <li>Use approved color variations</li>
                    <li>Ensure good contrast with backgrounds</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-theme-text-highlight mb-2">
                    Don'ts
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-theme-text/80">
                    <li>Don't distort or stretch the logo</li>
                    <li>Don't change the logo colors</li>
                    <li>Don't add effects or shadows</li>
                    <li>Don't use the logo on busy backgrounds</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact */}
          <div className="mt-12 text-center">
            <p className="text-theme-text mb-4">
              Need custom assets or have questions about brand usage?
            </p>
            <Button asChild variant="outline">
              <Link href="/support">Contact Us</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
