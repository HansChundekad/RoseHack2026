/**
 * useResources hook
 * 
 * Manages resource state and provides functions for spatial and semantic search.
 * All functions call Supabase RPC functions - no mock data fallbacks.
 * 
 * Ready for backend integration - ensure the following RPC functions are implemented:
 * - match_locations(min_lng, min_lat, max_lng, max_lat)
 * - semantic_search(query_vector, limit?)
 * - get_happening_now_events()
 */

import { useState, useCallback } from 'react';
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

  /**
   * Spatial search: Find resources within a map bounding box
   * 
   * STUB: Calls Supabase RPC function `match_locations`
   * Backend should implement this function to query PostGIS geometry
   * 
   * @param bounds - Bounding box coordinates
   * @returns Array of resources within the bounds
   */
  const matchLocations = useCallback(
    async (bounds: BoundingBox): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        // Call Supabase RPC function `match_locations`
        // Expected Supabase RPC signature:
        // match_locations(min_lng, min_lat, max_lng, max_lat)
        const { data, error: rpcError } = await supabase.rpc('match_locations', {
          min_lng: bounds.minLng,
          min_lat: bounds.minLat,
          max_lng: bounds.maxLng,
          max_lat: bounds.maxLat,
        });

        if (rpcError) {
          throw new Error(`RPC error: ${rpcError.message}`);
        }

        const results = (data || []) as Resource[];
        setResources(results);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error in matchLocations:', error);
        // Return empty array on error - no fallback to mock data
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
   * STUB: Converts query to vector, then calls Supabase RPC `semantic_search`
   * Backend should implement pgvector similarity search
   * 
   * @param queryText - Natural language search query
   * @returns Array of resources ranked by semantic similarity
   */
  const semanticSearch = useCallback(
    async (queryText: string): Promise<Resource[]> => {
      setLoading(true);
      setError(null);

      try {
        // Convert text query to vector embedding
        const queryVector = await textToVector(queryText);

        // Call Supabase RPC `semantic_search`
        // Expected Supabase RPC signature:
        // semantic_search(query_vector, limit?)
        const { data, error: rpcError } = await supabase.rpc('semantic_search', {
          query_vector: queryVector,
          limit: 50, // Optional: limit results
        });

        if (rpcError) {
          throw new Error(`RPC error: ${rpcError.message}`);
        }

        const results = (data || []) as Resource[];
        setResources(results);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error in semanticSearch:', error);
        // Return empty array on error - no fallback to mock data
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
   * STUB: Calls Supabase RPC `get_happening_now_events`
   * Backend should filter resources where current time is between
   * event_start and event_end
   * 
   * @returns Array of resources with active events
   */
  const getHappeningNow = useCallback(async (): Promise<Resource[]> => {
    setLoading(true);
    setError(null);

    try {
      // Call Supabase RPC `get_happening_now_events`
      // Expected Supabase RPC signature:
      // get_happening_now_events()
      const { data, error: rpcError } = await supabase.rpc(
        'get_happening_now_events'
      );

      if (rpcError) {
        throw new Error(`RPC error: ${rpcError.message}`);
      }

      const results = (data || []) as Resource[];
      setResources(results);
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error in getHappeningNow:', error);
      // Return empty array on error - no fallback to mock data
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
