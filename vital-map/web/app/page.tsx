'use client';

/**
 * Main application page
 * 
 * Implements the full-viewport split-view layout with:
 * - Header with search and tabs (fixed at top)
 * - Left sidebar (40%) for resource list
 * - Right map view (60%) for Mapbox GL JS
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { ResourceList } from '@/components/ResourceList';
import MapView from '@/components/MapView';
import { useResources } from '@/hooks/useResources';
import { useTemporalSync } from '@/hooks/useTemporalSync';
import { calculateDistance } from '@/lib/geocoding';
import { parsePostGISPoint } from '@/lib/postgis';
import { generateEmbedding } from '@/lib/embeddings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type mapboxgl from 'mapbox-gl';
import type { Resource } from '@/types/resource';

export default function Home() {
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'clinical' | 'community' | 'events'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const [hoveredResourceId, setHoveredResourceId] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [startingLocation, setStartingLocation] = useState<[number, number] | null>(
    null
  );

  const {
    resources,
    loading,
    error,
    semanticSearch,
    matchLocations,
    getHappeningNow,
  } = useResources();

  const { updateTemporalStatus } = useTemporalSync();

  // Get Mapbox token from environment
  const mapboxToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  // Handle search submission
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        try {
          // Convert text query to embedding vector
          const embedding = await generateEmbedding(query);

          // Perform semantic search with the embedding
          await semanticSearch(embedding);
        } catch (error) {
          console.error('Error generating embedding:', error);
          // Fallback to spatial search if embedding fails
          if (mapInstance) {
            const bounds = mapInstance.getBounds();
            if (bounds) {
              await matchLocations({
                minLng: bounds.getWest(),
                minLat: bounds.getSouth(),
                maxLng: bounds.getEast(),
                maxLat: bounds.getNorth(),
              });
            }
          }
        }
      } else {
        // If no query, load resources for current map bounds
        if (mapInstance) {
          const bounds = mapInstance.getBounds();
          if (bounds) {
            await matchLocations({
              minLng: bounds.getWest(),
              minLat: bounds.getSouth(),
              maxLng: bounds.getEast(),
              maxLat: bounds.getNorth(),
            });
          }
        }
      }
    },
    [semanticSearch, matchLocations, mapInstance]
  );

  // Handle tab change — filtering is done client-side via filteredResources
  const handleTabChange = useCallback(
    (tab: 'all' | 'clinical' | 'community' | 'events') => {
      setActiveTab(tab);
    },
    []
  );

  // Track if map movement is programmatic (to prevent infinite loops)
  const isProgrammaticMove = useRef(false);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle starting location set
  const handleLocationSet = useCallback(
    (coordinates: [number, number]) => {
      setStartingLocation(coordinates);
      if (mapInstance) {
        mapInstance.flyTo({
          center: coordinates,
          zoom: 12,
          duration: 1000,
        });
        // Load resources for new location
        setTimeout(() => {
          const bounds = mapInstance.getBounds();
          if (bounds) {
            matchLocations({
              minLng: bounds.getWest(),
              minLat: bounds.getSouth(),
              maxLng: bounds.getEast(),
              maxLat: bounds.getNorth(),
            });
          }
        }, 1100);
      }
    },
    [mapInstance, matchLocations]
  );

  // Handle map ready
  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      setMapInstance(map);

      // If starting location is set, center map there
      if (startingLocation) {
        map.flyTo({
          center: startingLocation,
          zoom: 12,
        });
      }

      // Initial resources are loaded by get_all_locations on mount.
      // No need to call matchLocations here — it would overwrite with a subset.

      // Update resources when map moves (throttled to prevent excessive updates)
      // DISABLED TEMPORARILY - Only update on initial load and manual search
      // Uncomment below to re-enable auto-update on map movement
      /*
      map.on('moveend', () => {
        // Skip if this was a programmatic move (like flyTo)
        if (isProgrammaticMove.current) {
          isProgrammaticMove.current = false;
          return;
        }

        // Clear any pending timeout
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }

        // Throttle: wait 1000ms after map stops moving before fetching
        moveTimeoutRef.current = setTimeout(() => {
          const newBounds = map.getBounds();
          if (newBounds) {
            matchLocations({
              minLng: newBounds.getWest(),
              minLat: newBounds.getSouth(),
              maxLng: newBounds.getEast(),
              maxLat: newBounds.getNorth(),
            });
          }
        }, 1000);
      });
      */
    },
    [matchLocations, startingLocation]
  );

  // Filter resources by active tab (memoized to prevent unnecessary recalculations)
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'clinical') return resource.category === 'clinical';
      if (activeTab === 'community')
        return ['community', 'farm', 'healer'].includes(resource.category);
      if (activeTab === 'events') return resource.category === 'event';
      return true;
    });
  }, [resources, activeTab]);

  // Update temporal status for filtered resources (memoized)
  // Only update if the resource IDs or event times have changed
  const resourcesWithTemporalStatus = useMemo(() => {
    if (filteredResources.length === 0) {
      return filteredResources;
    }
    return updateTemporalStatus(filteredResources);
  }, [filteredResources, updateTemporalStatus]);

  // Sort resources by distance (primary) and category (secondary)
  const sortedResources = useMemo(() => {
    if (!startingLocation || resourcesWithTemporalStatus.length === 0) {
      return resourcesWithTemporalStatus;
    }

    // Calculate distance for each resource and add it to a sortable array
    const resourcesWithDistance = resourcesWithTemporalStatus.map((resource) => {
      let distance: number | null = null;
      try {
        if (resource.location) {
          const [lng, lat] = parsePostGISPoint(resource.location);
          distance = calculateDistance(
            startingLocation[1],
            startingLocation[0],
            lat,
            lng
          );
        }
      } catch {
        // If distance calculation fails, use a large number so it sorts to the end
        distance = Infinity;
      }

      return {
        resource,
        distance: distance ?? Infinity,
      };
    });

    // Sort by distance (ascending), then by category for same distance
    const categoryOrder: Record<string, number> = {
      clinical: 1,
      community: 2,
      farm: 3,
      healer: 4,
      event: 5,
    };

    resourcesWithDistance.sort((a, b) => {
      // Primary sort: distance
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      // Secondary sort: category
      const categoryA = categoryOrder[a.resource.category] || 99;
      const categoryB = categoryOrder[b.resource.category] || 99;
      return categoryA - categoryB;
    });

    // Return just the resources in sorted order
    return resourcesWithDistance.map((item) => item.resource);
  }, [resourcesWithTemporalStatus, startingLocation]);

  // Handle resource click (card or marker)
  const handleResourceClick = useCallback((resource: Resource) => {
    setSelectedResourceId((prev) =>
      prev === resource.id ? null : resource.id
    );
  }, []);

  // Handle marker click — select, zoom map, and scroll to card
  const handleMarkerClick = useCallback((resource: Resource) => {
    setSelectedResourceId((prev) =>
      prev === resource.id ? null : resource.id
    );

    // Zoom into the marker location
    if (mapInstance && resource.location) {
      try {
        const [lng, lat] = parsePostGISPoint(resource.location);
        isProgrammaticMove.current = true;
        mapInstance.flyTo({
          center: [lng, lat],
          zoom: 14,
          duration: 1000,
        });
      } catch (error) {
        console.error('Error flying to marker:', error);
      }
    }
  }, [mapInstance]);

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--tp-bg)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 font-display" style={{ color: 'var(--tp-text)' }}>
            Mapbox Token Required
          </h1>
          <p style={{ color: 'var(--tp-muted)' }}>
            Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <Header
        onSearch={handleSearch}
        onLocationSet={handleLocationSet}
        mapboxToken={mapboxToken}
        onHeightChange={setHeaderHeight}
      />

      {/* Main Content Area */}
      <main
        className="flex-1 relative md:flex md:flex-row overflow-hidden"
        style={{ marginTop: `${headerHeight}px` }}
      >
        {/* Map View — fixed behind cards on mobile, right side on desktop */}
        <section className="absolute inset-0 md:relative md:flex-1 p-2 md:p-3 animate-mobile-map">
          <div className="w-full h-full md:rounded-2xl overflow-hidden md:shadow-md">
            <MapView
              key="map-view"
              resources={sortedResources}
              accessToken={mapboxToken}
              onMapReady={handleMapReady}
              onMarkerClick={handleMarkerClick}
              hoveredResourceId={hoveredResourceId}
              onMarkerHover={setHoveredResourceId}
            />
          </div>
        </section>

        {/* Resource List — bottom sheet over map on mobile, left sidebar on desktop */}
        <aside
          className="absolute bottom-0 left-0 right-0 h-[55%] z-10 md:relative md:bottom-auto md:left-auto md:right-auto md:h-auto md:w-[40%] border-t md:border-t-0 md:border-r md:order-first md:rounded-none flex flex-col shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:shadow-none overflow-hidden animate-mobile-sheet"
          style={{ backgroundColor: 'var(--tp-card)' }}
        >
          {/* Tab strip — sticky header of the scrollable area */}
          <div
            className="shrink-0 flex gap-1.5 md:gap-2 px-3 md:px-4 py-2 overflow-x-auto border-b"
            style={{ borderColor: 'var(--tp-muted)' }}
          >
            {(['all', 'clinical', 'community', 'events'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                className={cn(
                  'rounded-full px-3 md:px-5 h-7 md:h-9 text-xs md:text-sm capitalize shrink-0',
                  activeTab === tab && 'text-white',
                )}
                style={activeTab === tab ? { backgroundColor: 'var(--tp-primary)' } : undefined}
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
          {error && (
            <div className="p-4 bg-destructive/10 border-b border-destructive/20">
              <p className="text-sm text-destructive">
                Error: {error.message}
              </p>
            </div>
          )}
          <ResourceList
            resources={sortedResources}
            loading={loading}
            map={mapInstance}
            onResourceClick={handleResourceClick}
            onProgrammaticMove={() => {
              isProgrammaticMove.current = true;
            }}
            startingLocation={startingLocation}
            selectedResourceId={selectedResourceId}
            hoveredResourceId={hoveredResourceId}
            onCardHover={setHoveredResourceId}
            activeTab={activeTab}
          />
        </aside>
      </main>
    </div>
  );
}
