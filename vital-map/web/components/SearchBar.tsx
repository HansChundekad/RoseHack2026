/**
 * SearchBar component
 * 
 * Search input for semantic queries (e.g., "respiratory recovery", "air quality").
 * Supports natural language search that will be converted to vector embeddings.
 */

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  /** Callback when search is submitted */
  onSearch: (query: string) => void;
  /** Current search query value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component that provides search input for semantic queries
 * 
 * Handles natural language search queries that will be converted
 * to vector embeddings for semantic search.
 * Uses shadcn/ui Input and Button components.
 */
export function SearchBar({
  onSearch,
  value: controlledValue,
  placeholder = 'Search for resources... (e.g., "respiratory recovery", "air quality")',
  className = '',
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState('');

  // Use controlled value if provided, otherwise use local state
  const value = controlledValue !== undefined ? controlledValue : localValue;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = value.trim();
    if (query) {
      onSearch(query);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setLocalValue(newValue);
    }
    // If controlled, parent handles the change
  };

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--tp-muted)' }}
          />
          <Input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="pl-10 pr-4 rounded-xl h-12"
            style={{
              borderColor: 'var(--tp-muted)',
              color: 'var(--tp-text)',
            }}
          />
        </div>
        <Button
          type="submit"
          className="text-white rounded-xl h-12"
          style={{
            backgroundColor: 'var(--tp-primary)',
          }}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
