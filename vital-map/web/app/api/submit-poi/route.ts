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
  if (!description?.trim())
    return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
  if (!address?.trim()) return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
  if (!category || !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
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
    return NextResponse.json(
      { error: 'Failed to save location. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, location });
}
