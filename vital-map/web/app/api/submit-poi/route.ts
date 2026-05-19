import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { geocodeWithValidation } from '@/lib/geocoding';
import { rateLimit, clientIp } from '@/lib/rateLimit';

const VALID_CATEGORIES = ['clinical', 'community', 'farm', 'healer', 'event'] as const;

export async function POST(req: NextRequest) {
  if (!process.env.SUBMIT_PASSWORD) {
    console.error('SUBMIT_PASSWORD env var is not set');
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!supabaseUrl || !supabaseAnonKey || !mapboxToken) {
    console.error('Supabase or Mapbox env vars are not set');
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const rl = rateLimit(clientIp(req), 10, 3_600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': rl.retryAfterSec.toString() } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { name, category, description, address, website_url, phone_number, password } = body as {
    name?: string;
    category?: string;
    description?: string;
    address?: string;
    website_url?: string;
    phone_number?: string;
    password?: string;
  };

  // Server-side password re-check (defense in depth)
  const submitted = Buffer.from(String(password ?? ''));
  const expected = Buffer.from(process.env.SUBMIT_PASSWORD ?? '');
  let authorized = false;
  try {
    if (submitted.length === expected.length) {
      authorized = timingSafeEqual(submitted, expected);
    }
  } catch {
    authorized = false;
  }
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!description?.trim())
    return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
  if (!address?.trim()) return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
  if (!category || !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  }

  // Length caps
  if (name.length > 120)
    return NextResponse.json({ error: 'Name must be 120 characters or fewer.' }, { status: 400 });
  if (description.length > 1000)
    return NextResponse.json(
      { error: 'Description must be 1000 characters or fewer.' },
      { status: 400 }
    );
  if (address.length > 200)
    return NextResponse.json(
      { error: 'Address must be 200 characters or fewer.' },
      { status: 400 }
    );
  if (website_url && website_url.length > 500)
    return NextResponse.json(
      { error: 'Website URL must be 500 characters or fewer.' },
      { status: 400 }
    );
  if (phone_number && phone_number.length > 40)
    return NextResponse.json(
      { error: 'Phone number must be 40 characters or fewer.' },
      { status: 400 }
    );
  if (website_url?.trim()) {
    try {
      new URL(website_url.trim());
    } catch {
      return NextResponse.json({ error: 'Website URL is not a valid URL.' }, { status: 400 });
    }
  }

  const geocoded = await geocodeWithValidation(address, mapboxToken);
  if ('error' in geocoded) {
    return NextResponse.json({ error: geocoded.error }, { status: 422 });
  }

  const { coords, normalizedAddress } = geocoded;
  const location = `POINT(${coords[0]} ${coords[1]})`;

  const { error: insertError } = await supabase.from('user_poi').insert({
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
