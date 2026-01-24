/**
 * useTemporalSync hook
 * 
 * Manages real-time temporal synchronization for events.
 * Polls or subscribes to event updates to show "happening now" status.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Resource } from '@/types/resource';

interface UseTemporalSyncReturn {
  /** Resources that are currently happening */
  happeningNow: Resource[];
  /** Update resource temporal status */
  updateTemporalStatus: (resources: Resource[]) => Resource[];
}

/**
 * Custom hook for temporal event synchronization
 * 
 * Updates resource `is_happening_now` status based on current time
 * and event start/end times. Can be extended to poll backend or
 * subscribe to real-time updates.
 * 
 * @returns Object with happening now resources and update function
 */
export function useTemporalSync(): UseTemporalSyncReturn {
  const [happeningNow, setHappeningNow] = useState<Resource[]>([]);

  /**
   * Updates temporal status for resources based on current time
   * 
   * @param resources - Array of resources to check
   * @returns Array of resources with updated is_happening_now status
   */
  const updateTemporalStatus = useCallback(
    (resources: Resource[]): Resource[] => {
      const now = new Date();

      return resources.map((resource) => {
        // Only check temporal status for resources with event times
        if (!resource.event_start || !resource.event_end) {
          return { ...resource, is_happening_now: false };
        }

        const startTime = new Date(resource.event_start);
        const endTime = new Date(resource.event_end);

        const isHappeningNow = now >= startTime && now <= endTime;

        return { ...resource, is_happening_now: isHappeningNow };
      });
    },
    []
  );

  // Update happening now resources when temporal status changes
  useEffect(() => {
    // This effect can be extended to:
    // 1. Poll backend for event updates
    // 2. Subscribe to Supabase real-time changes
    // 3. Integrate with municipal calendar APIs
    
    // For now, this is a placeholder that can be called
    // when resources are loaded or updated
  }, []);

  return {
    happeningNow,
    updateTemporalStatus,
  };
}
