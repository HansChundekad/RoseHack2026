# Web Scraper with Jina.ai and OpenAI ChatGPT

A Python scraper that extracts structured information from web pages using Jina.ai for content parsing and OpenAI GPT-4o-mini (cheapest and fastest model) for data extraction.

## Features

- **Batch Processing**: Process multiple URLs from a JSON file
- **URL Scraping**: Uses Jina.ai `r.reader` API to parse web content
- **Smart Extraction**: Keyword-based window extraction to find address information anywhere in the document
- **Structured Extraction**: Uses OpenAI GPT-4o-mini LLM to extract information into JSON format
- **File Output**: Saves results to `scraped_data.json` (appends for multiple runs)
- **Rate Limiting**: Limit the number of URLs processed per run
- **Error Handling**: Comprehensive error handling for API calls and validation

## Setup

1. Install dependencies:
```bash
cd vital-map/scraper
pip install -r requirements.txt
```

2. Set up environment variables in the root `.env` file:
```env
JINA_API_KEY=your_jina_api_key
OPENAI_API_KEY=your_openai_api_key
```

Get API keys:
- Jina.ai: https://jina.ai/?sui=apikey
- OpenAI: https://platform.openai.com/api-keys

## Usage

### Process URLs from JSON File (Recommended)

The scraper can process multiple URLs from a JSON file. Create a `urls.json` file in the scraper folder:

```json
[
  "https://example.com/restaurant",
  "https://example.com/clinic",
  "https://example.com/shop"
]
```

Then run:
```bash
python scraper.py
```

This will automatically read from `urls.json` and process all URLs.

### Limit Number of URLs Processed

Process only the first N URLs:
```bash
python scraper.py --limit 5
```
or
```bash
python scraper.py -l 5
```

### Use Custom URLs File

```bash
python scraper.py --file my_urls.json
```
or
```bash
python scraper.py -f my_urls.json
```

### Process Single URL

You can still process a single URL directly:
```bash
python scraper.py https://example.com/restaurant
```

### Custom Output File

```bash
python scraper.py --output custom_output.json
```
or
```bash
python scraper.py -o custom_output.json
```

### Combine Options

```bash
python scraper.py --file urls.json --limit 10 --output results.json
```

## Output Format

Results are saved to `scraped_data.json` with the following structure:

```json
[
  {
    "name": "Business Name",
    "category": "Inferred Category",
    "description": "Brief description",
    "website_url": "https://example.com",
    "address": "Full address or null",
    "phone_number": "Phone number or null",
    "coordinates": {
      "latitude": 0.0,
      "longitude": 0.0
    }
  }
]
```

## Command-Line Options

- `url` (optional): Single URL to scrape (if not using `--file`)
- `--file, -f`: JSON file containing list of URLs (default: `urls.json` in scraper folder)
- `--output, -o`: Output file path (default: `scraped_data.json`)
- `--limit, -l`: Maximum number of URLs to process per run (default: no limit)

## Functions

### `scrape_url(url: str) -> str`
Parses URL content using Jina.ai API and returns extracted text.

### `extract_info(jina_output: str, source_url: str) -> dict`
Extracts structured information from Jina.ai output using OpenAI GPT-4o-mini LLM.

### `load_urls_from_file(file_path: Path) -> list[str]`
Loads URLs from a JSON file. Supports both array format `["url1", "url2"]` and object format `{"urls": ["url1", "url2"]}`.

### `process_url(url: str) -> bool`
Processes a single URL: scrapes content and extracts structured information. Returns `True` if successful.

## Future Database Integration

The code is structured to allow easy addition of database insertion. The `extract_info()` function returns a dictionary that can be directly inserted into the database after mapping to the appropriate schema.
