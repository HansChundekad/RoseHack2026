/**
 * ResourceCard component
 * 
 * Displays a single resource (clinical facility, community center, etc.)
 * with name, category, description, trust score, and event indicators.
 */

import { TrustScoreBadge } from './TrustScoreBadge';
import { EventIndicator } from './EventIndicator';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Resource } from '@/types/resource';

interface ResourceCardProps {
  /** Resource data to display */
  resource: Resource;
  /** Click handler for card interaction */
  onClick?: (resource: Resource) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component that displays a resource card
 * 
 * Shows resource information with category-specific styling,
 * trust scores for community resources, and event indicators.
 * Uses shadcn/ui Card and Badge components.
 */
export function ResourceCard({
  resource,
  onClick,
  className = '',
}: ResourceCardProps) {
  // Truncate description to 150 characters
  const truncatedDescription =
    resource.description.length > 150
      ? `${resource.description.substring(0, 150)}...`
      : resource.description;

  // Category color mapping for badges
  const categoryVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    clinical: 'default',
    community: 'secondary',
    farm: 'secondary',
    healer: 'secondary',
    event: 'outline',
  };

  const categoryVariant =
    categoryVariants[resource.category] || 'outline';

  return (
    <Card
      className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}
      onClick={() => onClick?.(resource)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold flex-1">
            {resource.name}
          </h3>
          <Badge variant={categoryVariant}>
            {resource.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Trust score and event indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          {resource.trust_score !== undefined && (
            <TrustScoreBadge score={resource.trust_score} />
          )}
          {resource.is_happening_now && (
            <EventIndicator
              isHappeningNow={resource.is_happening_now}
              eventStart={resource.event_start}
              eventEnd={resource.event_end}
            />
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {truncatedDescription}
        </p>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
        <span>Click to view on map</span>
        <MapPin className="h-4 w-4" />
      </CardFooter>
    </Card>
  );
}
