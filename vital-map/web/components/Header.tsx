/**
 * Header component
 * 
 * Top navigation bar with starting location, search functionality, and category tabs.
 * Fixed positioning for full-viewport layout.
 */

import { useRef, useEffect, useCallback } from 'react';
import { SearchBar } from './SearchBar';
import { StartingLocationInput } from './StartingLocationInput';

interface HeaderProps {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Callback when starting location is set */
  onLocationSet?: (coordinates: [number, number]) => void;
  /** Mapbox access token for geocoding */
  mapboxToken?: string;
  /** Reports the measured header height */
  onHeightChange?: (height: number) => void;
}

/**
 * Component that provides the application header
 * 
 * Includes starting location input, search bar, and category tabs.
 * Uses green/blue color scheme matching the design.
 */
export function Header({
  onSearch,
  onLocationSet,
  mapboxToken,
  onHeightChange,
}: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  const measureHeight = useCallback(() => {
    if (headerRef.current && onHeightChange) {
      onHeightChange(headerRef.current.offsetHeight);
    }
  }, [onHeightChange]);

  useEffect(() => {
    measureHeight();
    window.addEventListener('resize', measureHeight);
    return () => window.removeEventListener('resize', measureHeight);
  }, [measureHeight]);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 border-b z-50 animate-mobile-header"
      style={{ backgroundColor: 'var(--tp-card)', borderColor: 'var(--tp-muted)' }}
    >
      {/* Green Banner */}
      <div className="w-full py-3 md:py-4" style={{ backgroundColor: 'var(--tp-primary)' }}>
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white font-display tracking-tight">
              Taproot
            </h1>
            <p className="hidden md:block text-sm font-sans text-white/70 mt-1">
              Find your path to wellness
            </p>
          </div>
        </div>
      </div>

      {/* Search section */}
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        <div className="flex gap-2 md:gap-6 items-end">
          {onLocationSet && mapboxToken && (
            <div className="flex-1">
              <StartingLocationInput
                onLocationSet={onLocationSet}
                accessToken={mapboxToken}
              />
            </div>
          )}
          <div className="flex-1">
            <SearchBar
              onSearch={onSearch}
              placeholder='Search resources...'
            />
          </div>
        </div>
      </div>
    </header>
  );
}
