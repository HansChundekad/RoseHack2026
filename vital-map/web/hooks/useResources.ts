/**
 * useResources hook
 *
 * Manages resource state and provides functions for spatial and semantic search.
 * Uses JSON data file for simple, fast loading without database dependencies.
 *
 * Data source: hospitals.json - Static JSON file with hospital locations
 * All search functions filter from this JSON data client-side.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Resource, BoundingBox } from '@/types/resource';
import hospitalsData from '@/data/hospitals.json';

interface UseResourcesReturn {
  /** Array of resources currently loaded */
  resources: Resource[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch resources */
  refetch: () => Promise<void>;
  /** Spatial search within bounding box */
  matchLocations: (bounds: BoundingBox) => Promise<Resource[]>;
  /** Semantic search using vector embeddings */
  semanticSearch: (queryVector: number[]) => Promise<Resource[]>;
  /** Hybrid geo + semantic search */
  hybridSearch: (
    queryVector: number[],
    centerLng: number,
    centerLat: number,
    radiusMeters?: number
  ) => Promise<Resource[]>;
  /** Get resources that are happening now */
  getHappeningNow: () => Promise<Resource[]>;
}

/**
 * Custom hook for managing resources
 * 
 * Provides state management and search functions for healthcare/wellness resources.
 * Uses JSON data file for simple, fast loading without database dependencies.
 * 
 * @returns Object with resources state and search functions
 */
export function useResources(): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all locations from JSON file (bypasses Supabase)
  useEffect(() => {
    const loadResources = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load from JSON file - simple and fast, no database needed
        const locations = hospitalsData as Resource[];
        setResources(locations);
        console.log(`✅ Loaded ${locations.length} hospital locations from JSON`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error loading resources:', error);
        setResources([]);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, []);

  /**
   * Spatial search: Find resources within a map bounding box
   *
   * Filters hospitals from JSON data by bounding box coordinates
   *
   * @param bounds - Bounding box coordinates
   * @returns Array of resources within the bounds
   */
  const matchLocations = useCallback(
    async (bounds: BoundingBox): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        // Filter hospitals from JSON by bounding box
        const allLocations = hospitalsData as Resource[];
        const { parsePostGISPoint } = await import('@/lib/postgis');
        
        const results = allLocations.filter((location) => {
          if (!location.location) return false;
          try {
            const [lng, lat] = parsePostGISPoint(location.location);
            return (
              lng >= bounds.minLng &&
              lng <= bounds.maxLng &&
              lat >= bounds.minLat &&
              lat <= bounds.maxLat
            );
          } catch {
            return false;
          }
        });

        setResources(results);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error in matchLocations:', error);
        setResources([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Semantic search: Find resources using vector similarity
   *
   * Returns all hospitals from JSON (simplified - no embeddings in JSON)
   *
   * @param queryVector - 1536-dimensional embedding vector (unused with JSON)
   * @param similarityThreshold - Max cosine distance (unused with JSON)
   * @param limit - Max number of results (default 50)
   * @returns Array of resources
   */
  const semanticSearch = useCallback(
    async (
      queryVector: number[],
      similarityThreshold: number = 2.0,
      limit: number = 50
    ): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        // For JSON data, just return all hospitals (no semantic search without embeddings)
        // In a real implementation, you'd need embeddings in the JSON
        const allLocations = hospitalsData as Resource[];
        const results = allLocations.slice(0, limit);
        setResources(results);
        console.log(`✅ Semantic search returned ${results.length} results (from JSON)`);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error in semanticSearch:', error);
        setResources([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Hybrid search: Filter by geographic proximity
   *
   * Filters hospitals from JSON by distance from center point
   *
   * @param queryVector - 1536-dimensional embedding vector (unused with JSON)
   * @param centerLng - Search center longitude
   * @param centerLat - Search center latitude
   * @param radiusMeters - Search radius in meters (default 50000)
   * @param similarityThreshold - Max cosine distance (unused with JSON)
   * @param limit - Max number of results (default 50)
   * @returns Array of resources sorted by distance
   */
  const hybridSearch = useCallback(
    async (
      queryVector: number[],
      centerLng: number,
      centerLat: number,
      radiusMeters: number = 50000,
      similarityThreshold: number = 2.0,
      limit: number = 50
    ): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        // Validate coordinates
        if (centerLng < -180 || centerLng > 180) {
          throw new Error(`Invalid longitude: ${centerLng}`);
        }
        if (centerLat < -90 || centerLat > 90) {
          throw new Error(`Invalid latitude: ${centerLat}`);
        }

        // Filter hospitals from JSON by distance from center
        const allLocations = hospitalsData as Resource[];
        const { parsePostGISPoint } = await import('@/lib/postgis');
        const { calculateDistance } = await import('@/lib/geocoding');
        
        const results = allLocations
          .map((location) => {
            if (!location.location) return null;
            try {
              const [lng, lat] = parsePostGISPoint(location.location);
              const distance = calculateDistance(centerLat, centerLng, lat, lng);
              return { location, distance };
            } catch {
              return null;
            }
          })
          .filter((item): item is { location: Resource; distance: number } => 
            item !== null && item.distance <= radiusMeters / 1609.34 // Convert meters to miles
          )
          .sort((a, b) => a.distance - b.distance)
          .slice(0, limit)
          .map((item) => item.location);

        setResources(results);
        console.log(`✅ Hybrid search returned ${results.length} results (from JSON)`);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error in hybridSearch:', error);
        setResources([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get resources that are happening now (temporal synchronization)
   *
   * Returns empty array (hospitals don't have events in JSON data)
   *
   * @returns Array of resources with active events
   */
  const getHappeningNow = useCallback(async (): Promise<Resource[]> => {
    setLoading(true);
    setError(null);

    try {
      // For JSON data, return empty array (hospitals don't have events)
      const results: Resource[] = [];
      setResources(results);
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error in getHappeningNow:', error);
      setResources([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refetch resources using the last used search method
   * For now, this is a placeholder that can be enhanced
   */
  const refetch = useCallback(async () => {
    // This could be enhanced to remember the last search method
    // For now, it's a no-op that can be called to trigger re-renders
    console.log('Refetch called - implement based on last search method');
  }, []);

  return {
    resources,
    loading,
    error,
    refetch,
    matchLocations,
    semanticSearch,
    hybridSearch,
    getHappeningNow,
  };
}
