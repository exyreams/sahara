"use client";

import { MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MapWrapperProps {
  title?: string;
  description?: string;
  height?: string;
  children?: React.ReactNode;
}

/**
 * Map Wrapper Component
 *
 * This is a placeholder component for map integration.
 * To enable full map functionality:
 * 1. Install mapbox-gl: bun add mapbox-gl
 * 2. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
 * 3. Implement actual Mapbox GL JS integration
 */
export function MapWrapper({
  title = "Map View",
  description = "Geographic visualization",
  height = "400px",
  children,
}: MapWrapperProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div
          className="bg-muted rounded-lg flex items-center justify-center"
          style={{ height }}
        >
          {children || (
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Map visualization coming soon</p>
              <p className="text-xs mt-1">
                Requires Mapbox API key configuration
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
