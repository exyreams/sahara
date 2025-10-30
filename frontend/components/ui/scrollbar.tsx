"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal" | "both";
}

export function ScrollArea({
  children,
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaProps) {
  const overflowClasses = cn(
    orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
    orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
    orientation === "both" && "overflow-auto",
  );

  return (
    <div className={cn(overflowClasses, className)} {...props}>
      {children}
    </div>
  );
}
