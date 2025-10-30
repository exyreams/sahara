"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { ThemeContext } from "@/hooks/use-theme";
import { defaultTheme, themes } from "@/lib/theme-config";
import type { ThemeName } from "@/types/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(defaultTheme);

  const applyTheme = useCallback((themeName: ThemeName) => {
    const theme = themes[themeName];
    if (!theme) return;

    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty("--theme-background", theme.colors.background);
    root.style.setProperty("--theme-card-bg", theme.colors.cardBackground);
    root.style.setProperty("--theme-primary", theme.colors.primaryAccent);
    root.style.setProperty("--theme-secondary", theme.colors.secondaryAccent);
    root.style.setProperty("--theme-text", theme.colors.textColor);
    root.style.setProperty(
      "--theme-text-highlight",
      theme.colors.textHighlight,
    );
    root.style.setProperty("--theme-border", theme.colors.borderColor);

    // Update data attribute for Tailwind
    root.setAttribute("data-theme", themeName);

    // Update class for dark/light mode
    if (theme.isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    setCurrentTheme(themeName);
    localStorage.setItem("sahara-theme", themeName);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("sahara-theme") as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      applyTheme(savedTheme);
    } else {
      applyTheme(defaultTheme);
    }
  }, [applyTheme]);

  const switchTheme = (themeName: ThemeName) => {
    applyTheme(themeName);
  };

  if (!mounted) {
    return null;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <ThemeContext.Provider value={{ currentTheme, switchTheme, themes }}>
        {children}
      </ThemeContext.Provider>
    </NextThemesProvider>
  );
}
