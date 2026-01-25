# Web Scraper with Jina.ai and OpenAI ChatGPT

A Python scraper that extracts structured location data from web pages using Jina.ai for content parsing and OpenAI GPT-4o-mini for data extraction. Outputs directly to Supabase.

## Features

- **Batch Processing**: Process multiple URLs from a JSON file
- **URL Scraping**: Uses Jina.ai `r.reader` API to parse web content
- **Smart Extraction**: Keyword-based window extraction to find address information
- **Structured Extraction**: Uses OpenAI GPT-4o-mini LLM to extract data as JSON
- **Supabase Integration**: Direct insert via secure RPC function
- **Idempotent Upserts**: Same URL updates existing row (no duplicates)
- **Schema Validation**: Pydantic validation before database insertion
- **Error Handling**: Comprehensive error handling for API calls

## Setup

1. Install dependencies:
```bash
cd vital-map/scraper
pip install -r requirements.txt
```

2. Set up environment variables in the root `.env` file:
```env
# Required: API Keys
JINA_API_KEY=your_jina_api_key
OPENAI_API_KEY=your_openai_api_key

# Required: Supabase (scraper uses service role for insert)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Mapbox (for geocoding fallback - uses NEXT_PUBLIC if not set)
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

**Note**: The scraper can also use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` as fallbacks.

Get API keys:
- Jina.ai: https://jina.ai/?sui=apikey
- OpenAI: https://platform.openai.com/api-keys
- Supabase: Project Settings → API → service_role key
- Mapbox: https://account.mapbox.com/access-tokens/ (free tier: 100k/month)

## Database Setup

Before running the scraper, ensure these migrations have been applied to Supabase:

```bash
# In order:
database/migrations/001_initial_schema.sql
database/migrations/002_enable_rls.sql
database/migrations/003_add_address_phone.sql
database/migrations/004_align_schema_constraints.sql
database/migrations/005_add_deduplication.sql

# And this RPC function:
database/functions/insert_location.sql
```

## Usage

### Process URLs from JSON File (Recommended)

Create a `urls.json` file in the scraper folder:

```json
[
  {"url": "https://example.com/restaurant"},
  {"url": "https://example.com/clinic"}
]
```

Then run:
```bash
python scraper.py
```

### Limit Number of URLs Processed

```bash
python scraper.py --limit 5
# or
python scraper.py -l 5
```

### Use Custom URLs File

```bash
python scraper.py --file my_urls.json
# or
python scraper.py -f my_urls.json
```

### Process Single URL

```bash
python scraper.py https://example.com/restaurant
```

## Validation Rules

Entries are only saved if they pass ALL validations:

- **name**: Required, non-empty string (max 500 chars)
- **category**: Required, non-empty string (max 200 chars)
- **address**: Required, complete street address (max 500 chars)
- **geom**: Required, WKT POINT format with valid coordinates
- **website_url**: Required (auto-set to source URL)
- **embedding**: Optional, exactly 1536 dimensions if present

Entries failing validation are marked as "trashed" and skipped.

## Output Schema

Data is inserted into the Supabase `locations` table:

```sql
CREATE TABLE locations (
    id bigint PRIMARY KEY,           -- auto-generated
    name text NOT NULL,              -- business name
    category text NOT NULL,          -- inferred category
    description text,                -- 1-2 sentence summary
    website_url text NOT NULL,       -- source URL
    address text NOT NULL,           -- complete street address
    phone_number text,               -- optional contact
    geom geometry(Point, 4326),      -- PostGIS coordinates
    embedding vector(1536),          -- semantic search vector
    created_at timestamptz           -- auto-generated
);
```

### Geom Format

Coordinates are stored in PostGIS WKT format:
```
POINT(longitude latitude)
```

Example: `POINT(-118.2437 34.0522)` for Los Angeles

**Important**: Longitude comes first, then latitude.

## Idempotency

The scraper uses upsert logic via the `insert_location` RPC function:

- **New URL**: Creates new row
- **Existing URL**: Updates existing row (preserves embedding if new is NULL)
- **Same URL scraped twice**: No duplicate - just updates

This makes reruns safe and prevents database bloat.

## Command-Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `url` | - | Single URL to scrape (optional) |
| `--file` | `-f` | JSON file with URLs (default: urls.json) |
| `--limit` | `-l` | Max URLs to process per run |

## Error Handling

The scraper tracks three outcomes:

- **saved**: Successfully inserted/updated in Supabase
- **trashed**: Extracted but failed validation (skipped)
- **failed**: Error during scraping or API call

Failed URLs remain in `urls.json` for retry on next run.

## Architecture

```
URL
 ↓
Jina.ai (parse HTML → markdown)
 ↓
OpenAI GPT-4o-mini (extract JSON)
 ↓
┌─ geom found? ─────────────────┐
│  YES → use extracted coords   │
│  NO  → Mapbox geocode address │
└───────────────────────────────┘
 ↓
OpenAI Embeddings (1536-dim vector)
 ↓
Pydantic (validate all fields)
 ↓
Supabase RPC: insert_location() (upsert)
```

1. **Jina.ai**: Converts web pages to clean markdown
2. **OpenAI GPT-4o-mini**: Extracts structured data from markdown
3. **Mapbox Geocoding**: Fallback when coordinates not on page (uses address)
4. **OpenAI Embeddings**: Generates 1536-dim vector for semantic search
5. **Pydantic**: Validates all fields match database schema
6. **Supabase RPC**: Secure upsert via `insert_location()` function

## Geocoding Fallback

Most websites don't display lat/lon coordinates. The scraper handles this with a geocoding fallback:

1. AI attempts to extract coordinates from page content
2. If not found, Mapbox Geocoding API converts the address to coordinates
3. Result: ~90%+ success rate instead of ~20%

**Requirements:**
- Valid `MAPBOX_ACCESS_TOKEN` in `.env`
- Complete street address extracted by AI
- Mapbox free tier: 100,000 requests/month
