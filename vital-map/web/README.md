# Holistic Interoperability Engine - Frontend

A high-performance GIS interface that aggregates disparate healthcare and community wellness data streams into a single, actionable map for clinicians and patients.

## Features

- **Semantic Mapping**: Vector embeddings connect search intent to both clinical and community resources
- **Temporal Synchronization**: Real-time sync for "happening now" events
- **Decentralized Trust**: Community trust scores for alternative healers and local farms
- **Spatial Search**: PostGIS-powered location queries within map bounds
- **Interactive Map**: Mapbox GL JS with custom markers and fly-to navigation

## Tech Stack

- **Next.js 16** (App Router)
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Mapbox GL JS** for mapping
- **Supabase** for backend (PostGIS + pgvector)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase project with PostGIS and pgvector extensions
- Mapbox access token

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Configure environment variables in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
vital-map/web/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles + Mapbox CSS
├── components/
│   ├── Header.tsx          # Top navigation with search and tabs
│   ├── SearchBar.tsx       # Semantic search input
│   ├── ResourceCard.tsx    # Individual resource card
│   ├── ResourceList.tsx    # Scrollable resource sidebar
│   ├── MapView.tsx          # Mapbox GL JS map container
│   ├── MapMarker.tsx       # Custom HTML markers
│   ├── TrustScoreBadge.tsx # Community trust score display
│   ├── EventIndicator.tsx  # "Happening now" event badge
│   └── LoadingSkeleton.tsx # Loading state UI
├── hooks/
│   ├── useResources.ts     # Resource state and search functions
│   └── useTemporalSync.ts  # Temporal event synchronization
├── lib/
│   ├── supabase.ts         # Supabase client configuration
│   ├── postgis.ts          # PostGIS geometry parsing utilities
│   └── vectorSearch.ts     # Vector embedding utilities (stub)
└── types/
    └── resource.ts         # TypeScript interfaces
```

## Backend Integration

The frontend is designed to work with Supabase RPC functions. The following functions need to be implemented in your Supabase backend:

### Required RPC Functions

1. **`match_locations(min_lng, min_lat, max_lng, max_lat)`**
   - Spatial query to find resources within a bounding box
   - Should use PostGIS `ST_Within` or similar spatial functions
   - Returns array of `Resource` objects

2. **`semantic_search(query_vector, limit?)`**
   - Vector similarity search using pgvector
   - Takes a vector embedding array and returns similar resources
   - Should use `<=>` operator for cosine similarity or `<->` for L2 distance
   - Returns array of `Resource` objects ordered by similarity

3. **`get_happening_now_events()`**
   - Temporal query for resources with active events
   - Filters where current time is between `event_start` and `event_end`
   - Returns array of `Resource` objects

### Database Schema

The `resources` table should have the following structure:

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  location GEOMETRY(Point, 4326), -- PostGIS Point
  semantic_vector vector(1536),    -- pgvector (adjust dimension as needed)
  trust_score INTEGER CHECK (trust_score >= 0 AND trust_score <= 100),
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_resources_location ON resources USING GIST (location);

-- Create vector index
CREATE INDEX idx_resources_semantic ON resources USING ivfflat (semantic_vector vector_cosine_ops);
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox access token | Yes |

## Development Notes

### Stub Functions

Several functions are stubbed and ready for backend integration:

- `textToVector()` in `lib/vectorSearch.ts` - Needs embedding API integration
- RPC calls in `hooks/useResources.ts` - Ready for Supabase functions
- Temporal sync in `hooks/useTemporalSync.ts` - Can be extended with polling/subscriptions

### Customization

- **Header Height**: Adjust `HEADER_HEIGHT` constant in `app/page.tsx` if header size changes
- **Map Style**: Change Mapbox style in `components/MapView.tsx` (currently `streets-v12`)
- **Marker Colors**: Update `categoryColors` in `components/MapMarker.tsx` and `ResourceCard.tsx`
- **Vector Dimension**: Update dimension in `lib/vectorSearch.ts` to match your pgvector column

## Building for Production

```bash
npm run build
npm start
```

## License

MIT
