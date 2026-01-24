/**
 * StartingLocationInput component
 * 
 * Input field for setting the starting location/center point for map queries.
 * Uses geocoding to convert addresses to coordinates.
 */

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StartingLocationInputProps {
  /** Callback when location is set */
  onLocationSet: (coordinates: [number, number]) => void;
  /** Mapbox access token for geocoding */
  accessToken: string;
  /** Current location value */
  value?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component for entering a starting location
 * 
 * Allows users to enter an address or zip code to center the map.
 */
export function StartingLocationInput({
  onLocationSet,
  accessToken,
  value: controlledValue,
  className = '',
}: StartingLocationInputProps) {
  const [localValue, setLocalValue] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const value = controlledValue !== undefined ? controlledValue : localValue;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = value.trim();
    if (!address) return;

    setIsGeocoding(true);

    try {
      // Import geocoding function dynamically to avoid issues
      const { geocodeAddress } = await import('@/lib/geocoding');
      const coordinates = await geocodeAddress(address, accessToken);

      if (coordinates) {
        onLocationSet(coordinates);
      } else {
        console.warn('Could not geocode address:', address);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setLocalValue(newValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <label className="block text-sm font-medium text-foreground mb-2">
        Starting Location
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Enter your address or zip code..."
          className="pl-10"
          disabled={isGeocoding}
        />
      </div>
    </form>
  );
}
