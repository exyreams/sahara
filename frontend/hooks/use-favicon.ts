"use client";

import { useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";

export function useFavicon() {
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Map themes to favicon files - each theme has its own file
    const faviconMap: Record<string, string> = {
      sahara: "/favicon-sahara.ico",
      light: "/favicon-light.ico",
      emerald: "/favicon-emerald.ico",
      sunset: "/favicon-sunset.ico",
    };

    const faviconPath = faviconMap[currentTheme];

    // Remove all existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    for (const link of existingLinks) {
      link.remove();
    }

    // Add cache-busting parameter to force reload
    const cacheBuster = `?v=${Date.now()}`;
    const faviconUrl = `${faviconPath}${cacheBuster}`;

    // Create and add new favicon link
    const link = document.createElement("link");
    link.type = "image/x-icon";
    link.rel = "icon";
    link.href = faviconUrl;
    document.head.appendChild(link);

    // Also add shortcut icon for older browsers
    const shortcutLink = document.createElement("link");
    shortcutLink.rel = "shortcut icon";
    shortcutLink.href = faviconUrl;
    document.head.appendChild(shortcutLink);
  }, [currentTheme]);
}
