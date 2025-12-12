"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Calendar,
  Heart,
  MapPin,
  RefreshCw,
  Search,
  Target,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { VerifiedIcon } from "@/components/icons/verified-icon";
import { SortDropdown } from "@/components/search/sort-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAllNGOs } from "@/hooks/use-all-ngos";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "most-active", label: "Most Active" },
  { value: "most-aid", label: "Most Aid Distributed" },
  { value: "most-beneficiaries", label: "Most Beneficiaries" },
  { value: "recently-verified", label: "Recently Verified" },
  { value: "alphabetical", label: "Alphabetical" },
];

export default function NGODirectoryPage() {
  const { ngos, loading, refetch } = useAllNGOs();
  const [searchQuery, setSearchQuery] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("most-active");

  // Filter and sort NGOs
  const filteredAndSortedNGOs = useMemo(() => {
    const filtered = ngos.filter((ngo) => {
      // Filter out blacklisted NGOs from public view
      if (ngo.isBlacklisted) return false;

      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        ngo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ngo.focusAreas.some((area) =>
          area.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ||
        ngo.operatingDistricts.some((district) =>
          district.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      // Verification filter
      const matchesVerification =
        verifiedFilter === "all" ||
        (verifiedFilter === "verified" && ngo.isVerified) ||
        (verifiedFilter === "unverified" && !ngo.isVerified);

      return matchesSearch && matchesVerification;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "most-active":
          return b.lastActivityAt - a.lastActivityAt;
        case "most-aid":
          return b.totalAidDistributed - a.totalAidDistributed;
        case "most-beneficiaries":
          return b.beneficiariesRegistered - a.beneficiariesRegistered;
        case "recently-verified":
          return (b.verifiedAt || 0) - (a.verifiedAt || 0);
        case "alphabetical":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [ngos, searchQuery, verifiedFilter, sortBy]);

  const stats = useMemo(() => {
    const activeNGOs = ngos.filter((ngo) => ngo.isActive && !ngo.isBlacklisted);
    const verifiedNGOs = activeNGOs.filter((ngo) => ngo.isVerified);
    const totalBeneficiaries = activeNGOs.reduce(
      (sum, ngo) => sum + ngo.beneficiariesRegistered,
      0,
    );
    const totalAid = activeNGOs.reduce(
      (sum, ngo) => sum + ngo.totalAidDistributed,
      0,
    );

    return {
      total: activeNGOs.length,
      verified: verifiedNGOs.length,
      totalBeneficiaries,
      totalAid,
    };
  }, [ngos]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-theme-text-highlight mb-2">
          NGO Directory
        </h1>
        <p className="text-theme-text/80 text-lg">
          Browse verified and active NGOs working on disaster relief
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-theme-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-theme-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-text-highlight">
                  {stats.total}
                </p>
                <p className="text-sm text-theme-text/60">Active NGOs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <VerifiedIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-text-highlight">
                  {stats.verified}
                </p>
                <p className="text-sm text-theme-text/60">Verified NGOs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-text-highlight">
                  {stats.totalBeneficiaries.toLocaleString()}
                </p>
                <p className="text-sm text-theme-text/60">
                  Beneficiaries Helped
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Heart className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-text-highlight">
                  ${(stats.totalAid / 1_000_000).toFixed(2)}M
                </p>
                <p className="text-sm text-theme-text/60">Aid Distributed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-text/40" />
          <Input
            placeholder="Search by name, focus area, or district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={verifiedFilter === "all" ? "default" : "outline"}
            onClick={() => setVerifiedFilter("all")}
          >
            All
          </Button>
          <Button
            variant={verifiedFilter === "verified" ? "default" : "outline"}
            onClick={() => setVerifiedFilter("verified")}
          >
            Verified
          </Button>
          <Button
            variant={verifiedFilter === "unverified" ? "default" : "outline"}
            onClick={() => setVerifiedFilter("unverified")}
          >
            Unverified
          </Button>
        </div>

        <SortDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onValueChange={setSortBy}
        />

        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-theme-text/60">
          Showing {filteredAndSortedNGOs.length} of{" "}
          {ngos.filter((n) => !n.isBlacklisted).length} NGOs
        </p>
      </div>

      {/* NGO Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-theme-border rounded w-3/4 mb-2" />
                <div className="h-4 bg-theme-border rounded w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-theme-border rounded w-full" />
                  <div className="h-4 bg-theme-border rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAndSortedNGOs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-theme-text/20 mx-auto mb-4" />
            <p className="text-theme-text/60">
              No NGOs found matching your criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedNGOs.map((ngo) => (
              <motion.div
                key={ngo.publicKey.toString()}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <span className="line-clamp-1">{ngo.name}</span>
                        {ngo.isVerified && (
                          <VerifiedIcon
                            className="h-5 w-5 flex-shrink-0"
                            tooltip="Verified NGO"
                          />
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {ngo.description || "No description available"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Focus Areas */}
                    {ngo.focusAreas.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-theme-text/60" />
                          <span className="text-sm font-medium text-theme-text/80">
                            Focus Areas
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ngo.focusAreas.slice(0, 3).map((area, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {area}
                            </Badge>
                          ))}
                          {ngo.focusAreas.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{ngo.focusAreas.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Operating Districts */}
                    {ngo.operatingDistricts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-theme-text/60" />
                          <span className="text-sm font-medium text-theme-text/80">
                            Operating In
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ngo.operatingDistricts
                            .slice(0, 3)
                            .map((district, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {district}
                              </Badge>
                            ))}
                          {ngo.operatingDistricts.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{ngo.operatingDistricts.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme-border">
                      <div>
                        <p className="text-xs text-theme-text/60 mb-1">
                          Beneficiaries
                        </p>
                        <p className="text-lg font-semibold text-theme-text-highlight">
                          {ngo.beneficiariesRegistered.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-theme-text/60 mb-1">
                          Aid Distributed
                        </p>
                        <p className="text-lg font-semibold text-theme-text-highlight">
                          ${(ngo.totalAidDistributed / 1_000_000).toFixed(2)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-theme-text/60 mb-1">
                          Active Pools
                        </p>
                        <p className="text-lg font-semibold text-theme-text-highlight">
                          {ngo.poolsCreated}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-theme-text/60 mb-1">
                          Field Workers
                        </p>
                        <p className="text-lg font-semibold text-theme-text-highlight">
                          {ngo.fieldWorkersCount}
                        </p>
                      </div>
                    </div>

                    {/* Last Activity */}
                    <div className="flex items-center gap-2 text-xs text-theme-text/60 pt-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Last active:{" "}
                        {new Date(
                          ngo.lastActivityAt * 1000,
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Contact Info */}
                    {ngo.website && (
                      <div className="pt-2">
                        <a
                          href={ngo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-theme-primary hover:underline"
                        >
                          Visit Website →
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
