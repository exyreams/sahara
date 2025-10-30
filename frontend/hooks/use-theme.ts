"use client";

import { createContext, useContext } from "react";
import type { Theme, ThemeName } from "@/types/theme";

interface ThemeContextType {
  currentTheme: ThemeName;
  switchTheme: (theme: ThemeName) => void;
  themes: Record<string, Theme>;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
