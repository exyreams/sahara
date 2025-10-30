import type { Theme } from "@/types/theme";

export const themes: Record<string, Theme> = {
  sahara: {
    name: "sahara",
    displayName: "Sahara",
    isDark: true,
    colors: {
      background: "#0D1117",
      cardBackground: "#161B22",
      primaryAccent: "#39D3F1",
      secondaryAccent: "#24A6C0",
      textColor: "rgba(255, 255, 255, 0.7)",
      textHighlight: "#FFFFFF",
      borderColor: "rgba(57, 211, 241, 0.2)",
    },
  },
  sunset: {
    name: "sunset",
    displayName: "Sunset",
    isDark: true,
    colors: {
      background: "#1A1024",
      cardBackground: "#2C1E3A",
      primaryAccent: "#FF8C42",
      secondaryAccent: "#FFC35B",
      textColor: "rgba(255, 255, 255, 0.7)",
      textHighlight: "#FFFFFF",
      borderColor: "rgba(255, 140, 66, 0.2)",
    },
  },
  emerald: {
    name: "emerald",
    displayName: "Emerald",
    isDark: true,
    colors: {
      background: "#0F1D1A",
      cardBackground: "#1A2D27",
      primaryAccent: "#2ECC71",
      secondaryAccent: "#27AE60",
      textColor: "rgba(255, 255, 255, 0.7)",
      textHighlight: "#FFFFFF",
      borderColor: "rgba(46, 204, 113, 0.2)",
    },
  },
  light: {
    name: "light",
    displayName: "Light",
    isDark: false,
    colors: {
      background: "#F5F7FA",
      cardBackground: "#FFFFFF",
      primaryAccent: "#007BFF",
      secondaryAccent: "#0056b3",
      textColor: "#555555",
      textHighlight: "#111111",
      borderColor: "#DEE2E6",
    },
  },
};

export const defaultTheme = "sahara";
