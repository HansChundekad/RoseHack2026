'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ReviewStats {
  [locationId: number]: {
    averageRating: number;
    reviewCount: number;
  };
}

function computeStats(rows: { location_id: number; rating: number }[]): ReviewStats {
  const stats: ReviewStats = {};
  for (const row of rows) {
    const id = row.location_id;
    if (!stats[id]) stats[id] = { averageRating: 0, reviewCount: 0 };
    stats[id].reviewCount += 1;
    stats[id].averageRating += row.rating;
  }
  for (const id in stats) {
    const key = Number(id); // ReviewStats is keyed by number; iterating yields strings
    stats[key].averageRating = stats[key].averageRating / stats[key].reviewCount;
  }
  return stats;
}

/**
 * Custom hook to fetch and calculate review statistics for all locations
 * Returns a map of location_id to {averageRating, reviewCount}
 */
export function useReviewStats() {
  const [reviewStats, setReviewStats] = useState<ReviewStats>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all reviews (only location_id and rating for efficiency)
        const { data, error: fetchError } = await supabase
          .from('reviews')
          .select('location_id, rating');

        if (fetchError) throw fetchError;

        setReviewStats(computeStats(data ?? []));
      } catch (err) {
        console.error('Error fetching review stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    const { data, error: fetchError } = await supabase
      .from('reviews')
      .select('location_id, rating');

    if (!fetchError) {
      setReviewStats(computeStats(data ?? []));
    }

    setIsLoading(false);
  };

  return { reviewStats, isLoading, error, refetch };
}
