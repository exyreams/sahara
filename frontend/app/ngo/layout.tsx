"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Home,
  PanelLeftClose,
  PanelRightClose,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GridBackground } from "@/components/ui/grid-background";
import { useNGO } from "@/hooks/use-ngo";
import { useProgram } from "@/hooks/use-program";
import { cn } from "@/lib/utils";

export default function NGOLayout({ children }: { children: React.ReactNode }) {
  const { ngo, loading } = useNGO();
  const { wallet } = useProgram();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Add a small delay to prevent particle flash on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const navItems = [
    {
      href: "/ngo/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/ngo/field-workers",
      label: "Field Workers",
      icon: Users,
    },
    {
      href: "/ngo/activity-log",
      label: "Activity Log",
      icon: FileText,
    },
  ];

  // Get particle text based on current route
  const getParticleText = () => {
    if (pathname === "/ngo/dashboard") return "Dashboard";
    if (pathname === "/ngo/field-workers") return "Workers";
    if (pathname === "/ngo/activity-log") return "Activity";
    return "NGO";
  };

  // Check wallet connection FIRST to avoid skeleton flash
  // If wallet not connected and not on main NGO page, show access denied immediately
  if (!wallet.connected && pathname !== "/ngo") {
    return (
      <div className="min-h-screen bg-theme-background flex flex-col">
        {/* Particle System Section - Top */}
        <section className="relative w-full bg-theme-background overflow-hidden h-[30vh] min-h-[250px] mt-8">
          <div className="absolute inset-0 mx-8">
            <GridBackground />
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
                  You need to connect your wallet to access this area
                </p>
              </div>

              {/* Info text */}
              <div className="max-w-lg mx-auto">
                <p className="text-sm text-theme-text/70 leading-relaxed">
                  This section is restricted to registered NGOs only. Please
                  connect your wallet and register your NGO to access the NGO
                  portal.
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

  // Show loading state - only show sidebar skeleton if wallet is connected
  if (loading || initialLoading) {
    if (wallet.connected) {
      return (
        <div className="flex-1 flex min-h-screen -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20">
          {/* Sidebar Skeleton */}
          <aside className="-mt-2 w-64 border-r border-theme-border bg-theme-card-bg flex flex-col">
            <div className="flex-1 p-4 pt-0 space-y-2">
              <div className="flex items-center justify-between px-3 h-16">
                <div className="h-5 w-28 bg-theme-border rounded animate-pulse" />
                <div className="h-5 w-5 bg-theme-border rounded animate-pulse" />
              </div>
              {Array.from({ length: 3 }, (_, i) => `nav-skeleton-${i}`).map(
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

          {/* Main Content - Let children handle their own loading */}
          <main className="flex-1 flex flex-col min-h-screen px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-8">
            {children}
          </main>
        </div>
      );
    }

    // Wallet not connected - no sidebar
    return (
      <main className="flex-1 flex flex-col min-h-screen">{children}</main>
    );
  }

  // If wallet not connected or NGO not registered, show without sidebar (for /ngo page)
  if (!wallet.connected || !ngo) {
    return (
      <main className="flex-1 flex flex-col min-h-screen">{children}</main>
    );
  }

  return (
    <div className="flex-1 flex min-h-screen -mx-4 sm:-mx-8 md:-mx-12 lg:-mx-16 xl:-mx-20">
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
                  NGO Panel
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
            const isActive = pathname.startsWith(item.href);
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
      <main className="flex-1 flex flex-col min-h-screen px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-8">
        {children}
      </main>
    </div>
  );
}
