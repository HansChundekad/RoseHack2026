/**
 * ResourceCard component
 *
 * Displays a single resource (clinical facility, community center, etc.)
 * with name, category, description, trust score, and event indicators.
 */

'use client';

import { useState } from 'react';
import { TrustScoreBadge } from './TrustScoreBadge';
import { EventIndicator } from './EventIndicator';
import { ReviewModal } from './ReviewModal';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Phone, Star, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateDistance } from '@/lib/geocoding';
import type { Resource } from '@/types/resource';
import { parsePostGISPoint } from '@/lib/postgis';
import { getBadgeColor } from '@/lib/categoryColors';

interface ResourceCardProps {
  /** Resource data to display */
  resource: Resource;
  /** Click handler for card interaction */
  onClick?: (resource: Resource) => void;
  /** Starting location for distance calculation */
  startingLocation?: [number, number] | null;
  /** Whether this card is currently selected/linked to the map */
  isSelected?: boolean;
  /** Whether this card is highlighted via marker hover */
  isHovered?: boolean;
  /** Average rating from reviews */
  averageRating?: number;
  /** Number of reviews */
  reviewCount?: number;
  /** Callback when review is submitted */
  onReviewSubmitted?: () => void;
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
  startingLocation,
  isSelected = false,
  isHovered = false,
  averageRating,
  reviewCount,
  onReviewSubmitted,
  className = '',
}: ResourceCardProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Calculate distance if starting location is provided
  let distance: number | null = null;
  if (startingLocation && resource.location) {
    try {
      const [lng, lat] = parsePostGISPoint(resource.location);
      distance = calculateDistance(
        startingLocation[1], // lat
        startingLocation[0], // lng
        lat,
        lng
      );
    } catch (error) {
      console.error('Distance calculation error:', error);
      // Distance calculation failed, continue without it
    }
  }

  // Format address - prefer actual address over coordinates
  const formatAddress = (location: string | null, address?: string): string => {
    // If we have a proper address, use it
    if (address && address.trim()) {
      return address;
    }

    // Fall back to coordinates from location
    if (!location) return 'Location not available';
    try {
      const [lng, lat] = parsePostGISPoint(location);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return 'Location not available';
    }
  };

  // Get category-specific colors
  const badgeColor = getBadgeColor(resource.category);

  return (
    <Card
      className={cn(
        'rounded-2xl border border-gray-100 shadow-sm',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer',
        isSelected && 'ring-2 ring-(--tp-primary) ring-offset-2',
        isHovered && 'shadow-md -translate-y-0.5 border-[var(--tp-primary)]',
        className
      )}
      onClick={() => onClick?.(resource)}
    >
      <CardHeader className="p-6 pb-0">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="text-lg font-semibold flex-1 font-display"
            style={{ color: 'var(--tp-text)' }}
          >
            {resource.name}
          </h3>
          <Badge
            className={cn(
              'rounded-full text-xs font-medium px-3 py-1',
              badgeColor
            )}
          >
            {resource.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-3 space-y-3">
        {/* Distance and rating row */}
        <div className="flex items-center gap-3 text-sm">
          {distance !== null && distance !== Infinity && !isNaN(distance) && (
            <span className="text-sm font-medium" style={{ color: 'var(--tp-primary)' }}>
              {distance.toFixed(1)} mi
            </span>
          )}
          {averageRating !== undefined && averageRating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-700 font-medium">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-gray-500">
                ({reviewCount})
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {resource.description}
        </p>

        {/* Address */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{formatAddress(resource.location, resource.address)}</span>
        </div>

        {/* Phone Number - conditional */}
        {resource.phone_number && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`tel:${resource.phone_number}`}
              className="hover:underline"
              style={{ color: 'var(--tp-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {resource.phone_number}
            </a>
          </div>
        )}

        {/* Website URL - conditional */}
        {resource.website_url && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <a
              href={resource.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--tp-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {resource.website_url}
            </a>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-6 pt-0 pb-6 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs text-(--tp-primary) hover:bg-(--tp-primary)/10"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(resource);
          }}
        >
          <Navigation className="h-3.5 w-3.5 mr-1" />
          View on map
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs text-blue-600 hover:bg-blue-50 ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            setIsReviewModalOpen(true);
          }}
        >
          <Star className="h-3.5 w-3.5 mr-1" />
          Leave a Review
        </Button>
      </CardFooter>

      <ReviewModal
        locationId={resource.id}
        locationName={resource.name}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSuccess={() => {
          console.log('Review submitted successfully for:', resource.name);
          onReviewSubmitted?.();
        }}
      />
    </Card>
  );
}
