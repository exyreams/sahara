import type { Location } from "@/types/program";

/**
 * Get the region (district) from location, handling both new and legacy formats
 */
export function getLocationRegion(location: Location): string {
  return location.region || location.district || "";
}

/**
 * Get the area (ward) from location, handling both new and legacy formats
 */
export function getLocationArea(location: Location): string {
  return location.area || location.ward || "";
}

/**
 * Format location for display as "Region, Area" or fallback to legacy "District, Ward"
 */
export function formatLocationDisplay(location: Location): string {
  const region = getLocationRegion(location);
  const area = getLocationArea(location);

  if (!region && !area) return "";
  if (!area) return region;
  if (!region) return area;

  // Check if we're using legacy format
  if (location.district && location.ward) {
    return `${location.district}, Ward ${location.ward}`;
  }

  return `${region}, ${area}`;
}
