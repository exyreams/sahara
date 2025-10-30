"use client";

import Image from "next/image";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function Logo({
  className,
  width = 40,
  height = 40,
  priority = false,
}: LogoProps) {
  const { currentTheme } = useTheme();

  // Map themes to logo files
  const logoMap: Record<string, string> = {
    sahara: "/logo_default.svg",
    light: "/logo_default.svg",
    emerald: "/logo_emerald.svg",
    sunset: "/logo_sunset.svg",
  };

  const logoPath = logoMap[currentTheme] || "/logo_default.svg";

  return (
    <Image
      src={logoPath}
      alt="Sahara Logo"
      width={width}
      height={height}
      priority={priority}
      className={cn("transition-all duration-300", className)}
    />
  );
}
