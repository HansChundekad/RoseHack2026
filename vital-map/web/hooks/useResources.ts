/**
 * useResources hook
 * 
 * Manages resource state and provides functions for spatial and semantic search.
 * All RPC functions are stubbed and ready for backend integration.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { textToVector } from '@/lib/vectorSearch';
import { mockResources } from '@/lib/mockData';
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
  const [useMockData, setUseMockData] = useState(false);

  // Check if we should use mock data (when Supabase is not configured or RPC fails)
  useEffect(() => {
    // Use mock data if Supabase URL is placeholder
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (
      !supabaseUrl ||
      supabaseUrl.includes('placeholder') ||
      supabaseUrl.includes('example')
    ) {
      setUseMockData(true);
      setResources(mockResources);
    }
  }, []);

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
        // Use mock data if enabled
        if (useMockData) {
          // Filter mock resources by bounding box (simple check)
          const filtered = mockResources.filter((resource) => {
            try {
              const [lng, lat] = resource.location
                .replace('POINT(', '')
                .replace(')', '')
                .split(' ')
                .map(Number);
              return (
                lng >= bounds.minLng &&
                lng <= bounds.maxLng &&
                lat >= bounds.minLat &&
                lat <= bounds.maxLat
              );
            } catch {
              return true; // Include if we can't parse
            }
          });
          setTimeout(() => {
            setResources(filtered);
            setLoading(false);
          }, 300); // Simulate network delay
          return filtered;
        }

        // TODO: Replace with actual RPC call
        // Expected Supabase RPC signature:
        // match_locations(min_lng, min_lat, max_lng, max_lat)
        const { data, error: rpcError } = await supabase.rpc('match_locations', {
          min_lng: bounds.minLng,
          min_lat: bounds.minLat,
          max_lng: bounds.maxLng,
          max_lat: bounds.maxLat,
        });

        if (rpcError) {
          // Fall back to mock data on RPC error
          console.warn('RPC error, using mock data:', rpcError.message);
          setUseMockData(true);
          const filtered = mockResources.filter((resource) => {
            try {
              const [lng, lat] = resource.location
                .replace('POINT(', '')
                .replace(')', '')
                .split(' ')
                .map(Number);
              return (
                lng >= bounds.minLng &&
                lng <= bounds.maxLng &&
                lat >= bounds.minLat &&
                lat <= bounds.maxLat
              );
            } catch {
              return true;
            }
          });
          setResources(filtered);
          return filtered;
        }

        const results = (data || []) as Resource[];
        setResources(results);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error in matchLocations:', error);
        // Fall back to mock data on error
        setUseMockData(true);
        setResources(mockResources);
        return mockResources;
      } finally {
        setLoading(false);
      }
    },
    [useMockData]
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
        // Use mock data if enabled
        if (useMockData) {
          // Simple text matching for mock data
          const queryLower = queryText.toLowerCase();
          const filtered = mockResources.filter(
            (resource) =>
              resource.name.toLowerCase().includes(queryLower) ||
              resource.description.toLowerCase().includes(queryLower) ||
              resource.category.toLowerCase().includes(queryLower)
          );
          setTimeout(() => {
            setResources(filtered.length > 0 ? filtered : mockResources);
            setLoading(false);
          }, 300); // Simulate network delay
          return filtered.length > 0 ? filtered : mockResources;
        }

        // Convert text query to vector embedding
        const queryVector = await textToVector(queryText);

        // TODO: Replace with actual RPC call
        // Expected Supabase RPC signature:
        // semantic_search(query_vector, limit?)
        const { data, error: rpcError } = await supabase.rpc('semantic_search', {
          query_vector: queryVector,
          limit: 50, // Optional: limit results
        });

        if (rpcError) {
          // Fall back to mock data on RPC error
          console.warn('RPC error, using mock data:', rpcError.message);
          setUseMockData(true);
          const queryLower = queryText.toLowerCase();
          const filtered = mockResources.filter(
            (resource) =>
              resource.name.toLowerCase().includes(queryLower) ||
              resource.description.toLowerCase().includes(queryLower)
          );
          setResources(filtered.length > 0 ? filtered : mockResources);
          return filtered.length > 0 ? filtered : mockResources;
        }

        const results = (data || []) as Resource[];
        setResources(results);
        return results;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error in semanticSearch:', error);
        // Fall back to mock data
        setUseMockData(true);
        setResources(mockResources);
        return mockResources;
      } finally {
        setLoading(false);
      }
    },
    [useMockData]
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
      // Use mock data if enabled
      if (useMockData) {
        const now = new Date();
        const happeningNow = mockResources.filter((resource) => {
          if (!resource.event_start || !resource.event_end) return false;
          const start = new Date(resource.event_start);
          const end = new Date(resource.event_end);
          return now >= start && now <= end;
        });
        setTimeout(() => {
          setResources(happeningNow);
          setLoading(false);
        }, 300);
        return happeningNow;
      }

      // TODO: Replace with actual RPC call
      // Expected Supabase RPC signature:
      // get_happening_now_events()
      const { data, error: rpcError } = await supabase.rpc(
        'get_happening_now_events'
      );

      if (rpcError) {
        // Fall back to mock data
        console.warn('RPC error, using mock data:', rpcError.message);
        setUseMockData(true);
        const now = new Date();
        const happeningNow = mockResources.filter((resource) => {
          if (!resource.event_start || !resource.event_end) return false;
          const start = new Date(resource.event_start);
          const end = new Date(resource.event_end);
          return now >= start && now <= end;
        });
        setResources(happeningNow);
        return happeningNow;
      }

      const results = (data || []) as Resource[];
      setResources(results);
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error in getHappeningNow:', error);
      // Fall back to mock data
      setUseMockData(true);
      const now = new Date();
      const happeningNow = mockResources.filter((resource) => {
        if (!resource.event_start || !resource.event_end) return false;
        const start = new Date(resource.event_start);
        const end = new Date(resource.event_end);
        return now >= start && now <= end;
      });
      setResources(happeningNow);
      return happeningNow;
    } finally {
      setLoading(false);
    }
  }, [useMockData]);

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
