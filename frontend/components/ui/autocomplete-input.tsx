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
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const filteredOptions = React.useMemo(() => {
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        option.value.toLowerCase().includes(inputValue.toLowerCase()),
    );
  }, [options, inputValue]);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions.length, open]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (
      open &&
      highlightedIndex >= 0 &&
      highlightedIndex < filteredOptions.length
    ) {
      const element = optionRefs.current[highlightedIndex];
      if (element) {
        element.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex, open, filteredOptions.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredOptions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0,
          );
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1,
          );
        }
        break;

      case "Enter":
        e.preventDefault();
        if (open && highlightedIndex >= 0) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        } else if (!open) {
          setOpen(true);
          setHighlightedIndex(0);
        }
        break;

      case "Escape":
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;

      case "Tab":
        if (open) {
          setOpen(false);
          setHighlightedIndex(-1);
        }
        break;
    }
  };

  const handleSelectOption = (option: AutocompleteOption) => {
    setInputValue(option.value);
    onChange(option.value);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className={cn("relative group", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "pr-10 transition-all duration-300",
            "bg-theme-card-bg border-theme-border text-theme-text-highlight",
            "placeholder:text-theme-text/50",
            "focus-visible:ring-1 focus-visible:ring-theme-primary focus-visible:border-theme-primary",
            "hover:border-theme-primary/50",
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-theme-text hover:text-theme-primary transition-colors duration-300"
          onClick={() => {
            setOpen((prev) => !prev);
            if (!open) inputRef.current?.focus();
          }}
          disabled={disabled}
          tabIndex={-1}
        >
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </div>

      {open && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 max-h-60 overflow-auto rounded-md border border-theme-border bg-theme-card-bg p-1 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
        >
          {filteredOptions.map((option, index) => {
            const isSelected = value === option.value;
            const isHighlighted = highlightedIndex === index;

            return (
              <button
                key={option.value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2 py-2 text-sm outline-none transition-all duration-200",

                  isSelected &&
                    "bg-theme-primary text-theme-background font-medium",

                  !isSelected &&
                    isHighlighted &&
                    "bg-theme-primary/10 text-theme-text-highlight",

                  !isSelected &&
                    !isHighlighted &&
                    "text-theme-text hover:bg-theme-primary/10 hover:text-theme-text-highlight",
                )}
                onClick={() => handleSelectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span>{option.label}</span>
                <Check
                  className={cn(
                    "ml-2 h-4 w-4 transition-opacity duration-200",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>
      )}

      {open && filteredOptions.length === 0 && inputValue && (
        <div className="absolute z-50 w-full mt-2 rounded-md border border-theme-border bg-theme-card-bg p-3 text-sm text-theme-text/70 shadow-xl animate-in fade-in-0 zoom-in-95">
          No options found
        </div>
      )}
    </div>
  );
}
