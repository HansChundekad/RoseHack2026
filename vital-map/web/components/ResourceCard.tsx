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
import { MapPin, Send, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateDistance } from '@/lib/geocoding';
import type { Resource } from '@/types/resource';
import { parsePostGISPoint } from '@/lib/postgis';
import { getBadgeColor, getBorderColor } from '@/lib/categoryColors';

interface ResourceCardProps {
  /** Resource data to display */
  resource: Resource;
  /** Click handler for card interaction */
  onClick?: (resource: Resource) => void;
  /** Starting location for distance calculation */
  startingLocation?: [number, number] | null;
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
  className = '',
}: ResourceCardProps) {
  // Truncate description to 120 characters
  const truncatedDescription =
    resource.description.length > 120
      ? `${resource.description.substring(0, 120)}...`
      : resource.description;

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
  const borderColor = getBorderColor(resource.category);

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow cursor-pointer bg-white',
        borderColor,
        'border-l-4', // Left border accent in category color
        className
      )}
      onClick={() => onClick?.(resource)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold flex-1 text-gray-900">
            {resource.name}
          </h3>
          <Badge
            className={cn(
              'text-xs font-medium px-2 py-1',
              badgeColor
            )}
          >
            {resource.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {/* Distance and rating row */}
        <div className="flex items-center gap-3 text-sm">
          {distance !== null && distance !== Infinity && !isNaN(distance) && (
            <span className="text-green-600 font-medium">
              {distance.toFixed(1)} mi
            </span>
          )}
          {resource.trust_score !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">⭐</span>
              <span className="text-gray-700">
                {resource.trust_score / 20}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 leading-relaxed">
          {truncatedDescription}
        </p>

        {/* Address */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="h-3 w-3" />
          <span>{formatAddress(resource.location, resource.address)}</span>
        </div>

        {/* Phone Number - conditional */}
        {resource.phone_number && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Phone className="h-3 w-3" />
            <a
              href={`tel:${resource.phone_number}`}
              className="hover:text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {resource.phone_number}
            </a>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-3">
        <button
          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(resource);
          }}
        >
          <Send className="h-3 w-3" />
          <span>View on map</span>
        </button>
      </CardFooter>
    </Card>
  );
}
