/**
 * ResourceList component
 * 
 * Scrollable sidebar displaying a list of resource cards.
 * Handles click events to fly to locations on the map.
 */

import { ResourceCard } from './ResourceCard';
import { LoadingSkeleton } from './LoadingSkeleton';
import type { Resource } from '@/types/resource';
import type mapboxgl from 'mapbox-gl';
import { parsePostGISPoint } from '@/lib/postgis';
import { useMemo } from 'react';

interface ReviewStats {
  [locationId: number]: {
    averageRating: number;
    reviewCount: number;
  };
}

interface ResourceListProps {
  /** Array of resources to display */
  resources: Resource[];
  /** Loading state */
  loading?: boolean;
  /** Mapbox map instance for flyTo navigation */
  map?: mapboxgl.Map | null;
  /** Click handler for resource cards */
  onResourceClick?: (resource: Resource) => void;
  /** Callback to mark programmatic map movement */
  onProgrammaticMove?: () => void;
  /** Starting location for distance calculation */
  startingLocation?: [number, number] | null;
  /** Review statistics per location */
  reviewStats?: ReviewStats;
  /** Callback when a review is submitted */
  onReviewSubmitted?: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component that displays a scrollable list of resources
 * 
 * Shows resource cards in a sidebar. Clicking a card will
 * fly the map to that resource's location.
 */
export function ResourceList({
  resources,
  loading = false,
  map,
  onResourceClick,
  onProgrammaticMove,
  startingLocation,
  reviewStats = {},
  onReviewSubmitted,
  className = '',
}: ResourceListProps) {
  // Get map center as fallback for distance calculation
  const mapCenter = useMemo(() => {
    if (startingLocation) {
      return startingLocation;
    }
    if (map) {
      const center = map.getCenter();
      if (center) {
        return [center.lng, center.lat] as [number, number];
      }
    }
    return null;
  }, [map, startingLocation]);

  const handleCardClick = (resource: Resource) => {
    // Fly to location on map
    if (map && resource.location) {
      try {
        const [lng, lat] = parsePostGISPoint(resource.location);
        // Mark as programmatic move to prevent triggering moveend handler
        onProgrammaticMove?.();
        map.flyTo({
          center: [lng, lat],
          zoom: 14,
          duration: 1000,
        });
      } catch (error) {
        console.error('Error parsing location for flyTo:', error);
      }
    }

    // Call custom click handler
    onResourceClick?.(resource);
  };

  if (loading) {
    return (
      <div className={`h-full overflow-y-auto p-4 ${className}`}>
        <LoadingSkeleton count={5} />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className={`h-full overflow-y-auto p-4 ${className}`}>
        <div className="text-center text-gray-500 mt-8">
          <p className="text-lg mb-2">No resources found</p>
          <p className="text-sm">
            Try adjusting your search or map view
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-4 space-y-4 ${className}`}>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {resources.length} {resources.length === 1 ? 'result' : 'results'}
        </p>
      </div>

      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onClick={handleCardClick}
          startingLocation={mapCenter}
          averageRating={reviewStats[resource.id]?.averageRating}
          reviewCount={reviewStats[resource.id]?.reviewCount}
          onReviewSubmitted={onReviewSubmitted}
        />
      ))}
    </div>
  );
}
