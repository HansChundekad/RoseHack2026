/**
 * MapMarker component
 * 
 * Custom HTML marker for Mapbox GL JS that displays resource information.
 * Shows resource name and category on hover/click.
 */

import type { Resource } from '@/types/resource';
import { getMarkerColor } from '@/lib/categoryColors';

/**
 * Creates a custom HTML marker element for Mapbox
 * 
 * This function creates a DOM element that can be used as a Mapbox marker.
 * The marker displays category-specific styling and shows resource name on hover.
 * 
 * @param resource - Resource data to display
 * @param onClick - Optional click handler
 * @returns HTML element for use with Mapbox marker
 */
export function createMapMarker(
  resource: Resource,
  onClick?: (resource: Resource) => void
): HTMLElement {
  // Create marker element
  const el = document.createElement('div');
  el.className = 'custom-marker';

  // Get unique color for this category
  const categoryColor = getMarkerColor(resource.category);

  // Create marker HTML
  el.innerHTML = `
    <div class="relative group">
      <div class="w-6 h-6 ${categoryColor} rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"></div>
      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div class="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          ${resource.name}
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  `;

  // Add click handler
  if (onClick) {
    el.addEventListener('click', () => onClick(resource));
  }

  return el;
}
