/**
 * MapView component
 * 
 * Mapbox GL JS map container that displays resources as markers.
 * Synchronizes with resource data and handles marker management.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
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
export function MapView({
  resources,
  accessToken,
  initialCenter = [-122.41, 37.77], // Default: San Francisco
  initialZoom = 12,
  onMapReady,
  onMarkerClick,
  className = '',
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map
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
  }, [accessToken, initialCenter, initialZoom, onMapReady]);

  // Update markers when resources change
  useEffect(() => {
    if (!map.current || !isMapReady) return;

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
  }, [resources, isMapReady, onMarkerClick]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}
