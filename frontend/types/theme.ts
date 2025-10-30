export type ThemeName = "sahara" | "sunset" | "emerald" | "light";

export interface ThemeColors {
  background: string;
  cardBackground: string;
  primaryAccent: string;
  secondaryAccent: string;
  textColor: string;
  textHighlight: string;
  borderColor: string;
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  isDark: boolean;
}
