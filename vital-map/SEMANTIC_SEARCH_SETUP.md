# Semantic Search Setup Guide

Your semantic search is now integrated! Here's how it works and how to upgrade to real embeddings.

## 🎯 Current Status

✅ **Semantic search is working with MOCK embeddings**

When you search in the second search box (Search for resources), it:
1. Converts your text query to a 1536-dimensional vector
2. Calls `semantic_search()` RPC function in Supabase
3. Returns results ranked by semantic similarity

Currently using **mock embeddings** (all vectors = `0.100`) for testing.

---

## 🧪 Testing Right Now (Mock Embeddings)

### What Works:
- Search box accepts any text query
- Converts to mock embedding vector automatically
- Returns all 8 resources from database (since all have the same mock embedding)
- All results will have `similarity_score ≈ 0.0` (exact matches)

### Try It:
1. Open the app in browser
2. Type anything in the "Search for resources" box (e.g., "respiratory health")
3. Click **Search**
4. Check browser console - you'll see:
   ```
   🧪 Using mock embedding (0.100 vector) for: respiratory health
   ✅ Semantic search returned 8 results
   ```

---

## 🚀 Upgrading to Real Embeddings (OpenAI)

To get actual semantic search with meaningful results:

### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-proj-...`)

### Step 2: Add to Environment

Add to `/Users/Shared/RoseHack2026/.env`:

```bash
# OpenAI API (for semantic search embeddings)
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-your-key-here
```

**Note:** Prefix must be `NEXT_PUBLIC_` because it's used in the browser.

### Step 3: Restart Dev Server

```bash
cd vital-map/web
npm run dev
```

### Step 4: Test Real Embeddings

Now when you search, you'll see:
```
🔮 Generating OpenAI embedding for: respiratory health
✅ Semantic search returned X results
```

Results will be ranked by actual semantic similarity!

---

## 💰 Cost Estimate

**OpenAI Embeddings Pricing:**
- Model: `text-embedding-3-small`
- Cost: $0.02 per 1 million tokens (~3,000 pages)
- Per search: ~$0.00002 (2¢ per 1,000 searches)

**Very affordable** for testing and small-scale use.

---

## 🔧 How It Works

### Frontend Flow:
```
User types "respiratory health"
  ↓
generateEmbedding("respiratory health")
  ↓
[0.123, -0.456, 0.789, ...] (1536 numbers)
  ↓
semanticSearch(embedding)
  ↓
Supabase RPC: semantic_search(vector, threshold, limit)
  ↓
PostgreSQL: SELECT ... ORDER BY embedding <=> query_vector
  ↓
Results with similarity_score
```

### Code Location:
- **Embedding service**: `web/lib/embeddings.ts`
- **Search handler**: `web/app/page.tsx` (line 54-91)
- **Search component**: `web/components/SearchBar.tsx`
- **RPC function**: `database/functions/semantic_search.sql`

---

## 🐛 Troubleshooting

### "Mock embedding" message won't go away
- Check: `NEXT_PUBLIC_OPENAI_API_KEY` is in `.env`
- Check: Dev server was restarted after adding key
- Check: Key starts with `sk-proj-` or `sk-`

### "OpenAI API error: Incorrect API key"
- Verify key is correct
- Check key has credits/billing enabled at platform.openai.com

### Search returns no results
- Check browser console for errors
- Verify `semantic_search()` function is deployed to Supabase
- Try increasing `similarity_threshold` in `useResources.ts`

### Search is slow
- OpenAI API typically responds in 100-300ms
- Check network tab for API call timing
- First call may be slower due to cold start

---

## 🎨 Future Enhancements

### 1. Show Similarity Scores in UI

Display how relevant each result is:

```tsx
// In ResourceCard.tsx
{resource.similarity_score !== undefined && (
  <span className="text-xs text-gray-500">
    {(100 - (resource.similarity_score / 2 * 100)).toFixed(0)}% match
  </span>
)}
```

### 2. Hybrid Search Integration

Combine location + semantic search for "nearby relevant results":

```typescript
// In page.tsx
const handleHybridSearch = async (query: string) => {
  if (startingLocation && query.trim()) {
    const embedding = await generateEmbedding(query);
    await hybridSearch(
      embedding,
      startingLocation[0], // lng
      startingLocation[1], // lat
      50000 // 50km radius
    );
  }
};
```

### 3. Search Suggestions

Show similar searches as user types:

```typescript
const suggestions = [
  "respiratory health services",
  "mental health support",
  "community gardens",
  "air quality monitoring",
];
```

### 4. Update Database Embeddings

Replace mock embeddings with real ones:

```typescript
// Script to re-embed all locations
import { generateEmbeddingsBatch } from './lib/embeddings';

const locations = await supabase.from('locations').select('id, description');
const descriptions = locations.data.map(l => l.description);
const embeddings = await generateEmbeddingsBatch(descriptions);

// Update each location
for (let i = 0; i < locations.data.length; i++) {
  await supabase
    .from('locations')
    .update({ embedding: embeddings[i] })
    .eq('id', locations.data[i].id);
}
```

---

## 📊 Current Search Behavior

| Search Box | Type | Function Used | What It Does |
|------------|------|---------------|--------------|
| **Top** (Starting Location) | Geographic | `matchLocations()` | Moves map, loads nearby resources |
| **Second** (Search for resources) | Semantic | `semanticSearch()` | Finds similar resources by meaning |

Both work independently right now. Future: combine them with `hybridSearch()`!

---

## ✅ Quick Test Checklist

- [ ] Search box accepts text input
- [ ] Clicking "Search" triggers search
- [ ] Browser console shows embedding generation message
- [ ] Results appear in left sidebar
- [ ] No errors in console
- [ ] With mock embeddings: all 8 results returned
- [ ] With real embeddings: results ranked by relevance

---

## 📝 Next Steps

1. **Test with mock embeddings** (works right now!)
2. **Get OpenAI API key** (when ready for real search)
3. **Update database embeddings** (replace mock with real)
4. **Add hybrid search** (combine location + semantic)
5. **Show similarity scores** (help users understand relevance)

Your semantic search infrastructure is ready! 🎉
