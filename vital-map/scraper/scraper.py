#!/usr/bin/env python3
"""
Web scraper using Jina.ai and OpenAI ChatGPT

Scrapes URLs using Jina.ai API and extracts structured information
using OpenAI GPT-4o-mini (cheapest and fastest model). Outputs to Supabase.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Optional, Any, List
from urllib.parse import urlparse

import requests
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator, ValidationError
from supabase import create_client, Client

# Load environment variables from root .env
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / ".env")

# API Keys
JINA_API_KEY = os.getenv("JINA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Mapbox configuration (for geocoding fallback)
MAPBOX_ACCESS_TOKEN = (
    os.getenv("MAPBOX_ACCESS_TOKEN") or
    os.getenv("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN")
)

# Supabase configuration
# Falls back to NEXT_PUBLIC_SUPABASE_URL if SUPABASE_URL not set
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Input URLs file path
URLS_FILE = Path(__file__).parent / "urls.json"

# Initialize Supabase client (lazy - created when needed)
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
            )
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client


def geocode_address(address: str) -> Optional[str]:
    """
    Convert address to WKT POINT format using Mapbox Geocoding API.

    Args:
        address: Full street address to geocode

    Returns:
        WKT POINT string "POINT(lon lat)" or None if geocoding fails
    """
    if not MAPBOX_ACCESS_TOKEN:
        print("⚠️  MAPBOX_ACCESS_TOKEN not set, skipping geocoding", file=sys.stderr)
        return None

    if not address or not address.strip():
        return None

    try:
        # Mapbox Geocoding API endpoint
        url = "https://api.mapbox.com/geocoding/v5/mapbox.places/{}.json".format(
            requests.utils.quote(address.strip())
        )
        params = {
            "access_token": MAPBOX_ACCESS_TOKEN,
            "limit": 1,
            "types": "address,poi",
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        features = data.get("features", [])

        if not features:
            print(f"⚠️  No geocoding results for: {address[:50]}...", file=sys.stderr)
            return None

        # Extract coordinates [longitude, latitude]
        coords = features[0].get("center")
        if not coords or len(coords) != 2:
            return None

        lon, lat = coords[0], coords[1]

        # Validate coordinate ranges
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            print(f"⚠️  Invalid coordinates from geocoding: {lon}, {lat}", file=sys.stderr)
            return None

        return f"POINT({lon} {lat})"

    except requests.exceptions.RequestException as e:
        print(f"⚠️  Geocoding API error: {e}", file=sys.stderr)
        return None
    except (KeyError, IndexError, ValueError) as e:
        print(f"⚠️  Geocoding parse error: {e}", file=sys.stderr)
        return None


class LocationSchema(BaseModel):
    """
    Pydantic schema for location data validation.
    Matches Supabase locations table schema exactly.
    """
    name: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    website_url: str = Field(..., min_length=1, max_length=1000)
    address: str = Field(..., min_length=1, max_length=500)
    phone_number: Optional[str] = Field(None, max_length=50)
    geom: str = Field(..., min_length=1)
    embedding: Optional[List[float]] = Field(None, min_length=1536, max_length=1536)

    @field_validator('geom')
    @classmethod
    def validate_geom(cls, v: str) -> str:
        """Validate WKT POINT format and coordinate ranges."""
        if not v.startswith('POINT(') or not v.endswith(')'):
            raise ValueError('geom must be in WKT POINT format: POINT(lon lat)')

        try:
            coords_str = v[6:-1]
            parts = coords_str.split()
            if len(parts) != 2:
                raise ValueError('POINT must contain exactly 2 coordinates')

            lon, lat = float(parts[0]), float(parts[1])

            if not -180 <= lon <= 180:
                raise ValueError(f'longitude {lon} out of range [-180, 180]')
            if not -90 <= lat <= 90:
                raise ValueError(f'latitude {lat} out of range [-90, 90]')

            return v
        except (ValueError, IndexError) as e:
            raise ValueError(f'Invalid POINT format: {e}')

    @field_validator('embedding')
    @classmethod
    def validate_embedding(cls, v: Optional[List[float]]) -> Optional[List[float]]:
        """Validate embedding has exactly 1536 dimensions."""
        if v is None:
            return None
        if len(v) != 1536:
            raise ValueError(f'embedding must have 1536 dimensions, got {len(v)}')
        return v

    @field_validator('name', 'category', 'address', 'website_url')
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        """Ensure required string fields are not empty after stripping."""
        if not v or not v.strip():
            raise ValueError('field cannot be empty')
        return v.strip()

    @field_validator('phone_number', 'description')
    @classmethod
    def validate_optional_strings(cls, v: Optional[str]) -> Optional[str]:
        """Strip whitespace from optional string fields."""
        if v is None or not v.strip():
            return None
        return v.strip()


def scrape_url(url: str) -> str:
    """
    Parse URL content using Jina.ai API.

    Args:
        url: The URL to scrape

    Returns:
        Extracted text content as a string

    Raises:
        ValueError: If URL is invalid
        requests.RequestException: If API call fails
    """
    # Validate URL format
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"Invalid URL format: {url}")

    if not JINA_API_KEY:
        raise ValueError(
            "JINA_API_KEY not found in environment variables. "
            "Please set it in your .env file."
        )

    # Jina.ai r.reader API endpoint
    api_url = "https://r.jina.ai/"
    headers = {
        "Authorization": f"Bearer {JINA_API_KEY}",
        "Accept": "application/json",
    }

    try:
        response = requests.get(f"{api_url}{url}", headers=headers, timeout=30)
        response.raise_for_status()

        # Jina.ai returns markdown content
        content = response.text
        return content

    except requests.exceptions.RequestException as e:
        raise requests.exceptions.RequestException(
            f"Jina.ai API error: {str(e)}"
        ) from e


def generate_embedding(data: Dict[str, Any]) -> Optional[List[float]]:
    """
    Generate an embedding vector for the extracted data.

    Creates a text representation from name, category, description, and address,
    then generates an embedding using OpenAI's text-embedding-3-small model.

    Args:
        data: Dictionary with extracted information

    Returns:
        List of floats representing the embedding (1536 dimensions), or None if failed
    """
    if not OPENAI_API_KEY:
        return None
    
    # Create a text representation for embedding
    # Combine relevant fields that should be searchable
    text_parts = []
    
    if data.get("name"):
        text_parts.append(f"Name: {data['name']}")
    if data.get("category"):
        text_parts.append(f"Category: {data['category']}")
    if data.get("description"):
        text_parts.append(f"Description: {data['description']}")
    if data.get("address"):
        text_parts.append(f"Location: {data['address']}")
    
    if not text_parts:
        return None
    
    text_to_embed = " ".join(text_parts)
    
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        # Use text-embedding-3-small (cheapest, 1536 dimensions)
        # This matches the dimension expected by the frontend
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text_to_embed,
        )
        
        embedding = response.data[0].embedding
        return embedding
        
    except Exception as e:
        return None


def extract_info(
    jina_output: str, source_url: str, max_input_chars: int = 8000
) -> Dict[str, Any]:
    """
    Extract structured information from Jina.ai output using OpenAI LLM.

    Args:
        jina_output: The text content from Jina.ai
        source_url: The original URL that was scraped
        max_input_chars: Maximum characters to send to LLM (default: 5000)

    Returns:
        Dictionary with extracted information matching the JSON structure

    Raises:
        ValueError: If API key is missing
        Exception: If LLM extraction fails
    """
    if not OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY not found in environment variables. "
            "Please set it in your .env file."
        )

    # Smart extraction: search for address-related keywords and extract context windows
    original_length = len(jina_output)
    window_size = 500  # Characters before and after each keyword match
    
    if original_length > max_input_chars:
        # Keywords to search for (case-insensitive)
        address_keywords = [
            "address", "contact", "location", "find us", "visit us", "footer"
        ]
        
        # Find all keyword matches with their positions
        matches = []
        jina_lower = jina_output.lower()
        
        for keyword in address_keywords:
            start = 0
            while True:
                pos = jina_lower.find(keyword, start)
                if pos == -1:
                    break
                matches.append(pos)
                start = pos + 1
        
        # Remove duplicate positions (if same position found by multiple keywords)
        matches = sorted(set(matches))
        
        # Extract windows around each match
        extracted_windows = []
        for match_pos in matches:
            window_start = max(0, match_pos - window_size)
            window_end = min(len(jina_output), match_pos + len(keyword) + window_size)
            window_text = jina_output[window_start:window_end]
            extracted_windows.append((window_start, window_end, window_text))
        
        # Merge overlapping windows
        if extracted_windows:
            merged_windows = []
            extracted_windows.sort(key=lambda x: x[0])  # Sort by start position
            
            current_start, current_end, current_text = extracted_windows[0]
            for start, end, text in extracted_windows[1:]:
                if start <= current_end:  # Overlapping or adjacent
                    # Merge windows
                    current_end = max(current_end, end)
                    current_text = jina_output[current_start:current_end]
                else:
                    # Save current window and start new one
                    merged_windows.append((current_start, current_end, current_text))
                    current_start, current_end, current_text = start, end, text
            merged_windows.append((current_start, current_end, current_text))
            
            # Combine all merged windows
            combined_text = "\n\n[...]\n\n".join([text for _, _, text in merged_windows])
            
            # Also include beginning of document (for name/description) if space allows
            beginning_text = jina_output[:min(1000, len(jina_output))]
            remaining_chars = max_input_chars - len(combined_text)
            
            if remaining_chars > 100 and len(beginning_text) > 0:
                # Add beginning content if we have space
                if len(beginning_text) > remaining_chars:
                    beginning_text = beginning_text[:remaining_chars]
                combined_text = beginning_text + "\n\n[...]\n\n" + combined_text
            
            # Final truncation if still too long
            if len(combined_text) > max_input_chars:
                combined_text = combined_text[:max_input_chars] + "... [truncated]"
            
            jina_output = combined_text
            
            pass  # Content truncated and prioritized
        else:
            # No keywords found, just take beginning
            jina_output = jina_output[:max_input_chars] + "... [truncated]"
    else:
        pass  # Using full content

    # Configure OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Create structured prompt (keep it concise)
    # Note: Must mention "JSON" for OpenAI's json_object mode
    # Emphasize extracting COMPLETE street addresses
    prompt = f"""Extract information from web content and return it as a JSON object.

CRITICAL REQUIREMENTS:
1. Business name must exist (required)
2. Complete street address with street number AND postal code (required)
3. Coordinates are OPTIONAL - only extract if explicitly visible

COORDINATE EXTRACTION (if available):
- Search for explicit latitude/longitude values in the content
- Check for Google Maps links, embedded maps, or location metadata
- Format as: "POINT(longitude latitude)" - LONGITUDE FIRST, then LATITUDE
- Example: For latitude 34.0522, longitude -118.2437 → "POINT(-118.2437 34.0522)"
- If coordinates are NOT found, set geom to null (we will geocode from address)

ADDRESS EXTRACTION (required):
- Must include street number, street name, city, state, and ZIP code
- Example: "123 Main St, Los Angeles, CA 90012"
- Partial addresses (e.g., just "Los Angeles, CA") are NOT acceptable

Return a JSON object with this structure:
{{
  "name": "Business name or null",
  "category": "Inferred specific category (e.g., Italian Restaurant, Dental Clinic)",
  "description": "1-2 sentence summary or null",
  "website_url": "{source_url}",
  "address": "COMPLETE street address or null",
  "phone_number": "Phone number or null",
  "geom": "POINT(-118.2437 34.0522) or null"
}}

IMPORTANT: Name and address are REQUIRED. If either cannot be found, return null for ALL fields.
Geom is optional - set to null if coordinates are not visible on the page.
The embedding field will be added automatically after extraction.

Web content to extract from:
{jina_output}"""

    # Debug output removed for performance

    try:
        # Use cheapest and fastest OpenAI model: gpt-4o-mini
        # gpt-4o-mini is the cheapest OpenAI model and very fast
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON extraction assistant. Return only valid JSON, no markdown or additional text.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0,  # Lower temperature for consistent output
            max_tokens=500,  # Limit output tokens to reduce costs
            response_format={"type": "json_object"},  # Force JSON output
        )
        # Extract text from response
        response_text = response.choices[0].message.content.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # Parse JSON
        extracted_data = json.loads(response_text)

        # Validate structure
        required_fields = [
            "name",
            "category",
            "description",
            "website_url",
            "address",
            "phone_number",
            "geom",
            "embedding",
        ]

        # Ensure all required fields exist
        for field in required_fields:
            if field not in extracted_data:
                if field == "embedding":
                    # Generate embedding if not present
                    try:
                        extracted_data[field] = generate_embedding(extracted_data)
                    except Exception:
                        extracted_data[field] = None
                else:
                    extracted_data[field] = None

        # Validate geom is in WKT POINT format
        geom = extracted_data.get("geom")
        if not geom or not isinstance(geom, str):
            extracted_data["geom"] = None
        elif not geom.startswith("POINT(") or not geom.endswith(")"):
            extracted_data["geom"] = None
        else:
            # Basic WKT format validation: "POINT(lon lat)"
            try:
                coords_str = geom[6:-1]  # Remove "POINT(" and ")"
                parts = coords_str.split()
                if len(parts) != 2:
                    extracted_data["geom"] = None
                else:
                    lon, lat = float(parts[0]), float(parts[1])
                    # Validate ranges
                    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                        extracted_data["geom"] = None
            except (ValueError, IndexError):
                extracted_data["geom"] = None

        # GEOCODING FALLBACK: If geom is null but address exists, geocode the address
        if not extracted_data.get("geom") and extracted_data.get("address"):
            address = extracted_data["address"]
            if address and isinstance(address, str) and address.strip():
                geocoded_geom = geocode_address(address)
                if geocoded_geom:
                    extracted_data["geom"] = geocoded_geom

        # Set website_url to source URL
        extracted_data["website_url"] = source_url

        # Generate embedding for the entry
        try:
            embedding = generate_embedding(extracted_data)
            extracted_data["embedding"] = embedding
        except Exception:
            extracted_data["embedding"] = None

        return extracted_data

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from LLM response: {str(e)}") from e
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}") from e


def is_valid_entry(data: Dict[str, Any]) -> bool:
    """
    Validate entry using Pydantic schema before database insertion.

    Args:
        data: Dictionary with extracted information

    Returns:
        True if entry passes all validation rules, False otherwise
    """
    try:
        LocationSchema(**data)
        return True
    except ValidationError as e:
        # Log validation errors for debugging
        print(f"⚠️  Validation failed: {e}", file=sys.stderr)
        return False


def save_to_supabase(data: Dict[str, Any]) -> bool:
    """
    Save extracted data to Supabase using insert_location RPC.
    Uses upsert logic - reruns with same URL update existing rows.

    Args:
        data: Dictionary with extracted information

    Returns:
        True if saved/updated, False if skipped due to validation
    """
    # Validate entry before saving
    if not is_valid_entry(data):
        return False

    try:
        client = get_supabase_client()

        # Call the insert_location RPC function
        # This handles upsert logic and bypasses RLS safely
        result = client.rpc(
            "insert_location",
            {
                "p_name": data.get("name"),
                "p_category": data.get("category"),
                "p_description": data.get("description"),
                "p_website_url": data.get("website_url"),
                "p_address": data.get("address"),
                "p_phone_number": data.get("phone_number"),
                "p_geom": data.get("geom"),
                "p_embedding": data.get("embedding"),
            },
        ).execute()

        # RPC returns the location ID
        location_id = result.data
        if location_id:
            return True
        return False

    except Exception as e:
        print(f"❌ Error saving to Supabase: {str(e)}", file=sys.stderr)
        raise


def load_urls_from_file(file_path: Path) -> tuple[list[str], dict]:
    """
    Load URLs from a JSON file.
    
    Args:
        file_path: Path to the JSON file containing URLs
        
    Returns:
        Tuple of (list of URLs, original data structure)
        
    Raises:
        ValueError: If file doesn't exist or is invalid
    """
    if not file_path.exists():
        raise ValueError(f"URLs file not found: {file_path}")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # Handle different JSON formats
        if isinstance(data, list):
            if data and isinstance(data[0], dict) and "url" in data[0]:
                # New format: [{"url": "..."}, {"url": "..."}, ...]
                urls = [str(item["url"]) for item in data if isinstance(item, dict) and item.get("url")]
                original_structure = {"format": "objects", "data": data}
            else:
                # Old format: ["url1", "url2", ...]
                urls = [str(url) for url in data if url]
                original_structure = {"format": "strings", "data": data}
        elif isinstance(data, dict) and "urls" in data:
            # Old format: {"urls": ["url1", "url2", ...]}
            urls = [str(url) for url in data["urls"] if url]
            original_structure = {"format": "dict_urls", "data": data}
        else:
            raise ValueError(f"Invalid JSON format in {file_path}. Expected list of objects with 'url' key, list of strings, or object with 'urls' key.")
        
        if not urls:
            raise ValueError(f"No URLs found in {file_path}")
        
        return urls, original_structure
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {file_path}: {str(e)}")


def save_urls_to_file(file_path: Path, remaining_urls: list[str], original_structure: dict) -> None:
    """
    Save remaining URLs back to the JSON file.
    Uses new format: [{"url": "..."}, ...]
    
    Args:
        file_path: Path to the JSON file
        remaining_urls: List of URLs that haven't been processed yet
        original_structure: Original data structure format
    """
    try:
        # Always save in new format: [{"url": "..."}, ...]
        data = [{"url": url} for url in remaining_urls]
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        pass  # URLs file updated
    except Exception:
        pass  # Failed to update URLs file


def process_url(url: str) -> str:
    """
    Process a single URL: scrape and extract information.

    Args:
        url: URL to process

    Returns:
        "saved" if entry was saved to Supabase, "trashed" if invalid, "failed" if error
    """
    try:
        jina_content = scrape_url(url)
        extracted_data = extract_info(jina_content, url)

        if extracted_data and isinstance(extracted_data, dict):
            # Validation happens inside save_to_supabase()
            # Uses upsert - same URL updates existing row
            try:
                was_saved = save_to_supabase(extracted_data)
                if was_saved:
                    return "saved"
                else:
                    return "trashed"
            except Exception as save_error:
                print(f"❌ Error saving data for {url}: {str(save_error)}", file=sys.stderr)
                return "failed"
        else:
            print(f"❌ No valid data extracted for {url}", file=sys.stderr)
            return "failed"

    except ValueError as e:
        print(f"❌ Error processing {url}: {str(e)}", file=sys.stderr)
        return "failed"
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error processing {url}: {str(e)}", file=sys.stderr)
        return "failed"
    except Exception as e:
        print(f"❌ Unexpected error processing {url}: {str(e)}", file=sys.stderr)
        return "failed"


def main():
    """Main function to run the scraper from command line."""
    parser = argparse.ArgumentParser(
        description="Scrape URL(s) and extract structured information"
    )
    parser.add_argument(
        "url",
        nargs="?",
        help="Single URL to scrape (optional if using --file)",
        default=None,
    )
    parser.add_argument(
        "--file",
        "-f",
        help="JSON file containing list of URLs (default: urls.json in scraper folder)",
        default=None,
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Output file path (default: scraped_data.json)",
        default=None,
    )
    parser.add_argument(
        "--limit",
        "-l",
        type=int,
        help="Maximum number of URLs to process per run (default: no limit)",
        default=None,
    )

    args = parser.parse_args()

    # Override output file if specified
    global OUTPUT_FILE
    if args.output:
        OUTPUT_FILE = Path(args.output)

    # Determine URLs to process
    urls_to_process = []
    urls_file = None
    original_structure = None
    
    if args.file:
        # Load from specified file
        urls_file = Path(args.file)
        urls_to_process, original_structure = load_urls_from_file(urls_file)
    elif URLS_FILE.exists():
        # Use default urls.json file
        try:
            urls_file = URLS_FILE
            urls_to_process, original_structure = load_urls_from_file(URLS_FILE)
        except ValueError as e:
            print(f"❌ Error: {str(e)}", file=sys.stderr)
            print("   Usage: python scraper.py <url> OR add URLs to urls.json file", file=sys.stderr)
            sys.exit(1)
    elif args.url:
        # Single URL from command line
        urls_to_process = [args.url]
    else:
        print("❌ Error: No URL provided and no urls.json file found.", file=sys.stderr)
        print("   Usage: python scraper.py <url> OR create urls.json file", file=sys.stderr)
        sys.exit(1)

    # Apply limit if specified
    if args.limit and args.limit > 0:
        urls_to_process = urls_to_process[:args.limit]

    # Process each URL
    successful = 0
    failed = 0
    trashed = 0  # Entries that were processed but failed validation
    successful_urls = []
    failed_urls = []
    trashed_urls = []  # URLs that were processed but had invalid data
    
    for i, url in enumerate(urls_to_process, 1):
        result = process_url(url)
        if result == "saved":
            successful += 1
            successful_urls.append(url)
        elif result == "trashed":
            trashed += 1
            trashed_urls.append(url)
        else:  # "failed"
            failed += 1
            failed_urls.append(url)

    # Remove all processed URLs (both successful and trashed) from urls.json if using file
    # Only keep URLs that had actual processing errors (API failures, etc.)
    if urls_file and original_structure:
        # Remove URLs that were successfully processed OR trashed (validation failures)
        # Keep only URLs that had actual errors
        processed_urls = successful_urls + trashed_urls
        remaining_urls = [url for url in urls_to_process if url not in processed_urls]
        if processed_urls:
            save_urls_to_file(urls_file, remaining_urls, original_structure)

    # Summary
    if len(urls_to_process) > 1 or failed > 0 or trashed > 0:
        summary_parts = []
        if successful > 0:
            summary_parts.append(f"{successful} saved")
        if trashed > 0:
            summary_parts.append(f"{trashed} trashed")
        if failed > 0:
            summary_parts.append(f"{failed} failed")
        if summary_parts:
            print(f"Processed {len(urls_to_process)}: {', '.join(summary_parts)}")


if __name__ == "__main__":
    main()
