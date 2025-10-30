"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatAddress,
  formatAmount,
  formatDate,
  getExplorerUrl,
} from "@/lib/formatters";
import type { DonationRecord, DonationType } from "@/types/program";

interface TransactionHistoryProps {
  transactions: DonationRecord[];
  loading?: boolean;
  cluster?: "devnet" | "testnet" | "mainnet-beta";
}

export function TransactionHistory({
  transactions,
  loading = false,
  cluster = "devnet",
}: TransactionHistoryProps) {
  const [filterType, setFilterType] = useState<DonationType | "all">("all");

  const filteredTransactions =
    filterType === "all"
      ? transactions
      : transactions.filter((tx) => tx.donationType === filterType);

  const getTransactionIcon = (type: DonationType) => {
    switch (type) {
      case "Direct":
        return <ArrowUpRight className="h-4 w-4" />;
      case "Pool":
        return <Users className="h-4 w-4" />;
      case "Anonymous":
        return <ArrowDownRight className="h-4 w-4" />;
      default:
        return <ArrowUpRight className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: DonationType) => {
    switch (type) {
      case "Direct":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
      case "Pool":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
      case "Anonymous":
        return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Select
            value={filterType}
            onValueChange={(value) =>
              setFilterType(value as DonationType | "all")
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Direct">Direct</SelectItem>
              <SelectItem value="Pool">Pool</SelectItem>
              <SelectItem value="Anonymous">Anonymous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.publicKey.toString()}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`p-2 rounded-full ${getTransactionColor(tx.donationType)}`}
                >
                  {getTransactionIcon(tx.donationType)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {tx.donationType}
                    </Badge>
                    {tx.isAnonymous && (
                      <Badge variant="secondary" className="text-xs">
                        Anonymous
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">From:</span>
                    <code className="text-xs">
                      {tx.isAnonymous ? "Anonymous" : formatAddress(tx.donor)}
                    </code>
                    <span className="text-muted-foreground">→</span>
                    <code className="text-xs">
                      {formatAddress(tx.recipient)}
                    </code>
                  </div>
                  {tx.message && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      "{tx.message}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(tx.timestamp, true)}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {formatAmount(tx.amount)} USDC
                  </p>
                  {tx.platformFee > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Fee: {formatAmount(tx.platformFee)} USDC
                    </p>
                  )}
                </div>

                {/* Explorer Link */}
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={getExplorerUrl(tx.transactionSignature, cluster)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
