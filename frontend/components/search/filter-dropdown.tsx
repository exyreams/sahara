"use client";

import { Filter } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  multiSelect?: boolean;
  className?: string;
}

export function FilterDropdown({
  label,
  options,
  selectedValues,
  onSelectionChange,
  multiSelect = true,
  className = "",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value: string) => {
    if (multiSelect) {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onSelectionChange(newValues);
    } else {
      onSelectionChange(selectedValues.includes(value) ? [] : [value]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedValues.length;

  return (
    <div className={className}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs px-3 py-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            {label}
            {selectedCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 rounded-sm px-1 font-normal text-xs"
              >
                {selectedCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="flex items-center justify-between text-xs">
            <span>{label}</span>
            {selectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-5 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
              className="text-xs py-1.5"
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
