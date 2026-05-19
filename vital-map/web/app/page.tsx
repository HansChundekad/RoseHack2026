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
import { useReviewStats } from '@/hooks/useReviewStats';
import { useTemporalSync } from '@/hooks/useTemporalSync';
import { calculateDistance } from '@/lib/geocoding';
import { parsePostGISPoint } from '@/lib/postgis';
import { Button } from '@/components/ui/button';
import { AddPoiModal } from '@/components/AddPoiModal';
import { cn } from '@/lib/utils';
import type mapboxgl from 'mapbox-gl';
import type { Resource } from '@/types/resource';

const DEFAULT_MAP_CENTER: [number, number] = [-118.2437, 33.95];
const CATEGORY_ORDER: Record<string, number> = {
  clinical: 1, community: 2, farm: 3, healer: 4, event: 5,
};

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
  const [showAddPoi, setShowAddPoi] = useState(false);

  const {
    resources,
    loading,
    error,
    refetch,
    matchLocations,
  } = useResources();

  const { reviewStats, refetch: refetchReviews } = useReviewStats();

  const { updateTemporalStatus } = useTemporalSync();

  // Get Mapbox token from environment
  const mapboxToken =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  // Handle search submission — client-side keyword filter against in-memory resources
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle tab change — filtering is done client-side via filteredResources
  const handleTabChange = useCallback(
    (tab: 'all' | 'clinical' | 'community' | 'events') => {
      setActiveTab(tab);
    },
    []
  );

  // Track if map movement is programmatic (to prevent infinite loops)
  const isProgrammaticMove = useRef(false);

  // Handle starting location cleared — reset map and reload all resources
  const handleLocationClear = useCallback(() => {
    setStartingLocation(null);
    if (mapInstance) {
      mapInstance.flyTo({ center: DEFAULT_MAP_CENTER, zoom: 8, duration: 800 });
    }
    refetch();
  }, [mapInstance, refetch]);

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
    },
    [matchLocations, startingLocation]
  );

  // Filter resources by active tab then by keyword search query
  const filteredResources = useMemo(() => {
    const byTab = resources.filter((resource) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'clinical') return resource.category === 'clinical';
      if (activeTab === 'community')
        return ['community', 'farm', 'healer'].includes(resource.category);
      if (activeTab === 'events') return resource.category === 'event';
      return true;
    });

    if (!searchQuery.trim()) return byTab;

    const q = searchQuery.toLowerCase();
    return byTab.filter((r) =>
      [r.name, r.description, r.category, r.address]
        .some((field) => field?.toLowerCase().includes(q))
    );
  }, [resources, activeTab, searchQuery]);

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

    resourcesWithDistance.sort((a, b) => {
      // Primary sort: distance
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      // Secondary sort: category
      const categoryA = CATEGORY_ORDER[a.resource.category] || 99;
      const categoryB = CATEGORY_ORDER[b.resource.category] || 99;
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
        onLocationClear={handleLocationClear}
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
          className="absolute bottom-0 left-0 right-0 h-[55%] z-10 md:relative md:bottom-auto md:left-auto md:right-auto md:h-auto md:w-[40%] border-t md:border-t-0 md:border-r md:order-first md:rounded-none flex flex-col shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:shadow-none overflow-hidden overflow-x-hidden touch-pan-y animate-mobile-sheet"
          style={{ backgroundColor: 'var(--tp-card)' }}
        >
          {/* Tab strip — sticky header of the scrollable area */}
          <div
            className="shrink-0 flex justify-center gap-1 px-2 py-1.5 border-b"
            style={{ borderColor: 'var(--tp-muted)' }}
          >
            {(['all', 'clinical', 'community', 'events'] as const).map((tab) => (
              <Button
                key={tab}
                variant="ghost"
                className={cn(
                  'relative rounded-md px-5 md:px-6 h-10 md:h-11 text-xs md:text-sm font-medium capitalize transition-colors duration-200',
                  activeTab === tab
                    ? 'text-white hover:text-white'
                    : 'text-[var(--tp-muted)] hover:text-[var(--tp-text)]',
                )}
                style={activeTab === tab ? { backgroundColor: 'var(--tp-primary)' } : undefined}
                onClick={() => handleTabChange(tab)}
              >
                {tab}
                {activeTab === tab && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 animate-tab-fill"
                    style={{ backgroundColor: 'var(--tp-primary)' }}
                  />
                )}
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
            reviewStats={reviewStats}
            onReviewSubmitted={refetchReviews}
          />
        </aside>
      </main>

      {/* Floating Add POI button */}
      <button
        onClick={() => setShowAddPoi(true)}
        className="fixed bottom-6 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg text-white text-2xl font-light transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        style={{ backgroundColor: 'var(--tp-primary)' }}
        aria-label="Add a location"
      >
        +
      </button>

      <AddPoiModal
        isOpen={showAddPoi}
        onClose={() => setShowAddPoi(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
