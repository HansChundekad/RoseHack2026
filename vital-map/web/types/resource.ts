/**
 * Resource interface for the Holistic Interoperability Engine
 * 
 * Represents a healthcare or community wellness resource that can be
 * displayed on the map and searched via semantic or spatial queries.
 * 
 * @interface Resource
 */
export interface Resource {
  /** Unique identifier from database (bigint) */
  id: number;

  /** Resource name (e.g., "Riverside Pulmonology Clinic", "Community Garden") */
  name: string;

  /**
   * Resource category
   * Examples: "clinical", "community", "farm", "healer", "event"
   */
  category: string;

  /** Detailed description of the resource */
  description: string;

  /**
   * PostGIS Point geometry as string from ST_AsText(geom)
   * Format: "POINT(longitude latitude)"
   * Example: "POINT(-122.41 37.77)"
   */
  location: string;

  /** Optional website URL */
  website_url?: string;

  /** Creation timestamp */
  created_at?: string;

  /**
   * Community trust score (0-100)
   * Only present for community resources (healers, farms, etc.)
   * Provides decentralized accountability layer
   */
  trust_score?: number;

  /**
   * Event start time (ISO 8601 datetime string)
   * Only present for temporal resources (events, workshops)
   */
  event_start?: string;

  /**
   * Event end time (ISO 8601 datetime string)
   * Only present for temporal resources
   */
  event_end?: string;

  /**
   * Computed field indicating if event is currently happening
   * Based on current time vs event_start and event_end
   */
  is_happening_now?: boolean;

  /**
   * Semantic similarity score (cosine distance)
   * Range: 0 (identical) to 2 (opposite)
   * Only present in semantic_search() and hybrid_search() results
   */
  similarity_score?: number;

  /**
   * Geographic distance in meters from search center
   * Only present in hybrid_search() results
   */
  geo_distance?: number;

  /**
   * Combined normalized ranking score
   * Range: 0 (perfect match) to 1 (worst match)
   * Weighted 50/50 between geo and semantic similarity
   * Only present in hybrid_search() results
   */
  combined_score?: number;
}

/**
 * Bounding box for spatial queries
 * Used to fetch resources within a map's visible area
 */
export interface BoundingBox {
  /** Southwest corner longitude */
  minLng: number;
  /** Southwest corner latitude */
  minLat: number;
  /** Northeast corner longitude */
  maxLng: number;
  /** Northeast corner latitude */
  maxLat: number;
}

/**
 * Resource category types
 * Used for filtering and visual differentiation
 */
export type ResourceCategory = 
  | 'clinical' 
  | 'community' 
  | 'farm' 
  | 'healer' 
  | 'event';
