"use client";

import type { DisasterEvent } from "@/types/program";
import { MapWrapper } from "./map-wrapper";

interface DisasterMapProps {
  disasters: DisasterEvent[];
}

/**
 * Disaster Map Component
 *
 * Displays disaster events on a map with markers colored by severity.
 * This is a placeholder - implement with Mapbox GL JS for full functionality.
 */
export function DisasterMap({ disasters }: DisasterMapProps) {
  return (
    <MapWrapper
      title="Disaster Locations"
      description={`Showing ${disasters.length} disaster event${disasters.length !== 1 ? "s" : ""}`}
      height="500px"
    >
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {disasters.length} disaster{disasters.length !== 1 ? "s" : ""} ready
          to display
        </p>
        <p className="text-xs text-muted-foreground">
          Configure Mapbox to visualize locations
        </p>
      </div>
    </MapWrapper>
  );
}
