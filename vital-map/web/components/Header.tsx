/**
 * Header component
 * 
 * Top navigation bar with starting location, search functionality, and category tabs.
 * Fixed positioning for full-viewport layout.
 */

import Image from 'next/image';
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
      {/* Green Banner */}
      <div className="bg-green-600 w-full py-2">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-bold text-white">
              TopRoot
            </h1>
            <p className="text-sm text-white/90">
              Find your path to wellness
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Search Bars - Side by Side with Logo */}
        <div className="mb-4 flex gap-6 items-end">
          {/* Logo Image - Positioned on the far left */}
          <div className="flex-shrink-0 flex items-end -ml-2">
            <Image
              src="/logo.png"
              alt="TopRoot Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Resources
            </label>
            <SearchBar
              onSearch={onSearch}
              placeholder='Search for resources... (e.g., "respiratory recovery", "air quality")'
            />
          </div>
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
