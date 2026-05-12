import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export async function POST(req: NextRequest) {
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
