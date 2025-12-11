"use client";

import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  label?: string;
  options: SortOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function SortDropdown({
  label = "Sort By",
  options,
  value,
  onValueChange,
  className = "",
}: SortDropdownProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs px-3 py-1.5"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {label}
            {selectedOption && (
              <span className="text-black dark:text-white">
                : {selectedOption.label}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="text-xs py-1.5"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
