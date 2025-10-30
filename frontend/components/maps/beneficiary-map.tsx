"use client";

import type { Beneficiary } from "@/types/program";
import { MapWrapper } from "./map-wrapper";

interface BeneficiaryMapProps {
  beneficiaries: Beneficiary[];
  disasterId?: string;
}

/**
 * Beneficiary Map Component
 *
 * Displays beneficiary locations with clustering for nearby beneficiaries.
 * This is a placeholder - implement with Mapbox GL JS for full functionality.
 */
export function BeneficiaryMap({
  beneficiaries,
  disasterId,
}: BeneficiaryMapProps) {
  const filteredBeneficiaries = disasterId
    ? beneficiaries.filter((b) => b.disasterId === disasterId)
    : beneficiaries;

  const verifiedCount = filteredBeneficiaries.filter(
    (b) => b.verificationStatus === "Verified",
  ).length;

  return (
    <MapWrapper
      title="Beneficiary Locations"
      description={`${filteredBeneficiaries.length} beneficiaries (${verifiedCount} verified)`}
      height="500px"
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {filteredBeneficiaries.length} beneficiar
          {filteredBeneficiaries.length !== 1 ? "ies" : "y"} ready to display
        </p>
        <p className="text-xs text-muted-foreground">
          Configure Mapbox to visualize locations with clustering
        </p>
      </div>
    </MapWrapper>
  );
}
