import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!process.env.SUBMIT_PASSWORD) {
    console.error('SUBMIT_PASSWORD env var is not set');
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const rl = rateLimit(clientIp(req), 5, 60_000);
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
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const submitted = String(body.password ?? '');
  const expected = process.env.SUBMIT_PASSWORD ?? '';

  let match = false;
  try {
    const a = Buffer.from(submitted);
    const b = Buffer.from(expected);
    // timingSafeEqual requires same-length buffers
    if (a.length === b.length) {
      match = timingSafeEqual(a, b);
    }
  } catch {
    match = false;
  }

  if (!match) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
