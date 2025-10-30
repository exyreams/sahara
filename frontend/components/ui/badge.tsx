import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-theme-primary/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-theme-primary text-theme-background [a&]:hover:bg-theme-secondary",
        outline:
          "border-theme-border bg-transparent text-theme-text [a&]:hover:bg-theme-primary [a&]:hover:text-theme-background [a&]:hover:border-theme-primary",
        secondary:
          "border-transparent bg-theme-card-bg text-theme-text [a&]:hover:bg-theme-primary/10",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90",
        log_action:
          "border-gray-500/30 bg-gray-500/20 text-gray-400 [a&]:hover:bg-gray-500/30",
        pending:
          "border-yellow-500/30 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 [a&]:hover:bg-yellow-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
