/**
 * Header component
 * 
 * Top navigation bar with starting location, search functionality, and category tabs.
 * Fixed positioning for full-viewport layout.
 */

import { SearchBar } from './SearchBar';
import { StartingLocationInput } from './StartingLocationInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Callback when starting location is set */
  onLocationSet?: (coordinates: [number, number]) => void;
  /** Mapbox access token for geocoding */
  mapboxToken?: string;
  /** Active tab */
  activeTab?: 'all' | 'clinical' | 'community' | 'events';
  /** Callback when tab changes */
  onTabChange?: (tab: 'all' | 'clinical' | 'community' | 'events') => void;
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
  activeTab = 'all',
  onTabChange,
}: HeaderProps) {
  const handleTabChange = (value: string) => {
    const tab = value as 'all' | 'clinical' | 'community' | 'events';
    onTabChange?.(tab);
  };

  return (
    <header className="fixed top-0 left-0 right-0 border-b z-50" style={{ backgroundColor: 'var(--tp-card)', borderColor: 'var(--tp-muted)' }}>
      {/* Green Banner */}
      <div className="w-full py-8" style={{ backgroundColor: 'var(--tp-primary)' }}>
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white font-display tracking-tight">
              Taproot
            </h1>
            <p className="text-sm font-sans text-white/70 mt-1">
              Find your path to wellness
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8 pb-6">
        {/* Search Bars - Side by Side */}
        <div className="mb-4 flex gap-6 items-end">
          {/* Starting Location Input */}
          {onLocationSet && mapboxToken && (
            <div className="flex-1">
              <StartingLocationInput
                onLocationSet={onLocationSet}
                accessToken={mapboxToken}
              />
            </div>
          )}

          {/* Semantic Search Bar */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tp-muted)' }}>
              Search Resources
            </label>
            <SearchBar
              onSearch={onSearch}
              placeholder='Search for resources... (e.g., "respiratory recovery", "air quality")'
            />
          </div>
        </div>

        {/* Category Tab Pills */}
        <div className="flex gap-2">
          {(['all', 'clinical', 'community', 'events'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              className={cn(
                'rounded-full px-5 h-9 capitalize',
                activeTab === tab && 'text-white',
              )}
              style={activeTab === tab ? { backgroundColor: 'var(--tp-primary)' } : undefined}
              onClick={() => handleTabChange(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
