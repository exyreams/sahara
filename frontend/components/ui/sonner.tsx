"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      className="toaster group"
      theme={theme as ToasterProps["theme"]}
      duration={3000}
      icons={{
        success: <CircleCheckIcon className="size-4 text-theme-primary" />,
        info: <InfoIcon className="size-4 text-theme-primary" />,
        warning: <TriangleAlertIcon className="size-4 text-theme-secondary" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: (
          <Loader2Icon className="size-4 animate-spin text-theme-primary" />
        ),
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "!bg-theme-card-bg !text-theme-text !border !border-theme-border !shadow-lg rounded-lg",
          title: "!text-theme-text-highlight !font-medium",
          description: "!text-theme-text/80",
          actionButton:
            "!bg-theme-primary !text-theme-background !border-0 hover:!bg-theme-secondary",
          cancelButton:
            "!bg-theme-background !text-theme-text !border !border-theme-border hover:!bg-theme-primary/10",
          closeButton:
            "!bg-theme-background !text-theme-text !border !border-theme-border hover:!bg-theme-primary/10",
          success: "!text-theme-text",
          error: "!text-theme-text",
          warning: "!text-theme-text",
          info: "!text-theme-text",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
