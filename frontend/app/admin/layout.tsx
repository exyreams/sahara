"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  FileText,
  Home,
  PanelLeftClose,
  PanelRightClose,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ParticleSystem } from "@/components/ui/particle-system";
import { useAdmin } from "@/hooks/use-admin";
import { usePlatformConfig } from "@/hooks/use-platform-config";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useAdmin();
  const { config, loading: configLoading } = usePlatformConfig();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isInitialized = config !== null;
  const isInitializePage = pathname === "/admin/initialize";

  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/admin/review",
      label: "Review",
      icon: BadgeCheck,
    },
    {
      href: "/admin/treasury",
      label: "Treasury",
      icon: Wallet,
    },
    {
      href: "/admin/ngos",
      label: "NGO Management",
      icon: Users,
    },
    {
      href: "/admin/audit-log",
      label: "Audit Log",
      icon: FileText,
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  // Show loading state while checking
  if (loading || configLoading) {
    return (
      <div className="flex-1 flex min-h-screen">
        {/* Sidebar Skeleton */}
        <aside className="-mt-2 w-64 border-r border-theme-border bg-theme-card-bg flex flex-col">
          <div className="flex-1 p-4 pt-0 space-y-2">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between px-3 h-16">
              <div className="h-5 w-28 bg-theme-border rounded animate-pulse" />
              <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
            </div>

            {/* Nav Items Skeleton */}
            {Array.from({ length: 4 }, (_, i) => `nav-skeleton-${i}`).map(
              (key) => (
                <div
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                >
                  <div className="h-4 w-4 bg-theme-border rounded animate-pulse" />
                  <div className="h-4 w-32 bg-theme-border rounded animate-pulse" />
                </div>
              ),
            )}
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
              <div className="h-10 w-64 bg-theme-border rounded animate-pulse" />
              <div className="h-4 w-96 bg-theme-border rounded animate-pulse" />
            </div>

            {/* Content Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => `card-skeleton-${i}`).map(
                (key) => (
                  <div
                    key={key}
                    className="border border-theme-border rounded-lg p-6 space-y-3"
                  >
                    <div className="h-5 w-32 bg-theme-border rounded animate-pulse" />
                    <div className="h-8 w-20 bg-theme-border rounded animate-pulse" />
                    <div className="h-4 w-full bg-theme-border rounded animate-pulse" />
                  </div>
                ),
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If platform is not initialized, show clean design
  // Get particle text based on current route
  const getParticleText = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname === "/admin/treasury") return "Treasury";
    if (pathname === "/admin/ngos") return "NGOs";
    if (pathname === "/admin/audit-log") return "Audit";
    if (pathname === "/admin/settings") return "Settings";
    return "Admin";
  };

  // If platform is not initialized, show particle design with initialization content
  if (!isInitialized && !isInitializePage) {
    return (
      <div className="min-h-screen bg-theme-background flex flex-col">
        {/* Particle System Section - Top */}
        <section className="relative w-full bg-theme-background overflow-hidden h-[30vh] min-h-[250px] mt-8">
          <div className="absolute inset-0 mx-8">
            <ParticleSystem text={getParticleText()} />
          </div>
        </section>

        {/* Initialization Content - Bottom */}
        <section className="flex-1 flex items-start justify-center px-4 pt-4 pb-8">
          <div className="w-full max-w-xl text-center space-y-10">
            {/* Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                  Platform Not Initialized
                </h1>
                <p className="text-lg text-theme-text max-w-md mx-auto">
                  Set up the SaharaSol platform to manage disaster relief
                  operations
                </p>
              </div>

              {/* Info text */}
              <div className="max-w-lg mx-auto">
                <p className="text-sm text-theme-text/70 leading-relaxed">
                  Your connected wallet will become the platform administrator
                  with full control over configurations, NGO management, and
                  disaster relief operations.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Button asChild size="lg" className="flex-1 h-12 text-base">
                <Link href="/admin/initialize">Initialize Platform</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base"
              >
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // If on initialize page and already initialized, show message
  if (isInitialized && isInitializePage) {
    return <>{children}</>;
  }

  // If platform is initialized but user is not admin, deny access
  if (isInitialized && !isAdmin) {
    return (
      <div className="min-h-screen bg-theme-background flex flex-col">
        {/* Particle System Section - Top */}
        <section className="relative w-full bg-theme-background overflow-hidden h-[30vh] min-h-[250px] mt-8">
          <div className="absolute inset-0 mx-8">
            <ParticleSystem text={getParticleText()} />
          </div>
        </section>

        {/* Access Denied Content - Bottom */}
        <section className="flex-1 flex items-start justify-center px-4 pt-4 pb-8">
          <div className="w-full max-w-xl text-center space-y-10">
            {/* Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-theme-text-highlight">
                  Access Denied
                </h1>
                <p className="text-lg text-theme-text max-w-md mx-auto">
                  You don't have admin permissions to access this area
                </p>
              </div>

              {/* Info text */}
              <div className="max-w-lg mx-auto">
                <p className="text-sm text-theme-text/70 leading-relaxed">
                  This section is restricted to platform administrators only. If
                  you believe you should have access, please contact the
                  platform administrator.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button asChild size="lg" className="h-12 text-base px-8">
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // If not on initialize page, allow access to initialize
  if (!isInitialized) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 flex min-h-screen">
      {/* Sidebar Navigation */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="-mt-2 border-r border-theme-border bg-theme-card-bg flex flex-col"
      >
        <div className="flex-1 p-4 pt-0 space-y-2">
          {/* Header */}
          <div
            className={cn(
              "flex items-center h-16",
              sidebarCollapsed ? "justify-center" : "justify-between px-3",
            )}
          >
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold text-theme-primary"
                >
                  Admin Panel
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "flex items-center justify-center shrink-0 p-2 cursor-pointer rounded-lg transition-all duration-200",
                "text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary",
              )}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Nav Items */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 overflow-hidden",
                  sidebarCollapsed && "justify-center",
                  isActive
                    ? "bg-theme-primary text-theme-background"
                    : "text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary",
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <AnimatePresence mode="wait">
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">{children}</main>
    </div>
  );
}
