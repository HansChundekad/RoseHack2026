/**
 * Resource interface for the Holistic Interoperability Engine
 * 
 * Represents a healthcare or community wellness resource that can be
 * displayed on the map and searched via semantic or spatial queries.
 * 
 * @interface Resource
 */
export interface Resource {
  /** Unique identifier (UUID) */
  id: string;
  
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
   * PostGIS Point geometry as string
   * Format: "POINT(longitude latitude)"
   * Example: "POINT(-122.41 37.77)"
   */
  location: string;
  
  /** 
   * Semantic vector embedding for similarity search
   * Array of numbers representing the resource in vector space
   * Used with pgvector for semantic search queries
   */
  semantic_vector: number[];
  
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
