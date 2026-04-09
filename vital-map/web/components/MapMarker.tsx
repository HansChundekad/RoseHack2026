/**
 * MapMarker component
 *
 * Custom HTML marker for Mapbox GL JS that displays resource information.
 * Shows resource name on hover. Uses unified --tp-primary color.
 */

import type { Resource } from '@/types/resource';

/**
 * Creates a custom HTML marker element for Mapbox
 *
 * @param resource - Resource data to display
 * @param onClick - Optional click handler
 * @param onHover - Optional hover start handler
 * @param onHoverEnd - Optional hover end handler
 * @returns HTML element for use with Mapbox marker
 */
export function createMapMarker(
  resource: Resource,
  onClick?: (resource: Resource) => void,
  onHover?: (resource: Resource) => void,
  onHoverEnd?: () => void,
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.dataset.resourceId = String(resource.id);

  el.innerHTML = `
    <div class="relative group">
      <div class="marker-dot w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform duration-200" style="background-color: var(--tp-primary)"></div>
      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div class="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          ${resource.name}
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  `;

  if (onClick) {
    el.addEventListener('click', () => onClick(resource));
  }
  if (onHover) {
    el.addEventListener('mouseenter', () => onHover(resource));
  }
  if (onHoverEnd) {
    el.addEventListener('mouseleave', () => onHoverEnd());
  }

  return el;
}
