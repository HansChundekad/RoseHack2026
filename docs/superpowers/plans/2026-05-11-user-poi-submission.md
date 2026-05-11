# User POI Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to submit their own points of interest (name, category, description, address) which get geocoded and stored in a `user_poi` Supabase table, then displayed on the map alongside existing resources.

**Architecture:** A `geocodeWithValidation()` utility in `lib/geocoding.ts` handles address → lat/lng conversion with confidence checks. A server-side API route at `app/api/submit-poi/route.ts` re-geocodes the address and inserts into the `user_poi` table. The `useResources` hook merges `user_poi` rows into the existing resource list. An `AddPoiModal` component provides the submission form.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase JS client (`@supabase/supabase-js`), Mapbox Geocoding API (already used in `lib/geocoding.ts`), Tailwind CSS, shadcn/ui components (Button, Card already used).

---

## Supabase Setup (Manual Step — Run Once)

Before any code tasks, run this SQL in the Supabase dashboard SQL editor for project `izkjkpnozgqcmqgfhixv`:

```sql
create table if not exists user_poi (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null check (category in ('clinical','community','farm','healer','event')),
  description text not null,
  address     text not null,
  location    text not null,  -- "POINT(lng lat)" string, matches Resource.location format
  website_url text,
  phone_number text,
  created_at  timestamptz not null default now()
);

-- Allow anonymous inserts and reads (no auth needed)
alter table user_poi enable row level security;
create policy "anyone can read user_poi"  on user_poi for select using (true);
create policy "anyone can insert user_poi" on user_poi for insert with check (true);
```

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `vital-map/web/lib/geocoding.ts` | Add `geocodeWithValidation()` returning coords + normalizedAddress or error |
| Create | `vital-map/web/app/api/submit-poi/route.ts` | POST handler: validate input, re-geocode, insert to `user_poi` |
| Create | `vital-map/web/components/AddPoiModal.tsx` | Form modal: name, category, description, address, optional fields |
| Modify | `vital-map/web/hooks/useResources.ts` | Fetch `user_poi` in initial load and merge into resource list |
| Modify | `vital-map/web/app/page.tsx` | Add "+" FAB button, `showAddPoi` state, render `<AddPoiModal>` |

---

## Task 1: Add `geocodeWithValidation()` to `lib/geocoding.ts`

**Files:**
- Modify: `vital-map/web/lib/geocoding.ts`

This extends the existing file with a new exported function. The existing `geocodeAddress()` returns `[lng, lat] | null` — the new function returns structured result/error so the UI can give meaningful feedback.

- [ ] **Step 1: Add the return type and function to `lib/geocoding.ts`**

Append to the bottom of `vital-map/web/lib/geocoding.ts`:

```typescript
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
 * Returns normalizedAddress so the UI can show the resolved address to the user.
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd vital-map/web && npx tsc --noEmit
```

Expected: no errors related to `geocoding.ts`.

- [ ] **Step 3: Commit**

```bash
git add vital-map/web/lib/geocoding.ts
git commit -m "feat(geocoding): add geocodeWithValidation with confidence check"
```

---

## Task 2: Create API route `app/api/submit-poi/route.ts`

**Files:**
- Create: `vital-map/web/app/api/submit-poi/route.ts`

Server-side only. Uses the Supabase service role key (from env) to bypass RLS for insert. Re-geocodes on the server so clients cannot spoof coordinates.

- [ ] **Step 1: Create `vital-map/web/app/api/submit-poi/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { geocodeWithValidation } from '@/lib/geocoding';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

const VALID_CATEGORIES = ['clinical', 'community', 'farm', 'healer', 'event'] as const;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { name, category, description, address, website_url, phone_number } = body as {
    name?: string;
    category?: string;
    description?: string;
    address?: string;
    website_url?: string;
    phone_number?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
  if (!address?.trim()) return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
  if (!category || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  }

  const geocoded = await geocodeWithValidation(address, MAPBOX_TOKEN);
  if ('error' in geocoded) {
    return NextResponse.json({ error: geocoded.error }, { status: 422 });
  }

  const { coords, normalizedAddress } = geocoded;
  const location = `POINT(${coords[0]} ${coords[1]})`;

  const { error: insertError } = await supabaseAdmin.from('user_poi').insert({
    name: name.trim(),
    category,
    description: description.trim(),
    address: normalizedAddress,
    location,
    website_url: website_url?.trim() || null,
    phone_number: phone_number?.trim() || null,
  });

  if (insertError) {
    console.error('user_poi insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save location. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, location });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd vital-map/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add vital-map/web/app/api/submit-poi/route.ts
git commit -m "feat(api): add submit-poi route with server-side geocoding and validation"
```

---

## Task 3: Create `AddPoiModal` component

**Files:**
- Create: `vital-map/web/components/AddPoiModal.tsx`

Follows the exact same modal pattern as `ReviewModal.tsx` (already exists). Uses inline styles with CSS variables (`var(--tp-primary)`, `var(--tp-card)`, `var(--tp-muted)`, `var(--tp-text)`) to match the existing design system. No new dependencies needed.

- [ ] **Step 1: Create `vital-map/web/components/AddPoiModal.tsx`**

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { X, MapPin } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { value: 'community', label: 'Community' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'farm', label: 'Farm' },
  { value: 'healer', label: 'Healer' },
  { value: 'event', label: 'Event' },
] as const;

interface AddPoiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddPoiModal({ isOpen, onClose, onSuccess }: AddPoiModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('community');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCategory('community');
    setDescription('');
    setAddress('');
    setWebsiteUrl('');
    setPhoneNumber('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/submit-poi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          description,
          address,
          website_url: websiteUrl || undefined,
          phone_number: phoneNumber || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      setSuccess(true);
      onSuccess?.();
      setTimeout(() => handleClose(), 1500);
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 transition-colors';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <Card
        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--tp-card)' }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: 'var(--tp-primary)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
              Add a Location
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 transition-colors hover:opacity-70"
            aria-label="Close"
          >
            <X className="h-4 w-4" style={{ color: 'var(--tp-muted)' }} />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-3">
            {success ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--tp-primary)' }}>
                Location added! Thank you.
              </p>
            ) : (
              <>
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tp-text)' }}>
                    Name <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Eastside Community Garden"
                    className={inputClass}
                    style={{ borderColor: 'var(--tp-muted)', color: 'var(--tp-text)', backgroundColor: 'var(--tp-light)' }}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tp-text)' }}>
                    Category <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                    style={{ borderColor: 'var(--tp-muted)', color: 'var(--tp-text)', backgroundColor: 'var(--tp-light)' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tp-text)' }}>
                    Description <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="What does this place offer?"
                    className={`${inputClass} resize-none`}
                    style={{ borderColor: 'var(--tp-muted)', color: 'var(--tp-text)', backgroundColor: 'var(--tp-light)' }}
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tp-text)' }}>
                    Address <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="e.g. 123 Main St, Los Angeles, CA"
                    className={inputClass}
                    style={{ borderColor: 'var(--tp-muted)', color: 'var(--tp-text)', backgroundColor: 'var(--tp-light)' }}
                  />
                </div>

                {/* Website (optional) */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tp-text)' }}>
                    Website <span className="text-xs font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                    style={{ borderColor: 'var(--tp-muted)', color: 'var(--tp-text)', backgroundColor: 'var(--tp-light)' }}
                  />
                </div>

                {/* Phone (optional) */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--tp-text)' }}>
                    Phone <span className="text-xs font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 000-0000"
                    className={inputClass}
                    style={{ borderColor: 'var(--tp-muted)', color: 'var(--tp-text)', backgroundColor: 'var(--tp-light)' }}
                  />
                </div>

                {error && (
                  <p className="text-xs rounded-md px-3 py-2 bg-red-50 text-red-600 border border-red-200">
                    {error}
                  </p>
                )}
              </>
            )}
          </CardContent>

          {!success && (
            <CardFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={handleClose}
                disabled={isSubmitting}
                style={{ color: 'var(--tp-muted)' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 text-white"
                disabled={isSubmitting}
                style={{ backgroundColor: 'var(--tp-primary)' }}
              >
                {isSubmitting ? 'Checking address…' : 'Add Location'}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd vital-map/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add vital-map/web/components/AddPoiModal.tsx
git commit -m "feat(ui): add AddPoiModal form component"
```

---

## Task 4: Merge `user_poi` into `useResources`

**Files:**
- Modify: `vital-map/web/hooks/useResources.ts`

Fetch `user_poi` rows alongside `get_all_locations()` and merge them. User POIs need a numeric `id` — use a hash of the uuid to avoid collisions with DB bigint ids (use negative numbers to guarantee no overlap).

- [ ] **Step 1: Add `user_poi` fetch inside `loadResources` in `useResources.ts`**

In `vital-map/web/hooks/useResources.ts`, find the `loadResources` function. Replace the block from `const dbLocations = (data || []) as Resource[];` through `setResources(allLocations);` with:

```typescript
const dbLocations = (data || []) as Resource[];

// Fetch user-submitted POIs
const { data: userPoiData } = await supabase
  .from('user_poi')
  .select('id, name, category, description, address, location, website_url, phone_number, created_at')
  .order('created_at', { ascending: false });

const userPois: Resource[] = ((userPoiData as Array<{
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  location: string;
  website_url: string | null;
  phone_number: string | null;
  created_at: string;
}>) || []).map((poi, idx) => ({
  id: -(idx + 1),  // negative IDs to avoid collision with DB bigint IDs
  name: poi.name,
  category: poi.category,
  description: poi.description,
  address: poi.address,
  location: poi.location,
  website_url: poi.website_url ?? undefined,
  phone_number: poi.phone_number ?? undefined,
  created_at: poi.created_at,
}));

const hardcodedHospitals = hospitalsData as Resource[];
const allLocations = [...dbLocations, ...userPois, ...hardcodedHospitals];
setResources(allLocations);
console.log(`✅ Loaded ${dbLocations.length} DB + ${userPois.length} user POIs + ${hardcodedHospitals.length} hospitals`);
```

- [ ] **Step 2: Export a `refetchUserPoi` trigger from the hook**

In `useResources.ts`, add a `refetchTrigger` state at the top of the hook (alongside other `useState` calls):

```typescript
const [refetchTrigger, setRefetchTrigger] = useState(0);
```

Then in the `useEffect` dependency array, change `[]` to `[refetchTrigger]`:

```typescript
useEffect(() => {
  loadResources();
}, [refetchTrigger]);
```

Then update the existing `refetch` callback:

```typescript
const refetch = useCallback(async () => {
  setRefetchTrigger((n) => n + 1);
}, []);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd vital-map/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add vital-map/web/hooks/useResources.ts
git commit -m "feat(data): merge user_poi rows into resource list on load"
```

---

## Task 5: Wire `AddPoiModal` into `page.tsx`

**Files:**
- Modify: `vital-map/web/app/page.tsx`

Add a floating action button (FAB) `+` that opens `AddPoiModal`. On success, call `refetch()` so the new POI appears immediately.

- [ ] **Step 1: Import `AddPoiModal` in `page.tsx`**

Add to the import block in `vital-map/web/app/page.tsx` (after the existing component imports):

```typescript
import { AddPoiModal } from '@/components/AddPoiModal';
```

- [ ] **Step 2: Add `showAddPoi` state inside the `Home` component**

Add after the existing `useState` declarations (around line 36):

```typescript
const [showAddPoi, setShowAddPoi] = useState(false);
```

- [ ] **Step 3: Add the FAB button and modal to the JSX**

In `page.tsx`, find the closing `</main>` tag (just before `</div>` at the end of the return). Insert before `</main>`:

```tsx
{/* Floating Add POI button */}
<button
  onClick={() => setShowAddPoi(true)}
  className="fixed bottom-6 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg text-white text-2xl font-light transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
  style={{ backgroundColor: 'var(--tp-primary)' }}
  aria-label="Add a location"
>
  +
</button>

<AddPoiModal
  isOpen={showAddPoi}
  onClose={() => setShowAddPoi(false)}
  onSuccess={() => { refetch(); }}
/>
```

- [ ] **Step 4: Make sure `refetch` is destructured from `useResources`**

In `page.tsx`, find the destructuring of `useResources()`. It currently reads:

```typescript
const {
  resources,
  loading,
  error,
  semanticSearch,
  matchLocations,
  getHappeningNow,
} = useResources();
```

Add `refetch`:

```typescript
const {
  resources,
  loading,
  error,
  refetch,
  semanticSearch,
  matchLocations,
  getHappeningNow,
} = useResources();
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd vital-map/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add vital-map/web/app/page.tsx
git commit -m "feat(ui): add floating button and AddPoiModal to main page"
```

---

## Task 6: Manual QA Checklist

With the dev server running (`npm run dev` in `vital-map/web`):

- [ ] Click `+` button — modal opens
- [ ] Submit with empty name — shows browser/HTML5 required validation
- [ ] Submit with a nonsense address (e.g. "asdflkjhqwer 99999") — error message appears: "Address not found…"
- [ ] Submit a valid address (e.g. "Grand Central Market, Los Angeles, CA") with name, category, description — success message appears, modal closes
- [ ] Wait 2 seconds — new card appears in the list and pin appears on map
- [ ] Reload page — new POI still appears (persisted in Supabase)
- [ ] Verify on mobile (http://10.13.14.1:3000) — modal is scrollable, no zoom on input focus
