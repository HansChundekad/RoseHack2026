/**
 * Category color utilities
 * 
 * Provides consistent color mapping for resource categories
 * across markers, cards, and other UI components.
 */

export type ResourceCategory = 'clinical' | 'community' | 'farm' | 'healer' | 'event';

/**
 * Color mapping for each resource category
 * Each category has unique, distinct colors for visual differentiation
 */
export const categoryColors = {
  clinical: {
    marker: 'bg-blue-600',
    badge: 'bg-blue-600 text-white',
    border: 'border-blue-600',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-700',
  },
  community: {
    marker: 'bg-green-600',
    badge: 'bg-green-600 text-white',
    border: 'border-green-600',
    text: 'text-green-600',
    hover: 'hover:bg-green-700',
  },
  farm: {
    marker: 'bg-amber-600',
    badge: 'bg-amber-600 text-white',
    border: 'border-amber-600',
    text: 'text-amber-600',
    hover: 'hover:bg-amber-700',
  },
  healer: {
    marker: 'bg-purple-600',
    badge: 'bg-purple-600 text-white',
    border: 'border-purple-600',
    text: 'text-purple-600',
    hover: 'hover:bg-purple-700',
  },
  event: {
    marker: 'bg-orange-500',
    badge: 'bg-orange-500 text-white',
    border: 'border-orange-500',
    text: 'text-orange-500',
    hover: 'hover:bg-orange-600',
  },
} as const;

/**
 * Normalize category name to match our color mapping
 * Handles variations in category names from database
 */
function normalizeCategory(category: string): ResourceCategory {
  const lower = category.toLowerCase().trim();
  
  // Clinical categories
  if (lower === 'clinical' || 
      lower.includes('clinic') || 
      lower.includes('hospital') || 
      lower.includes('medical') ||
      lower.includes('doctor') ||
      lower.includes('health center')) {
    return 'clinical';
  }
  
  // Farm categories
  if (lower === 'farm' || 
      lower.includes('farm') || 
      lower.includes('grocery') ||
      lower.includes('market') ||
      lower.includes('agriculture')) {
    return 'farm';
  }
  
  // Healer categories
  if (lower === 'healer' || 
      lower.includes('healer') || 
      lower.includes('healing') ||
      lower.includes('spiritual') ||
      lower.includes('wellness center') ||
      lower.includes('holistic')) {
    return 'healer';
  }
  
  // Event categories
  if (lower === 'event' || 
      lower.includes('event') || 
      lower.includes('workshop') ||
      lower.includes('class') ||
      lower.includes('meeting')) {
    return 'event';
  }
  
  // Community categories (default for mutual_aid, community, etc.)
  if (lower === 'community' || 
      lower.includes('mutual') ||
      lower.includes('aid') ||
      lower.includes('community')) {
    return 'community';
  }
  
  // Default fallback to community
  return 'community';
}

/**
 * Get marker color class for a category
 */
export function getMarkerColor(category: string): string {
  const normalized = normalizeCategory(category);
  const color = categoryColors[normalized]?.marker || 'bg-gray-500';
  // Debug: see category mapping in console
  if (typeof window !== 'undefined') {
    console.log(`[CategoryColors] Marker "${category}" -> "${normalized}" -> "${color}"`);
  }
  return color;
}

/**
 * Get badge color classes for a category
 */
export function getBadgeColor(category: string): string {
  const normalized = normalizeCategory(category);
  const color = categoryColors[normalized]?.badge || 'bg-gray-600 text-white';
  // Debug logging - remove after testing
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[CategoryColors] Badge "${category}" -> "${normalized}" -> "${color}"`);
  }
  return color;
}

/**
 * Get border color class for a category
 */
export function getBorderColor(category: string): string {
  const normalized = normalizeCategory(category);
  return categoryColors[normalized]?.border || 'border-gray-500';
}

/**
 * Get text color class for a category
 */
export function getTextColor(category: string): string {
  const normalized = normalizeCategory(category);
  return categoryColors[normalized]?.text || 'text-gray-600';
}
