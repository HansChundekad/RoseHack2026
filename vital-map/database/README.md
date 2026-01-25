# Database Setup & Deployment

## Applying Database Functions to Supabase

### Method 1: Supabase SQL Editor (Recommended)

1. Open the Supabase SQL Editor:
   https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql

2. Click "New Query"

3. Copy and paste the contents of:
   - `functions/get_all_locations.sql`

4. Click "Run" or press Cmd/Ctrl + Enter

5. Verify the function was created successfully

### Method 2: Using Supabase CLI

```bash
# From the vital-map directory
supabase db push
```

## Database Functions

### get_all_locations()

Returns all locations with PostGIS geometry converted to WKT text format.

**Returns:**
- `id`: bigint - Location ID
- `name`: text - Location name
- `category`: text - Resource category
- `description`: text - Description
- `website_url`: text - Optional website
- `location`: text - PostGIS point as "POINT(lng lat)"
- `embedding`: vector(1536) - Semantic embedding
- `created_at`: timestamptz - Creation timestamp

**Example usage:**
```sql
SELECT * FROM get_all_locations();
```

**JavaScript/TypeScript usage:**
```typescript
const { data, error } = await supabase.rpc('get_all_locations');
```

## Seed Data

To populate the database with sample data:

1. Open Supabase SQL Editor
2. Copy contents from `seeds/001_mock_data.sql`
3. Run the SQL to insert sample LA locations

## Migrations

Migrations are in `migrations/` directory:
- `001_initial_schema.sql` - Creates tables and indexes
- `002_enable_rls.sql` - Enables Row Level Security

To apply migrations manually, run them in order in the Supabase SQL Editor.
