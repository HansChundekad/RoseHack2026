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
import type mapboxgl from 'mapbox-gl';
import type { Resource } from '@/types/resource';

// Header height in pixels (used for viewport calculation)
// Accommodates green banner, both search bars on one line, and tabs
const HEADER_HEIGHT = 250;

export default function Home() {
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'clinical' | 'community' | 'events'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Handle tab change
  const handleTabChange = useCallback(
    async (tab: 'all' | 'clinical' | 'community' | 'events') => {
      setActiveTab(tab);

      if (tab === 'events') {
        // Load happening now events
        await getHappeningNow();
      } else if (mapInstance) {
        // Load resources for current map bounds
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
    },
    [getHappeningNow, matchLocations, mapInstance]
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

      // Load initial resources for map bounds
      const bounds = map.getBounds();
      if (bounds) {
        matchLocations({
          minLng: bounds.getWest(),
          minLat: bounds.getSouth(),
          maxLng: bounds.getEast(),
          maxLat: bounds.getNorth(),
        });
      }

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

  // Handle resource click
  const handleResourceClick = useCallback((resource: Resource) => {
    console.log('Resource clicked:', resource);
    // Can be extended to show resource details modal
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback((resource: Resource) => {
    console.log('Marker clicked:', resource);
    // Can be extended to show resource details modal
  }, []);

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
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content Area */}
      <main
        className="flex flex-1 overflow-hidden"
        style={{ marginTop: `${HEADER_HEIGHT}px` }}
      >
        {/* Left Sidebar - Resource List (40%) */}
        <aside className="w-[40%] border-r" style={{ backgroundColor: 'var(--tp-card)' }}>
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
          />
        </aside>

        {/* Right Map View (60%) */}
        <section className="flex-1 relative">
          <MapView
            key="map-view" // Stable key to prevent re-mounting
            resources={sortedResources}
            accessToken={mapboxToken}
            onMapReady={handleMapReady}
            onMarkerClick={handleMarkerClick}
          />
        </section>
      </main>
    </div>
  );
}
