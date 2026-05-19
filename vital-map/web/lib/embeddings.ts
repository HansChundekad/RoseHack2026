/**
 * Embeddings service
 *
 * Converts text queries to 1536-dimensional vectors for semantic search.
 * On the server with no OPENAI_API_KEY, falls back to mock embeddings.
 * On the client, always proxies through /api/embed — errors surface to the caller.
 */

/**
 * Generate mock embedding vector for testing
 *
 * Returns the same vector used in seed data (all values = 0.100).
 * This allows testing semantic search infrastructure before setting up
 * a real embedding service.
 *
 * @param _text - Text query (ignored in mock)
 * @returns 1536-dimensional mock embedding vector
 */
export function generateMockEmbedding(_text: string): number[] {
  return Array(1536).fill(0.100);
}

/**
 * Generate embedding vector from text
 *
 * On the server without OPENAI_API_KEY, returns a mock embedding.
 * On the client (or server with key), proxies through /api/embed.
 *
 * @param text - Text to convert to embedding
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (typeof window === 'undefined' && !process.env.OPENAI_API_KEY) {
    return generateMockEmbedding(text);
  }

  const response = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? `Embedding request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding as number[];
}

/**
 * Batch generate embeddings for multiple texts
 *
 * On the server without OPENAI_API_KEY, returns mock embeddings.
 * On the client (or server with key), proxies through /api/embed.
 *
 * @param texts - Array of texts to convert
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (typeof window === 'undefined' && !process.env.OPENAI_API_KEY) {
    return texts.map(() => generateMockEmbedding(''));
  }

  const response = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error ?? `Embedding batch request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings as number[][];
}
