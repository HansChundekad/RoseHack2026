/**
 * Header component
 * 
 * Top navigation bar with search functionality and category tabs.
 * Fixed positioning for full-viewport layout.
 */

import { SearchBar } from './SearchBar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface HeaderProps {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Active tab */
  activeTab?: 'all' | 'clinical' | 'community' | 'events';
  /** Callback when tab changes */
  onTabChange?: (tab: 'all' | 'clinical' | 'community' | 'events') => void;
}

/**
 * Component that provides the application header
 * 
 * Includes search bar and category tabs for filtering resources.
 * Uses shadcn/ui Tabs component for accessible tab navigation.
 */
export function Header({ onSearch, activeTab = 'all', onTabChange }: HeaderProps) {
  const handleTabChange = (value: string) => {
    const tab = value as 'all' | 'clinical' | 'community' | 'events';
    onTabChange?.(tab);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-background border-b z-50">
      <div className="container mx-auto px-4 py-4">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold">
            Holistic Interoperability Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Connecting clinical and community wellness resources
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar onSearch={onSearch} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="clinical">Clinical</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
