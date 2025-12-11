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
    <div className="w-24">
      <Select
        value={currentTheme}
        onValueChange={(value) =>
          switchTheme(value as Parameters<typeof switchTheme>[0])
        }
      >
        <SelectTrigger className="h-8 px-2 text-xs">
          <div className="flex items-center gap-1.5">
            <FaPalette className="h-3 w-3 text-theme-primary" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.values(themes).map((theme) => (
            <SelectItem
              key={theme.name}
              value={theme.name}
              className="text-xs py-1.5"
            >
              {theme.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
