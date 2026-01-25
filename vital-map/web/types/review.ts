/**
 * Review interface for location reviews
 * Matches the reviews table schema in database
 */
export interface Review {
  id?: number;
  location_id: number;
  rating: number; // 1-5
  comment?: string;
  created_at?: string;
}

/**
 * Form data for creating a new review
 */
export interface ReviewFormData {
  rating: number;
  comment: string;
}
