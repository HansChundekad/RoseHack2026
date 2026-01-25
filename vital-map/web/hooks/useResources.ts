/**
 * useResources hook
 *
 * Manages resource state and provides functions for spatial and semantic search.
 * Connects to PostGIS database via Supabase RPC functions.
 *
 * RPC functions used:
 * - get_all_locations() - Fetch all locations with ST_AsText(geom)
 * - match_locations(min_lng, min_lat, max_lng, max_lat)
 * - semantic_search(query_vector, limit?)
 * - get_happening_now_events()
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { textToVector } from '@/lib/vectorSearch';
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
  semanticSearch: (queryText: string) => Promise<Resource[]>;
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
   * Converts query to vector, then calls Supabase RPC `semantic_search`
   *
   * @param queryText - Natural language search query
   * @returns Array of resources ranked by semantic similarity
   */
  const semanticSearch = useCallback(
    async (queryText: string): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        const queryVector = await textToVector(queryText);

        const { data, error: rpcError } = await supabase.rpc('semantic_search', {
          query_vector: queryVector,
          limit: 50,
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
    getHappeningNow,
  };
}
