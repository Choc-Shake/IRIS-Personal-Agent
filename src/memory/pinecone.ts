import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

let pc: Pinecone | null = null;
function getPineconeClient() {
  if (pc) return pc;
  if (!process.env.PINECONE_API_KEY) return null;
  pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return pc;
}

const indexName = 'iris';

// We use Ollama for embeddings too
const openai = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      input: text,
    });
    return response.data[0].embedding;
  } catch (e: any) {
    if (e.message?.includes('fetch failed') || e.code === 'ECONNREFUSED') {
      console.warn('[Embedding] Local embedding service (Ollama) is offline or unreachable. Skipping semantic memory lookup/save.');
    } else {
      console.error('[Embedding] Error getting embedding:', e.message);
    }
    return [];
  }
}

export async function upsertSemanticMemory(text: string, metadata: any = {}) {
  const client = getPineconeClient();
  if (!client) return;
  if (!process.env.PINECONE_API_KEY) return;
  if (!text || text.trim() === '') return;
  
  try {
    const index = client.index(indexName);
    const embedding = await getEmbedding(text);
    
    if (!embedding || embedding.length === 0) {
      console.error('Pinecone upsert skipped: Embedding is empty. Did Ollama return a valid embedding?');
      return;
    }

    // --- SEMANTIC DEDUPLICATION PHASE ---
    try {
      const dupCheck = await index.query({
        vector: embedding,
        topK: 1,
        includeMetadata: true
      });
      // A score of > 0.88 means it's fundamentally the exact same semantic fact
      if (dupCheck.matches && dupCheck.matches.length > 0) {
        const topMatch = dupCheck.matches[0];
        if (topMatch.score && topMatch.score > 0.88) {
          console.log(`[PINECONE DEDUPLICATION] Skipped saving exact duplicate memory (Score: ${topMatch.score.toFixed(3)}). Fact: "${text}" matched existing: "${topMatch.metadata?.text}"`);
          return;
        }
      }
    } catch (dupErr) {
      console.warn('Pinecone deduplication check failed, proceeding to insert anyway:', dupErr);
    }
    // ------------------------------------

    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await index.upsert({
      records: [
        {
          id,
          values: embedding,
          metadata: { text, timestamp: new Date().toISOString(), ...metadata }
        }
      ]
    });
    console.log(`[PINECONE] Saved new long-term semantic memory: "${text}"`);
  } catch (e) {
    console.error('Pinecone upsert error (ensure index exists):', e);
  }
}

export async function searchSemanticMemory(query: string, topK: number = 3): Promise<string[]> {
  const client = getPineconeClient();
  if (!client) return [];
  if (!process.env.PINECONE_API_KEY) return [];
  try {
    const index = client.index(indexName);
    const queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return [];
    }
    
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });
    
    return results.matches.map(m => m.metadata?.text).filter(Boolean) as string[];
  } catch (e) {
    console.error('Pinecone search error:', e);
    return [];
  }
}

export async function wipeSemanticMemory(): Promise<boolean> {
  const client = getPineconeClient();
  if (!client) return false;
  if (!process.env.PINECONE_API_KEY) return false;
  try {
    const index = client.index(indexName);
    await index.deleteAll();
    return true;
  } catch (e) {
    console.error('Pinecone wipe error:', e);
    return false;
  }
}
