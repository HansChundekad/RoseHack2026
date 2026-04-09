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
  /** Currently hovered resource ID (from card hover) */
  hoveredResourceId?: number | null;
  /** Callback when a marker is hovered */
  onMarkerHover?: (id: number | null) => void;
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
  initialCenter = [-118.2437, 34.0522],
  initialZoom = 11,
  onMapReady,
  onMarkerClick,
  hoveredResourceId,
  onMarkerHover,
  className = '',
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markerElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.on('load', () => {
      setIsMapReady(true);
      onMapReady?.(map.current!);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoize resources key to prevent unnecessary effect triggers
  const resourcesKey = useMemo(() => {
    return JSON.stringify(
      resources
        .map((r) => ({ id: r.id, location: r.location }))
        .sort((a, b) => a.id - b.id)
    );
  }, [resources]);

  // Track previous resources to prevent unnecessary updates
  const previousResourcesRef = useRef<string>('');

  // Update markers when resources change
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    if (resourcesKey === previousResourcesRef.current) {
      return;
    }

    previousResourcesRef.current = resourcesKey;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    markerElementsRef.current.clear();

    // Add new markers for each resource
    resources.forEach((resource) => {
      if (!resource.location) return;

      try {
        const [lng, lat] = parsePostGISPoint(resource.location);

        const markerElement = createMapMarker(
          resource,
          (clickedResource) => onMarkerClick?.(clickedResource),
          (hoveredResource) => onMarkerHover?.(hoveredResource.id),
          () => onMarkerHover?.(null),
        );

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([lng, lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
        markerElementsRef.current.set(resource.id, markerElement);
      } catch (error) {
        console.error(
          `Error creating marker for resource ${resource.id}:`,
          error
        );
      }
    });
  }, [resourcesKey, isMapReady, onMarkerClick, onMarkerHover]);

  // Highlight marker when hoveredResourceId changes (from card hover)
  useEffect(() => {
    markerElementsRef.current.forEach((el, id) => {
      const dot = el.querySelector('.marker-dot') as HTMLElement | null;
      if (!dot) return;
      if (id === hoveredResourceId) {
        dot.style.transform = 'scale(1.5)';
        dot.style.boxShadow = '0 0 0 4px rgba(22, 163, 74, 0.3)';
        dot.style.zIndex = '10';
      } else {
        dot.style.transform = '';
        dot.style.boxShadow = '';
        dot.style.zIndex = '';
      }
    });
  }, [hoveredResourceId]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}

export default memo(MapView);
