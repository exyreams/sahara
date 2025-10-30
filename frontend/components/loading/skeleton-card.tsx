import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SkeletonCardProps {
  showHeader?: boolean;
  lines?: number;
  height?: string;
}

/**
 * Skeleton Card Component
 *
 * Loading placeholder for card-based content.
 */
export function SkeletonCard({
  showHeader = true,
  lines = 3,
  height,
}: SkeletonCardProps) {
  return (
    <Card className="animate-pulse">
      {showHeader && (
        <CardHeader>
          <div className="h-5 bg-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </CardHeader>
      )}
      <CardContent
        className="space-y-3"
        style={height ? { height } : undefined}
      >
        {Array.from({ length: lines }, (_, i) => {
          const uniqueId = `skeleton-line-${Date.now()}-${i}`;
          return (
            <div
              key={uniqueId}
              className="h-4 bg-muted rounded"
              style={{ width: `${100 - i * 10}%` }}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
