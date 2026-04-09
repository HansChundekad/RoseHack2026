/**
 * useResources hook
 *
 * Manages resource state and provides functions for spatial and semantic search.
 * Connects to PostGIS database via Supabase RPC functions and merges with hardcoded hospitals from JSON.
 *
 * Data sources:
 * - Supabase database (primary) - All locations from get_all_locations() RPC
 * - hospitals.json (supplemental) - 3 hardcoded LA hospital locations
 *
 * RPC functions used:
 * - get_all_locations() - Fetch all locations with ST_AsText(geom), excludes embedding vector
 * - match_locations(min_lng, min_lat, max_lng, max_lat) - Spatial search within bounds
 * - semantic_search(query_vector, limit?) - Vector similarity search (server-side only)
 * - hybrid_search() - Combined geo + semantic search
 * - get_happening_now_events() - Temporal search for current events
 *
 * Note: Embedding vectors are stored in DB but NOT returned in API responses for performance.
 * They are used only for server-side semantic search operations.
 * Hardcoded hospitals are merged into all search results.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
 * Loads from Supabase database and merges with hardcoded hospitals from JSON.
 * 
 * @returns Object with resources state and search functions
 */
export function useResources(): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all locations from database + hardcoded hospitals from JSON
  useEffect(() => {
    const loadResources = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load from Supabase
        const { data, error: rpcError } = await supabase.rpc(
          'get_all_locations'
        );

        if (rpcError) {
          throw rpcError;
        }

        const dbLocations = (data || []) as Resource[];
        
        // Merge with hardcoded hospitals from JSON
        const hardcodedHospitals = hospitalsData as Resource[];
        const allLocations = [...dbLocations, ...hardcodedHospitals];
        
        setResources(allLocations);
        console.log(`✅ Loaded ${dbLocations.length} locations from database + ${hardcodedHospitals.length} hardcoded hospitals`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error loading resources:', error);
        // Fallback to just hardcoded hospitals if DB fails
        const hardcodedHospitals = hospitalsData as Resource[];
        setResources(hardcodedHospitals);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, []);

  /**
   * Spatial search: Find resources within a map bounding box
   *
   * Calls Supabase RPC function `match_locations` and merges with hardcoded hospitals
   *
   * @param bounds - Bounding box coordinates
   * @returns Array of resources within the bounds
   */
  const matchLocations = useCallback(
    async (bounds: BoundingBox): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        // Get results from Supabase
        const { data, error: rpcError } = await supabase.rpc('match_locations', {
          min_lng: bounds.minLng,
          min_lat: bounds.minLat,
          max_lng: bounds.maxLng,
          max_lat: bounds.maxLat,
        });

        if (rpcError) {
          throw rpcError;
        }

        const dbResults = (data || []) as Resource[];
        
        // Filter hardcoded hospitals by bounding box and merge
        const hardcodedHospitals = hospitalsData as Resource[];
        const { parsePostGISPoint } = await import('@/lib/postgis');
        
        const filteredHospitals = hardcodedHospitals.filter((location) => {
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
        
        const results = [...dbResults, ...filteredHospitals];
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
   * Calls Supabase RPC function `semantic_search` and merges with hardcoded hospitals
   *
   * @param queryVector - 1536-dimensional embedding vector
   * @param similarityThreshold - Max cosine distance (default 2.0 = all results)
   * @param limit - Max number of results (default 50)
   * @returns Array of resources ranked by semantic similarity
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
        // Validate vector dimensions
        if (queryVector.length !== 1536) {
          throw new Error(
            `Invalid vector dimensions: expected 1536, got ${queryVector.length}`
          );
        }

        const { data, error: rpcError } = await supabase.rpc('semantic_search', {
          query_vector: queryVector,
          similarity_threshold: similarityThreshold,
          limit_count: limit,
        });

        if (rpcError) throw rpcError;

        const dbResults = (data || []) as Resource[];
        
        // Add hardcoded hospitals (no semantic filtering for them)
        const hardcodedHospitals = hospitalsData as Resource[];
        const results = [...dbResults, ...hardcodedHospitals];
        
        setResources(results);
        console.log(`✅ Semantic search returned ${dbResults.length} results from DB + ${hardcodedHospitals.length} hardcoded hospitals`);
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
   * Hybrid search: Combine geographic proximity and semantic similarity
   *
   * Calls Supabase RPC function `hybrid_search` and merges with hardcoded hospitals
   *
   * @param queryVector - 1536-dimensional embedding vector
   * @param centerLng - Search center longitude
   * @param centerLat - Search center latitude
   * @param radiusMeters - Search radius in meters (default 50000)
   * @param similarityThreshold - Max cosine distance (default 2.0)
   * @param limit - Max number of results (default 50)
   * @returns Array of resources ranked by combined geo+semantic score
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
        // Validate vector dimensions
        if (queryVector.length !== 1536) {
          throw new Error(
            `Invalid vector dimensions: expected 1536, got ${queryVector.length}`
          );
        }

        // Validate coordinates
        if (centerLng < -180 || centerLng > 180) {
          throw new Error(`Invalid longitude: ${centerLng}`);
        }
        if (centerLat < -90 || centerLat > 90) {
          throw new Error(`Invalid latitude: ${centerLat}`);
        }

        const { data, error: rpcError } = await supabase.rpc('hybrid_search', {
          query_vector: queryVector,
          center_lng: centerLng,
          center_lat: centerLat,
          radius_meters: radiusMeters,
          similarity_threshold: similarityThreshold,
          limit_count: limit,
        });

        if (rpcError) throw rpcError;

        const dbResults = (data || []) as Resource[];
        
        // Filter hardcoded hospitals by distance and merge
        const hardcodedHospitals = hospitalsData as Resource[];
        const { parsePostGISPoint } = await import('@/lib/postgis');
        const { calculateDistance } = await import('@/lib/geocoding');
        
        const filteredHospitals = hardcodedHospitals
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
          .map((item) => item.location);
        
        const results = [...dbResults, ...filteredHospitals];
        setResources(results);
        console.log(`✅ Hybrid search returned ${dbResults.length} results from DB + ${filteredHospitals.length} hardcoded hospitals`);
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
   * Calls Supabase RPC `get_happening_now_events`
   *
   * @returns Array of resources with active events
   */
  const getHappeningNow = useCallback(async (): Promise<Resource[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_happening_now_events'
      );

      if (rpcError) {
        throw rpcError;
      }

      const dbResults = (data || []) as Resource[];
      
      // Hardcoded hospitals don't have events, so just return DB results
      const results = dbResults;
      setResources(results);
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error in getHappeningNow:', error);
      // Don't clear resources on failure — keep existing data visible
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
