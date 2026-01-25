'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ReviewStats {
  [locationId: number]: {
    averageRating: number;
    reviewCount: number;
  };
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

        // Calculate statistics per location
        const stats: ReviewStats = {};

        if (data) {
          data.forEach((review) => {
            const locId = review.location_id;

            if (!stats[locId]) {
              stats[locId] = {
                averageRating: 0,
                reviewCount: 0,
              };
            }

            stats[locId].reviewCount += 1;
            stats[locId].averageRating += review.rating;
          });

          // Calculate averages
          Object.keys(stats).forEach((locId) => {
            const numLocId = Number(locId);
            stats[numLocId].averageRating =
              stats[numLocId].averageRating / stats[numLocId].reviewCount;
          });
        }

        setReviewStats(stats);
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

    if (!fetchError && data) {
      const stats: ReviewStats = {};

      data.forEach((review) => {
        const locId = review.location_id;

        if (!stats[locId]) {
          stats[locId] = { averageRating: 0, reviewCount: 0 };
        }

        stats[locId].reviewCount += 1;
        stats[locId].averageRating += review.rating;
      });

      Object.keys(stats).forEach((locId) => {
        const numLocId = Number(locId);
        stats[numLocId].averageRating =
          stats[numLocId].averageRating / stats[numLocId].reviewCount;
      });

      setReviewStats(stats);
    }

    setIsLoading(false);
  };

  return { reviewStats, isLoading, error, refetch };
}
