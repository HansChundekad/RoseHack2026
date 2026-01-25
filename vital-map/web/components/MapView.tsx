/**
 * MapView component
 * 
 * Mapbox GL JS map container that displays resources as markers.
 * Synchronizes with resource data and handles marker management.
 */

'use client';

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Resource } from '@/types/resource';
import { parsePostGISPoint } from '@/lib/postgis';
import { createMapMarker } from './MapMarker';

interface MapViewProps {
  /** Array of resources to display as markers */
  resources: Resource[];
  /** Mapbox access token */
  accessToken: string;
  /** Initial map center [lng, lat] */
  initialCenter?: [number, number];
  /** Initial zoom level */
  initialZoom?: number;
  /** Callback when map is ready */
  onMapReady?: (map: mapboxgl.Map) => void;
  /** Callback when resource marker is clicked */
  onMarkerClick?: (resource: Resource) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component that renders a Mapbox GL JS map
 * 
 * Initializes map, manages markers based on resources array,
 * and handles marker click events.
 */
function MapView({
  resources,
  accessToken,
  initialCenter = [-118.2437, 34.0522], // Default: Los Angeles
  initialZoom = 11,
  onMapReady,
  onMarkerClick,
  className = '',
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Set Mapbox access token
    mapboxgl.accessToken = accessToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: initialZoom,
    });

    // Wait for map to load
    map.current.on('load', () => {
      setIsMapReady(true);
      onMapReady?.(map.current!);
    });

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Memoize resources key to prevent unnecessary effect triggers
  const resourcesKey = useMemo(() => {
    return JSON.stringify(
      resources.map((r) => ({ id: r.id, location: r.location }))
        .sort((a, b) => a.id - b.id)
    );
  }, [resources]);

  // Track previous resources to prevent unnecessary updates
  const previousResourcesRef = useRef<string>('');
  const isUpdatingRef = useRef(false);

  // Update markers when resources change
  useEffect(() => {
    if (!map.current || !isMapReady || isUpdatingRef.current) return;

    // Skip update if resources haven't actually changed
    if (resourcesKey === previousResourcesRef.current) {
      return;
    }

    isUpdatingRef.current = true;
    previousResourcesRef.current = resourcesKey;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers for each resource
    resources.forEach((resource) => {
      if (!resource.location) return;

      try {
        const [lng, lat] = parsePostGISPoint(resource.location);

        // Create custom marker element
        const markerElement = createMapMarker(resource, (clickedResource) => {
          onMarkerClick?.(clickedResource);
        });

        // Create Mapbox marker
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([lng, lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
      } catch (error) {
        console.error(
          `Error creating marker for resource ${resource.id}:`,
          error
        );
      }
    });

    // Reset update flag after a brief delay to prevent rapid updates
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 100);
  }, [resourcesKey, isMapReady, onMarkerClick]); // Use resourcesKey instead of resources

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(MapView);
