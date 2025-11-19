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
          <Button variant="outline" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {label}
            {selectedOption && (
              <span className="text-muted-foreground">
                : {selectedOption.label}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
