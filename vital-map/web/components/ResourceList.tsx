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
import { useMemo, useEffect, useRef } from 'react';

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
  /** ID of the currently selected resource */
  selectedResourceId?: number | null;
  /** Active tab for empty state messaging */
  activeTab?: 'all' | 'clinical' | 'community' | 'events';
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
  selectedResourceId,
  activeTab = 'all',
  className = '',
}: ResourceListProps) {
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Scroll to selected card when selectedResourceId changes
  useEffect(() => {
    if (selectedResourceId == null) return;
    const el = cardRefs.current.get(selectedResourceId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedResourceId]);

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
    const isFilteredTab = activeTab !== 'all';
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center w-full h-full">
          {isFilteredTab ? (
            <div className="animate-fade-in relative w-full h-full overflow-hidden flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--tp-light)' }}>
              {/* Background leaf pattern */}
              <div className="absolute inset-0 opacity-10 pointer-events-none select-none flex items-center justify-center gap-6 text-6xl">
                <span className="-rotate-12">🌿</span>
                <span className="rotate-12 mt-8">🍃</span>
                <span className="-rotate-45 -mt-4">🌱</span>
              </div>
              <div className="relative">
                <p className="text-5xl mb-2 animate-bounce-slow">🍵</p>
                <p
                  className="text-3xl font-display font-bold tracking-tight mb-1"
                  style={{ color: 'var(--tp-text)' }}
                >
                  Coming soon
                </p>
                <p
                  className="text-lg font-display font-normal tracking-tight"
                  style={{ color: 'var(--tp-muted)' }}
                >
                  Stay tuned for {activeTab} resources
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <p
                className="text-lg font-display font-semibold mb-2"
                style={{ color: 'var(--tp-text)' }}
              >
                No resources found
              </p>
              <p className="text-sm" style={{ color: 'var(--tp-muted)' }}>
                Try adjusting your search or map view
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-4 flex flex-col gap-4 ${className}`}>
      <div className="mb-4">
        <p className="text-sm" style={{ color: 'var(--tp-muted)' }}>
          {resources.length} {resources.length === 1 ? 'result' : 'results'}
        </p>
      </div>

      {resources.map((resource) => (
        <div
          key={resource.id}
          ref={(el) => {
            if (el) cardRefs.current.set(resource.id, el);
            else cardRefs.current.delete(resource.id);
          }}
        >
          <ResourceCard
            resource={resource}
            onClick={handleCardClick}
            startingLocation={mapCenter}
            isSelected={resource.id === selectedResourceId}
          />
        </div>
      ))}
    </div>
  );
}
