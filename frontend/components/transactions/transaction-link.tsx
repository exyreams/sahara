"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExplorerUrl } from "@/lib/formatters";

interface TransactionLinkProps {
  signature: string;
  cluster?: "devnet" | "testnet" | "mainnet-beta";
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function TransactionLink({
  signature,
  cluster = "devnet",
  variant = "link",
  size = "sm",
  showIcon = true,
  children,
}: TransactionLinkProps) {
  return (
    <Button variant={variant} size={size} asChild>
      <a
        href={getExplorerUrl(signature, cluster)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1"
      >
        {children || "View on Explorer"}
        {showIcon && <ExternalLink className="h-3 w-3" />}
      </a>
    </Button>
  );
}
