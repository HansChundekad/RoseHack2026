/**
 * PostGIS utility functions
 * 
 * Handles conversion between PostGIS geometry formats and
 * formats required by mapping libraries (Mapbox, Leaflet, etc.)
 */

/**
 * Parses a PostGIS Point string into a [longitude, latitude] array
 * 
 * @param point - PostGIS Point string in format "POINT(lng lat)"
 * @returns Tuple of [longitude, latitude] for use with Mapbox GL JS
 * @throws Error if the point string format is invalid
 * 
 * @example
 * parsePostGISPoint("POINT(-122.41 37.77)")
 * // Returns: [-122.41, 37.77]
 */
export function parsePostGISPoint(
  point: string
): [number, number] {
  if (!point || typeof point !== 'string') {
    throw new Error('Point must be a non-empty string');
  }

  // Remove "POINT(" and ")" wrapper
  const cleaned = point.trim().toUpperCase();
  
  if (!cleaned.startsWith('POINT(') || !cleaned.endsWith(')')) {
    throw new Error(
      `Invalid PostGIS Point format. Expected "POINT(lng lat)", got: ${point}`
    );
  }

  // Extract coordinates: "POINT(-122.41 37.77)" -> "-122.41 37.77"
  const coordsString = cleaned.slice(6, -1).trim();
  const coords = coordsString.split(/\s+/);

  if (coords.length !== 2) {
    throw new Error(
      `Invalid coordinate count. Expected 2 values (lng lat), got: ${coords.length}`
    );
  }

  const lng = parseFloat(coords[0]);
  const lat = parseFloat(coords[1]);

  if (isNaN(lng) || isNaN(lat)) {
    throw new Error(
      `Invalid coordinate values. Could not parse: ${coordsString}`
    );
  }

  // Validate coordinate ranges
  if (lng < -180 || lng > 180) {
    throw new Error(`Longitude out of range: ${lng}. Must be between -180 and 180`);
  }
  
  if (lat < -90 || lat > 90) {
    throw new Error(`Latitude out of range: ${lat}. Must be between -90 and 90`);
  }

  return [lng, lat];
}

/**
 * Validates if a string is a valid PostGIS Point format
 * 
 * @param point - String to validate
 * @returns True if the string matches PostGIS Point format
 */
export function isValidPostGISPoint(point: string): boolean {
  try {
    parsePostGISPoint(point);
    return true;
  } catch {
    return false;
  }
}
