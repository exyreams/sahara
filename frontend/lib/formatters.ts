import type { PublicKey } from "@solana/web3.js";
import { SOL_DECIMALS, USDC_DECIMALS } from "./constants";

/**
 * Truncate a Solana address for display
 * @param address - The address to truncate
 * @param chars - Number of characters to show on each side (default: 4)
 * @returns Truncated address (e.g., "7xKX...9Y2z")
 */
export function truncateAddress(
  address: string | PublicKey,
  chars = 6,
): string {
  const addr = typeof address === "string" ? address : address.toBase58();
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/**
 * Alias for truncateAddress for consistency
 */
export const formatAddress = truncateAddress;

/**
 * Format a number with commas
 * @param num - The number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format USDC amount from lamports to human-readable
 * @param lamports - Amount in smallest unit
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted USDC amount
 */
export function formatUSDC(lamports: number, decimals = 2): string {
  const amount = lamports / 10 ** USDC_DECIMALS;
  return amount.toFixed(decimals);
}

/**
 * Format amount with commas (generic formatter)
 * @param amount - Amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted amount string
 */
export function formatAmount(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format SOL amount from lamports to human-readable
 * @param lamports - Amount in lamports
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted SOL amount
 */
export function formatSOL(lamports: number, decimals = 4): string {
  const amount = lamports / 10 ** SOL_DECIMALS;
  return amount.toFixed(decimals);
}

/**
 * Format currency with symbol
 * @param amount - The amount to format
 * @param currency - Currency symbol (default: 'USDC')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = "USDC"): string {
  const formatted = currency === "SOL" ? formatSOL(amount) : formatUSDC(amount);
  return `${formatted} ${currency}`;
}

/**
 * Parse USDC amount from human-readable to lamports
 * @param amount - Human-readable amount
 * @returns Amount in smallest unit
 */
export function parseUSDC(amount: number): number {
  return Math.floor(amount * 10 ** USDC_DECIMALS);
}

/**
 * Parse SOL amount from human-readable to lamports
 * @param amount - Human-readable amount
 * @returns Amount in lamports
 */
export function parseSOL(amount: number): number {
  return Math.floor(amount * 10 ** SOL_DECIMALS);
}

/**
 * Format a Unix timestamp to a readable date
 * @param timestamp - Unix timestamp in seconds
 * @param includeTime - Whether to include time (default: false)
 * @returns Formatted date string
 */
export function formatDate(timestamp: number, includeTime = false): string {
  const date = new Date(timestamp * 1000);

  if (includeTime) {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a relative time (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const then = timestamp * 1000;
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? "s" : ""} ago`;
  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Format a phone number
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as +XX XXX XXX XXXX (Nepal format)
  if (cleaned.length === 12 && cleaned.startsWith("977")) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  // Format as XXX XXX XXXX (local format)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Format a percentage
 * @param value - Value to format (0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get Solana Explorer URL for a transaction
 * @param signature - Transaction signature
 * @param cluster - Solana cluster (default: 'devnet')
 * @returns Explorer URL
 */
export function getExplorerUrl(
  signature: string,
  cluster: "devnet" | "testnet" | "mainnet-beta" = "devnet",
): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/**
 * Get Solana Explorer URL for an address
 * @param address - Address to view
 * @param cluster - Solana cluster (default: 'devnet')
 * @returns Explorer URL
 */
export function getAddressExplorerUrl(
  address: string | PublicKey,
  cluster: "devnet" | "testnet" | "mainnet-beta" = "devnet",
): string {
  const addr = typeof address === "string" ? address : address.toBase58();
  return `https://explorer.solana.com/address/${addr}?cluster=${cluster}`;
}

/**
 * Format a disaster severity level
 * @param severity - Severity level (1-10)
 * @returns Severity label and color
 */
export function formatSeverity(severity: number): {
  label: string;
  color: string;
} {
  if (severity >= 8) return { label: "Critical", color: "red" };
  if (severity >= 6) return { label: "High", color: "orange" };
  if (severity >= 4) return { label: "Moderate", color: "yellow" };
  return { label: "Low", color: "green" };
}

/**
 * Format verification status
 * @param approvals - Number of approvals
 * @param threshold - Required threshold (default: 3)
 * @returns Status label and color
 */
export function formatVerificationProgress(
  approvals: number,
  threshold = 3,
): { label: string; color: string; percentage: number } {
  const percentage = (approvals / threshold) * 100;

  if (approvals >= threshold) {
    return { label: "Verified", color: "green", percentage: 100 };
  }

  return {
    label: `${approvals}/${threshold} approvals`,
    color: "yellow",
    percentage,
  };
}

/**
 * Capitalize first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format verification status from Anchor enum to string
 * @param status - Verification status object from Anchor
 * @returns Status string ("Pending" or "Verified")
 */
export function formatVerificationStatus(status: unknown): string {
  if (typeof status === "string") return status;
  if (typeof status === "object" && status !== null) {
    if ("verified" in status) return "Verified";
    if ("pending" in status) return "Pending";
  }
  return "Pending";
}

/**
 * Format a list of items with commas and "and"
 * @param items - Array of items
 * @returns Formatted string
 */
export function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Format file size in bytes to human-readable
 * @param bytes - File size in bytes
 * @returns Formatted file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
