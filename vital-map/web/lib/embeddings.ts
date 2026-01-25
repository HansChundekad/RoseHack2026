/**
 * Embeddings service
 *
 * Converts text queries to 1536-dimensional vectors for semantic search.
 * Supports both mock embeddings (for testing) and OpenAI embeddings (production).
 */

/**
 * Generate embedding vector from text using OpenAI API
 *
 * @param text - Text to convert to embedding
 * @param apiKey - OpenAI API key
 * @returns 1536-dimensional embedding vector
 */
export async function generateOpenAIEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  if (embedding.length !== 1536) {
    throw new Error(`Invalid embedding dimensions: expected 1536, got ${embedding.length}`);
  }

  return embedding;
}

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
  // Return the same vector used in seed data
  // All locations in test data use this same embedding (array_fill(0.100, 1536))
  return Array(1536).fill(0.100);
}

/**
 * Generate embedding vector from text
 *
 * Automatically chooses between OpenAI and mock embeddings based on
 * environment configuration.
 *
 * @param text - Text to convert to embedding
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (apiKey) {
    // Use real OpenAI embeddings
    console.log('🔮 Generating OpenAI embedding for:', text);
    return await generateOpenAIEmbedding(text, apiKey);
  } else {
    // Use mock embeddings for testing
    console.log('🧪 Using mock embedding (0.100 vector) for:', text);
    console.warn(
      'Add NEXT_PUBLIC_OPENAI_API_KEY to .env to use real embeddings'
    );
    return generateMockEmbedding(text);
  }
}

/**
 * Batch generate embeddings for multiple texts
 *
 * @param texts - Array of texts to convert
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (apiKey) {
    // Use real OpenAI embeddings (batch API)
    console.log(`🔮 Generating ${texts.length} OpenAI embeddings`);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: 'text-embedding-3-small',
        dimensions: 1536,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  } else {
    // Use mock embeddings
    console.log(`🧪 Using mock embeddings for ${texts.length} texts`);
    return texts.map(() => generateMockEmbedding(''));
  }
}
