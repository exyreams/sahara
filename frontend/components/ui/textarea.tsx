import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-md border border-theme-border bg-theme-card-bg px-3 py-2 text-base text-theme-text shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-theme-primary focus-visible:ring-[3px] focus-visible:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
