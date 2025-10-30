"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder = "Type or select...",
  disabled = false,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter options based on input
  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase()),
  );

  // Update input when value prop changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setOpen(true);
  };

  const handleSelectOption = (option: AutocompleteOption) => {
    setInputValue(option.value);
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-10", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </div>

      {open && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 p-1 w-full mt-1 max-h-60 overflow-auto rounded-md border border-theme-border bg-theme-card-bg text-theme-text shadow-md"
        >
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-theme-primary hover:text-theme-background transition-colors",
                value === option.value &&
                  "bg-theme-primary text-theme-background",
              )}
              onClick={() => handleSelectOption(option)}
            >
              <span>{option.label}</span>
              <Check
                className={cn(
                  "ml-2 h-4 w-4",
                  value === option.value ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          ))}
        </div>
      )}

      {open && filteredOptions.length === 0 && inputValue && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 rounded-md border border-theme-border bg-theme-card-bg p-2 text-sm text-theme-text/60 shadow-md"
        >
          No disasters found
        </div>
      )}
    </div>
  );
}
