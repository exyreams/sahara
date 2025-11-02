import type { Metadata } from "next";
import { Jacquard_24, Outfit } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { FaviconProvider } from "@/components/providers/favicon-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SolanaWalletProvider } from "@/components/providers/wallet-provider";
import { Toaster } from "@/components/ui/sonner";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const jacquard24 = Jacquard_24({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-jacquard",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sahara - Disaster Relief Platform",
  description:
    "Decentralized disaster relief platform built on Solana blockchain for transparent and efficient aid distribution in Nepal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jacquard24.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        <ThemeProvider>
          <FaviconProvider />
          <SolanaWalletProvider>
            <Header />
            <main className="pt-20 flex-1 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
              {children}
            </main>
            <Footer />
            <Toaster />
          </SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
