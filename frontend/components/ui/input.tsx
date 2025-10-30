import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-theme-border bg-theme-background px-3 py-1 text-base text-theme-text-highlight shadow-xs transition-[color,box-shadow] outline-none",
        "placeholder:text-theme-text/50",
        "focus-visible:border-theme-primary focus-visible:ring-theme-primary/50 focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-theme-text",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
