/**
 * Header component
 * 
 * Top navigation bar with starting location, search functionality, and category tabs.
 * Fixed positioning for full-viewport layout.
 */

import { SearchBar } from './SearchBar';
import { StartingLocationInput } from './StartingLocationInput';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="container mx-auto px-4 py-4">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Holistic Interoperability Engine
          </h1>
          <p className="text-sm text-gray-600">
            Connecting clinical and community wellness resources
          </p>
        </div>

        {/* Starting Location Input */}
        {onLocationSet && mapboxToken && (
          <div className="mb-3">
            <StartingLocationInput
              onLocationSet={onLocationSet}
              accessToken={mapboxToken}
            />
          </div>
        )}

        {/* Resource Search Bar */}
        <div className="mb-4">
          <SearchBar
            onSearch={onSearch}
            placeholder='Search for resources... (e.g., "respiratory recovery", "air quality")'
          />
        </div>

        {/* Tabs with green active state */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start bg-transparent p-0 h-auto border-b border-gray-200">
            <TabsTrigger
              value="all"
              className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-600 data-[state=active]:bg-transparent rounded-none"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="clinical"
              className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-600 data-[state=active]:bg-transparent rounded-none"
            >
              Clinical
            </TabsTrigger>
            <TabsTrigger
              value="community"
              className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-600 data-[state=active]:bg-transparent rounded-none"
            >
              Community
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-600 data-[state=active]:bg-transparent rounded-none"
            >
              Events
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
