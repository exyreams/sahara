"use client";

import { FaPalette } from "react-icons/fa";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/dropdown";
import { useTheme } from "@/hooks/use-theme";

export function ThemeSelector() {
  const { currentTheme, switchTheme, themes } = useTheme();

  return (
    <div className="w-30">
      <Select
        value={currentTheme}
        onValueChange={(value) =>
          switchTheme(value as Parameters<typeof switchTheme>[0])
        }
      >
        <SelectTrigger className="h-10">
          <div className="flex items-center gap-2">
            <FaPalette className="h-4 w-4 text-theme-primary" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.values(themes).map((theme) => (
            <SelectItem key={theme.name} value={theme.name}>
              {theme.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
