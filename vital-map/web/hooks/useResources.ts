/**
 * useResources hook
 *
 * Manages resource state and provides functions for spatial and semantic search.
 * Connects to PostGIS database via Supabase RPC functions.
 *
 * RPC functions used:
 * - get_all_locations() - Fetch all locations with ST_AsText(geom), excludes embedding vector
 * - match_locations(min_lng, min_lat, max_lng, max_lat) - Spatial search within bounds
 * - semantic_search(query_vector, limit?) - Vector similarity search (server-side only)
 * - get_happening_now_events() - Temporal search for current events
 *
 * Note: Embedding vectors are stored in DB but NOT returned in API responses for performance.
 * They are used only for server-side semantic search operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Resource, BoundingBox } from '@/types/resource';

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
 * All backend RPC calls are stubbed and ready for integration.
 * 
 * @returns Object with resources state and search functions
 */
export function useResources(): UseResourcesReturn {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all locations from database on mount
  useEffect(() => {
    const loadResources = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'get_all_locations'
        );

        if (rpcError) {
          throw rpcError;
        }

        const locations = (data || []) as Resource[];
        setResources(locations);
        console.log(`✅ Loaded ${locations.length} locations from database`);
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
   * Calls Supabase RPC function `match_locations`
   *
   * @param bounds - Bounding box coordinates
   * @returns Array of resources within the bounds
   */
  const matchLocations = useCallback(
    async (bounds: BoundingBox): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('match_locations', {
          min_lng: bounds.minLng,
          min_lat: bounds.minLat,
          max_lng: bounds.maxLng,
          max_lat: bounds.maxLat,
        });

        if (rpcError) {
          throw rpcError;
        }

        const results = (data || []) as Resource[];
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
   * Calls Supabase RPC function `semantic_search`
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

        const results = (data || []) as Resource[];
        setResources(results);
        console.log(`✅ Semantic search returned ${results.length} results`);
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
   * Calls Supabase RPC function `hybrid_search`
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

        const results = (data || []) as Resource[];
        setResources(results);
        console.log(`✅ Hybrid search returned ${results.length} results`);
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

      const results = (data || []) as Resource[];
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
