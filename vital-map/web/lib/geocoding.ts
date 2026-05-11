/**
 * Geocoding utilities
 *
 * Handles address to coordinates conversion for the "Starting Location" feature.
 */

const CITY_ABBREVIATIONS: Record<string, string> = {
  la: 'Los Angeles, CA',
  sf: 'San Francisco, CA',
  nyc: 'New York City, NY',
  ny: 'New York City, NY',
  chi: 'Chicago, IL',
  phx: 'Phoenix, AZ',
  pdx: 'Portland, OR',
  sea: 'Seattle, WA',
  lv: 'Las Vegas, NV',
  sd: 'San Diego, CA',
  sj: 'San Jose, CA',
  oak: 'Oakland, CA',
  bos: 'Boston, MA',
  dc: 'Washington, DC',
  atl: 'Atlanta, GA',
  mia: 'Miami, FL',
  dtx: 'Dallas, TX',
  hou: 'Houston, TX',
  den: 'Denver, CO',
  slc: 'Salt Lake City, UT',
};

/**
 * Geocode an address to coordinates using Mapbox Geocoding API
 *
 * @param address - Address string (e.g., "Los Angeles, CA", "90001", or "la")
 * @param accessToken - Mapbox access token
 * @returns Promise resolving to [lng, lat] or null if not found
 */
export async function geocodeAddress(
  address: string,
  accessToken: string
): Promise<[number, number] | null> {
  if (!address.trim() || !accessToken) {
    return null;
  }

  // Expand known city abbreviations before hitting the API
  const normalized = address.trim().toLowerCase();
  const expanded = CITY_ABBREVIATIONS[normalized] ?? address;

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        expanded
      )}.json?access_token=${accessToken}&limit=1&country=us&types=place,postcode,address,neighborhood`
    );

    if (!response.ok) {
      throw new Error('Geocoding API error');
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return [lng, lat];
    }

    return null;
  } catch (error) {
    console.error('Geocoding error for:', expanded, error);
    return null;
  }
}

export interface GeocodeResult {
  coords: [number, number];
  normalizedAddress: string;
}

export interface GeocodeError {
  error: string;
}

/**
 * Geocode an address with confidence validation.
 * Rejects results with Mapbox relevance < 0.5 (too vague/ambiguous).
 */
export async function geocodeWithValidation(
  address: string,
  accessToken: string
): Promise<GeocodeResult | GeocodeError> {
  const trimmed = address.trim();
  if (trimmed.length < 5) {
    return { error: 'Address is too short — please enter a full address.' };
  }
  if (!accessToken) {
    return { error: 'Geocoding service unavailable.' };
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
        `?access_token=${accessToken}&limit=1&types=address,poi,place`
    );

    if (!response.ok) {
      return { error: 'Geocoding service error — please try again.' };
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return { error: 'Address not found. Try adding a city or zip code.' };
    }

    const feature = data.features[0];

    if ((feature.relevance ?? 0) < 0.5) {
      return {
        error: `Address too ambiguous (matched "${feature.place_name}"). Please be more specific.`,
      };
    }

    const [lng, lat] = feature.center as [number, number];
    return { coords: [lng, lat], normalizedAddress: feature.place_name as string };
  } catch {
    return { error: 'Network error — please check your connection.' };
  }
}

/**
 * Calculate distance between two coordinates in miles
 * Uses Haversine formula
 * 
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
