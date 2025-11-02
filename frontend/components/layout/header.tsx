"use client";

import { Menu, Shield, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeSelector } from "@/components/layout/theme-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useAdmin } from "@/hooks/use-admin";
import { useBeneficiaryProfile } from "@/hooks/use-beneficiary-profile";
import { useFieldWorker } from "@/hooks/use-field-worker";
import { useNGO } from "@/hooks/use-ngo";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Disasters", href: "/disasters" },
  { name: "Beneficiaries", href: "/beneficiaries" },
  { name: "Pools", href: "/pools" },
  { name: "NGOs", href: "/ngo" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin } = useAdmin();
  const { ngo } = useNGO();
  const { isFieldWorker } = useFieldWorker();
  const { isBeneficiary } = useBeneficiaryProfile();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="flex items-center justify-between px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-4 bg-theme-background/70 backdrop-blur-[10px] border-b border-theme-border">
        {/* Logo */}
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="flex items-center gap-3 text-3xl font-outfit font-bold text-theme-primary no-underline transition-colors hover:text-theme-primary/80"
        >
          <Logo width={32} height={32} priority />
          <span>Sahara</span>
        </Link>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {isAdmin && (
            <Link href="/admin">
              <Badge variant="default" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            </Link>
          )}
          {ngo?.isVerified && (
            <Link href="/ngo/dashboard">
              <Badge variant="default">NGO</Badge>
            </Link>
          )}
          {isFieldWorker && (
            <Link href="/beneficiaries">
              <Badge variant="default">Field Worker</Badge>
            </Link>
          )}
          {isBeneficiary && (
            <Link href="/wallet/profile">
              <Badge variant="default">My Profile</Badge>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-theme-text hover:text-theme-primary"
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Desktop navigation */}
        <ul className="hidden md:flex items-center gap-4 list-none">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "text-theme-text no-underline py-2 px-4 text-[0.9rem] rounded transition-all",
                    isActive
                      ? "bg-theme-primary text-theme-background"
                      : "hover:bg-theme-primary hover:text-theme-background",
                  )}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isAdmin && (
            <Link href="/admin">
              <Badge
                variant="default"
                className="gap-1 cursor-pointer hover:bg-theme-primary/90"
              >
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            </Link>
          )}
          {ngo?.isVerified && (
            <Link href="/ngo/dashboard">
              <Badge
                variant="default"
                className="cursor-pointer hover:bg-theme-primary/90"
              >
                NGO
              </Badge>
            </Link>
          )}
          {isFieldWorker && (
            <Link href="/beneficiaries">
              <Badge
                variant="default"
                className="cursor-pointer hover:bg-theme-primary/90"
              >
                Field Worker
              </Badge>
            </Link>
          )}
          {isBeneficiary && (
            <Link href="/wallet/profile">
              <Badge
                variant="default"
                className="cursor-pointer hover:bg-theme-primary/90"
              >
                My Profile
              </Badge>
            </Link>
          )}
          <WalletButton />
          <ThemeSelector />
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-theme-border bg-theme-card-bg">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                    isActive
                      ? "bg-theme-primary text-theme-background"
                      : "text-theme-text hover:bg-theme-primary hover:text-theme-background",
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-4 space-y-2 flex flex-col">
              <WalletButton />
              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-text">Theme</span>
                <ThemeSelector />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
