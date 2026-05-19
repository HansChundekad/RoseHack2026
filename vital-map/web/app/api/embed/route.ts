import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, clientIp } from '@/lib/rateLimit';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

async function fetchEmbeddings(inputs: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: inputs, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIM }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI error: ${err.error?.message ?? 'unknown'}`);
  }

  const data = await response.json();
  return (data.data as Array<{ embedding: number[] }>).map((d) => d.embedding);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
  }

  const rl = rateLimit(clientIp(req), 30, 60_000);
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

  const isBatch = Array.isArray(body.texts);
  const inputs: string[] = isBatch
    ? (body.texts as string[])
    : typeof body.text === 'string'
      ? [body.text]
      : [];

  if (inputs.length === 0) {
    return NextResponse.json({ error: 'Provide "text" or "texts".' }, { status: 400 });
  }

  let embeddings: number[][];
  try {
    embeddings = await fetchEmbeddings(inputs, apiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Validate dimensions
  for (const emb of embeddings) {
    if (emb.length !== EMBEDDING_DIM) {
      return NextResponse.json(
        { error: `Embedding shape mismatch: expected ${EMBEDDING_DIM}, got ${emb.length}` },
        { status: 502 }
      );
    }
  }

  if (isBatch) {
    return NextResponse.json({ embeddings });
  }
  return NextResponse.json({ embedding: embeddings[0] });
}
