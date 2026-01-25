#!/usr/bin/env python3
"""
Web scraper using Jina.ai and OpenAI ChatGPT

Scrapes URLs using Jina.ai API and extracts structured information
using OpenAI GPT-4o-mini (cheapest and fastest model). Outputs results to JSON file.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Optional, Any
from urllib.parse import urlparse

import requests
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from root .env
root_dir = Path(__file__).parent.parent.parent
load_dotenv(root_dir / ".env")

# API Keys
JINA_API_KEY = os.getenv("JINA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Output file path
OUTPUT_FILE = Path(__file__).parent / "scraped_data.json"
# Input URLs file path
URLS_FILE = Path(__file__).parent / "urls.json"


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
            
            print(
                f"⚠️  Extracted {len(matches)} keyword matches, "
                f"created {len(merged_windows)} context windows, "
                f"reduced from {original_length} to {len(jina_output)} characters"
            )
        else:
            # No keywords found, just take beginning
            jina_output = jina_output[:max_input_chars] + "... [truncated]"
            print(
                f"⚠️  No address keywords found, truncated from {original_length} "
                f"to {max_input_chars} characters (beginning only)"
            )
    else:
        print(f"✅ Using full content ({original_length} characters)")

    # Configure OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Create structured prompt (keep it concise)
    # Note: Must mention "JSON" for OpenAI's json_object mode
    # Emphasize extracting COMPLETE street addresses
    prompt = f"""Extract information from web content and return it as a JSON object.

Rules:
2. Infer specific category (e.g., "Italian Restaurant", "Dental Clinic")
3. Extract coordinates only if explicitly visible as numbers (latitude/longitude); otherwise use null
4. Return ONLY valid JSON object, no markdown or additional text
5. If you see a partial address like "Los Angeles, CA", look nearby for the street number and name

STRICT ADDRESS EXTRACTION RULES:
1. must have a street number
2. a postal code 

Return a JSON object with this structure:
{{
  "name": "Business name or null",
  "category": "Inferred category",
  "description": "1-2 sentence summary",
  "website_url": "{source_url}",
  "address": "COMPLETE street address with number, street, city, state, ZIP or null",
  "phone_number": "Phone or null",
  "coordinates": {{"latitude": 0.0, "longitude": 0.0}}
}}

Web content to extract from:
{jina_output}"""

    # Debug output: Show what's being sent to AI
    print("\n" + "="*80)
    print("🐛 DEBUG: Content being sent to OpenAI")
    print("="*80)
    print("\n📄 Jina.ai Output (first 1000 chars):")
    print("-" * 80)
    print(jina_output[:1000] + ("..." if len(jina_output) > 1000 else ""))
    print(f"\n📊 Full Jina.ai output length: {len(jina_output)} characters")
    print("\n" + "-"*80)
    print("\n💬 Full Prompt being sent to OpenAI:")
    print("-" * 80)
    system_message = "You are a JSON extraction assistant. Return only valid JSON, no markdown or additional text."
    print(f"\n[SYSTEM]:\n{system_message}\n")
    print(f"[USER]:\n{prompt}\n")
    print("="*80 + "\n")

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
            "coordinates",
        ]

        # Ensure all required fields exist
        for field in required_fields:
            if field not in extracted_data:
                extracted_data[field] = None

        # Ensure coordinates structure
        if "coordinates" not in extracted_data or not isinstance(
            extracted_data["coordinates"], dict
        ):
            extracted_data["coordinates"] = {"latitude": None, "longitude": None}
        else:
            if "latitude" not in extracted_data["coordinates"]:
                extracted_data["coordinates"]["latitude"] = None
            if "longitude" not in extracted_data["coordinates"]:
                extracted_data["coordinates"]["longitude"] = None

        # Set website_url to source URL
        extracted_data["website_url"] = source_url

        return extracted_data

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON from LLM response: {str(e)}") from e
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}") from e


def save_to_file(data: Dict[str, Any]) -> None:
    """
    Save extracted data to JSON file (appends if file exists).

    Args:
        data: Dictionary with extracted information
    """
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                if not isinstance(existing_data, list):
                    existing_data = []
        except (json.JSONDecodeError, FileNotFoundError):
            existing_data = []
    else:
        existing_data = []

    existing_data.append(data)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)


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
            # Direct list of URLs: ["url1", "url2", ...]
            urls = [str(url) for url in data if url]
            original_structure = {"is_list": True, "data": data}
        elif isinstance(data, dict) and "urls" in data:
            # Object with urls key: {"urls": ["url1", "url2", ...]}
            urls = [str(url) for url in data["urls"] if url]
            original_structure = {"is_list": False, "data": data}
        else:
            raise ValueError(f"Invalid JSON format in {file_path}. Expected list or object with 'urls' key.")
        
        if not urls:
            raise ValueError(f"No URLs found in {file_path}")
        
        return urls, original_structure
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {file_path}: {str(e)}")


def save_urls_to_file(file_path: Path, remaining_urls: list[str], original_structure: dict) -> None:
    """
    Save remaining URLs back to the JSON file.
    
    Args:
        file_path: Path to the JSON file
        remaining_urls: List of URLs that haven't been processed yet
        original_structure: Original data structure format
    """
    try:
        if original_structure["is_list"]:
            # Save as simple list
            data = remaining_urls
        else:
            # Save as object with urls key
            data = original_structure["data"].copy()
            data["urls"] = remaining_urls
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"📝 Updated {file_path} - {len(remaining_urls)} URL(s) remaining")
    except Exception as e:
        print(f"⚠️  Warning: Could not update {file_path}: {str(e)}")


def process_url(url: str) -> bool:
    """
    Process a single URL: scrape and extract information.
    
    Args:
        url: URL to process
        
    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"\n{'='*80}")
        print(f"🔍 Scraping URL: {url}")
        print(f"{'='*80}")
        
        jina_content = scrape_url(url)
        print(f"✅ Scraped {len(jina_content)} characters from URL")

        print("🤖 Extracting structured information with OpenAI...")
        extracted_data = extract_info(jina_content, url)
        print("✅ Information extracted successfully")

        print(f"\n📋 Extracted Data:")
        print(json.dumps(extracted_data, indent=2, ensure_ascii=False))

        save_to_file(extracted_data)
        print(f"✅ Saved data for {url}")
        return True

    except ValueError as e:
        print(f"❌ Error processing {url}: {str(e)}", file=sys.stderr)
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error processing {url}: {str(e)}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"❌ Unexpected error processing {url}: {str(e)}", file=sys.stderr)
        return False


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
        print(f"📄 Loaded {len(urls_to_process)} URLs from {urls_file}")
    elif URLS_FILE.exists():
        # Use default urls.json file
        urls_file = URLS_FILE
        urls_to_process, original_structure = load_urls_from_file(URLS_FILE)
        print(f"📄 Loaded {len(urls_to_process)} URLs from {URLS_FILE}")
    elif args.url:
        # Single URL from command line
        urls_to_process = [args.url]
    else:
        print("❌ Error: No URL provided and no urls.json file found.")
        print("   Usage: python scraper.py <url> OR create urls.json file")
        sys.exit(1)

    # Apply limit if specified
    if args.limit and args.limit > 0:
        original_count = len(urls_to_process)
        urls_to_process = urls_to_process[:args.limit]
        print(f"📊 Limiting to {args.limit} URLs (from {original_count} total)")
    
    print(f"\n🚀 Processing {len(urls_to_process)} URL(s)...\n")

    # Process each URL
    successful = 0
    failed = 0
    successful_urls = []
    failed_urls = []
    
    for i, url in enumerate(urls_to_process, 1):
        print(f"\n📍 Processing {i}/{len(urls_to_process)}")
        if process_url(url):
            successful += 1
            successful_urls.append(url)
        else:
            failed += 1
            failed_urls.append(url)

    # Remove successfully processed URLs from urls.json if using file
    if urls_file and original_structure and successful_urls:
        remaining_urls = [url for url in urls_to_process if url not in successful_urls]
        save_urls_to_file(urls_file, remaining_urls, original_structure)

    # Summary
    print(f"\n{'='*80}")
    print(f"📊 Summary:")
    print(f"   ✅ Successful: {successful}")
    print(f"   ❌ Failed: {failed}")
    if urls_file and successful_urls:
        print(f"   🗑️  Removed {len(successful_urls)} processed URL(s) from {urls_file.name}")
    print(f"   📁 Output saved to: {OUTPUT_FILE}")
    print(f"{'='*80}\n")


if __name__ == "__main__":
    main()
