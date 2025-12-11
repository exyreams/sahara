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
import { useManager } from "@/hooks/use-manager";
import { useNGO } from "@/hooks/use-ngo";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Disasters", href: "/disasters" },
  { name: "Beneficiaries", href: "/beneficiaries" },
  { name: "Pools", href: "/pools" },
  { name: "Directory", href: "/directory" },
  { name: "NGOs", href: "/ngo" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin } = useAdmin();
  const { isManager } = useManager();
  const { ngo } = useNGO();
  const { isFieldWorker } = useFieldWorker();
  const { isBeneficiary } = useBeneficiaryProfile();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="flex items-center justify-between px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-2 bg-theme-background/70 backdrop-blur-[10px] border-b border-theme-border">
        {/* Logo */}
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="flex items-center gap-2 text-xl font-outfit font-bold text-theme-primary no-underline transition-colors hover:text-theme-primary/80"
        >
          <Logo width={24} height={24} priority />
          <span>Sahara</span>
        </Link>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-1">
          {isAdmin && (
            <Link href="/admin">
              <Badge variant="default" className="gap-1 text-xs px-2 py-1">
                <Shield className="h-2.5 w-2.5" />
                Admin
              </Badge>
            </Link>
          )}
          {isManager && !isAdmin && (
            <Link href="/manager">
              <Badge variant="default" className="gap-1 text-xs px-2 py-1">
                <Shield className="h-2.5 w-2.5" />
                Manager
              </Badge>
            </Link>
          )}
          {ngo?.isVerified && (
            <Link href="/ngo/dashboard">
              <Badge variant="default" className="text-xs px-2 py-1">
                NGO
              </Badge>
            </Link>
          )}
          {isFieldWorker && (
            <Link href="/beneficiaries">
              <Badge variant="default" className="text-xs px-2 py-1">
                Field Worker
              </Badge>
            </Link>
          )}
          {isBeneficiary && (
            <Link href="/wallet/profile">
              <Badge variant="default" className="text-xs px-2 py-1">
                My Profile
              </Badge>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-theme-text hover:text-theme-primary p-1"
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Desktop navigation */}
        <ul className="hidden md:flex items-center gap-2 list-none">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "text-theme-text no-underline py-1.5 px-3 text-sm rounded transition-all",
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
        <div className="hidden md:flex items-center gap-2">
          {isAdmin && (
            <Link href="/admin">
              <Badge
                variant="default"
                className="gap-1 cursor-pointer hover:bg-theme-primary/90 text-xs px-2 py-1"
              >
                <Shield className="h-2.5 w-2.5" />
                Admin
              </Badge>
            </Link>
          )}
          {isManager && !isAdmin && (
            <Link href="/manager">
              <Badge
                variant="default"
                className="gap-1 cursor-pointer hover:bg-theme-primary/90 text-xs px-2 py-1"
              >
                <Shield className="h-2.5 w-2.5" />
                Manager
              </Badge>
            </Link>
          )}
          {ngo?.isVerified && (
            <Link href="/ngo/dashboard">
              <Badge
                variant="default"
                className="cursor-pointer hover:bg-theme-primary/90 text-xs px-2 py-1"
              >
                NGO
              </Badge>
            </Link>
          )}
          {isFieldWorker && (
            <Link href="/beneficiaries">
              <Badge
                variant="default"
                className="cursor-pointer hover:bg-theme-primary/90 text-xs px-2 py-1"
              >
                Field Worker
              </Badge>
            </Link>
          )}
          {isBeneficiary && (
            <Link href="/wallet/profile">
              <Badge
                variant="default"
                className="cursor-pointer hover:bg-theme-primary/90 text-xs px-2 py-1"
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
          <div className="space-y-1 px-3 pb-2 pt-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-theme-primary text-theme-background"
                      : "text-theme-text hover:bg-theme-primary hover:text-theme-background",
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-2 space-y-2 flex flex-col">
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
