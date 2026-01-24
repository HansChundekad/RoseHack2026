'use client';

/**
 * Main application page
 * 
 * Implements the full-viewport split-view layout with:
 * - Header with search and tabs (fixed at top)
 * - Left sidebar (40%) for resource list
 * - Right map view (60%) for Mapbox GL JS
 */

import { useState, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { ResourceList } from '@/components/ResourceList';
import { MapView } from '@/components/MapView';
import { useResources } from '@/hooks/useResources';
import { useTemporalSync } from '@/hooks/useTemporalSync';
import type mapboxgl from 'mapbox-gl';
import type { Resource } from '@/types/resource';

// Header height in pixels (used for viewport calculation)
const HEADER_HEIGHT = 180;

export default function Home() {
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'clinical' | 'community' | 'events'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        // Perform semantic search
        await semanticSearch(query);
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

  // Handle map ready
  const handleMapReady = useCallback(
    (map: mapboxgl.Map) => {
      setMapInstance(map);

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

      // Update resources when map moves (optional - can be throttled)
      map.on('moveend', () => {
        const newBounds = map.getBounds();
        if (newBounds) {
          matchLocations({
            minLng: newBounds.getWest(),
            minLat: newBounds.getSouth(),
            maxLng: newBounds.getEast(),
            maxLat: newBounds.getNorth(),
          });
        }
      });
    },
    [matchLocations]
  );

  // Filter resources by active tab
  const filteredResources = resources.filter((resource) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'clinical') return resource.category === 'clinical';
    if (activeTab === 'community')
      return ['community', 'farm', 'healer'].includes(resource.category);
    if (activeTab === 'events') return resource.category === 'event';
    return true;
  });

  // Update temporal status for filtered resources
  const resourcesWithTemporalStatus = updateTemporalStatus(filteredResources);

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Mapbox Token Required
          </h1>
          <p className="text-muted-foreground">
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
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content Area */}
      <main
        className="flex flex-1 overflow-hidden"
        style={{ marginTop: `${HEADER_HEIGHT}px` }}
      >
        {/* Left Sidebar - Resource List (40%) */}
        <aside className="w-[40%] border-r bg-muted/50">
          {error && (
            <div className="p-4 bg-destructive/10 border-b border-destructive/20">
              <p className="text-sm text-destructive">
                Error: {error.message}
              </p>
            </div>
          )}
          <ResourceList
            resources={resourcesWithTemporalStatus}
            loading={loading}
            map={mapInstance}
            onResourceClick={handleResourceClick}
          />
        </aside>

        {/* Right Map View (60%) */}
        <section className="flex-1 relative">
          <MapView
            resources={resourcesWithTemporalStatus}
            accessToken={mapboxToken}
            onMapReady={handleMapReady}
            onMarkerClick={handleMarkerClick}
          />
        </section>
      </main>
    </div>
  );
}
