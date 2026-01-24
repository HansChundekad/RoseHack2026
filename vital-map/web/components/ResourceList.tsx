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

interface ResourceListProps {
  /** Array of resources to display */
  resources: Resource[];
  /** Loading state */
  loading?: boolean;
  /** Mapbox map instance for flyTo navigation */
  map?: mapboxgl.Map | null;
  /** Click handler for resource cards */
  onResourceClick?: (resource: Resource) => void;
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
  className = '',
}: ResourceListProps) {
  const handleCardClick = (resource: Resource) => {
    // Fly to location on map
    if (map && resource.location) {
      try {
        const [lng, lat] = parsePostGISPoint(resource.location);
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
        <h2 className="text-xl font-semibold text-gray-900">
          Resources
        </h2>
        <p className="text-sm text-gray-600">
          {resources.length} {resources.length === 1 ? 'result' : 'results'}
        </p>
      </div>

      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onClick={handleCardClick}
        />
      ))}
    </div>
  );
}
