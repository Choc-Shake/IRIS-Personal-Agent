/**
 * graph.ts - Cognitive Memory Graph Builder
 * Converts Pinecone memory metadata into a force-directed graph payload.
 */

import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const indexName = 'iris';

// ─── Stop Words ───────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','it','its','as','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'shall','may','might','can','that','this','these','those','than','then',
  'when','where','who','which','how','what','why','i','me','my','you','your',
  'he','she','we','our','they','their','him','her','us','not','no','so',
  'if','about','up','out','just','also','there','here','all','any','both',
  'each','few','more','most','other','some','such','only','own','same',
  'too','very','s','t','re','ll','d','m','ve','ain','got','get','like',
  'said','say','let','well','now','still','even','back','way','take','want',
  'make','use','new','good','first','last','long','little','own','right',
  'big','high','different','small','large','next','early','young','important',
  'public','private','real','best','free','able','because','while','though',
  'since','before','after','during','without','per','off', 'was', 'into',
]);

/**
 * Extract meaningful keywords from a piece of text.
 * Returns a Set of lowercase unique significant tokens.
 */
function extractKeywords(text: string): Set<string> {
  const words = text
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')  // strip punctuation except apostrophe/hyphen
    .split(/\s+/)
    .map(w => w.replace(/['-]/g, '').trim().toLowerCase())
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Count shared keywords between two memory keyword sets.
 */
function sharedKeywordCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const kw of a) {
    if (b.has(kw)) count++;
  }
  return count;
}

export interface GraphNode {
  id: string;
  label: string;
  fullText: string;
  timestamp: string;
  val: number; // node size (number of links)
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'temporal' | 'semantic';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Fetch recent memories from Pinecone and construct a graph.
 * @param limit - max number of memories to include (from MEMORY_VISUALIZER_LIMIT env var)
 */
export async function generateGraphData(limit: number = 100): Promise<GraphData> {
  if (!process.env.PINECONE_API_KEY) {
    console.warn('[GRAPH] No PINECONE_API_KEY. Returning empty graph.');
    return { nodes: [], links: [] };
  }

  try {
    const index = pc.index(indexName);

    // Step 1: List up to `limit` vector IDs
    const listResult = await index.listPaginated({ limit });
    const vectorIds = (listResult.vectors ?? []).map((v: any) => v.id);

    if (vectorIds.length === 0) {
      return { nodes: [], links: [] };
    }

    // Step 2: Fetch metadata for those IDs
    const fetchResult = await index.fetch({ ids: vectorIds });
    const records = Object.values(fetchResult.records ?? {});

    // Step 3: Build nodes
    const nodes: GraphNode[] = records
      .filter(r => r.metadata?.text)
      .map(r => {
        const text = r.metadata!.text as string;
        const ts = r.metadata?.timestamp as string ?? '';
        // Truncate label for display (first 40 chars)
        const label = text.length > 40 ? text.substring(0, 40).trim() + '…' : text;
        return {
          id: r.id,
          label,
          fullText: text,
          timestamp: ts,
          val: 1, // will be updated based on links
        };
      });

    // Step 4: Pre-compute keywords per node
    const keywordMap = new Map<string, Set<string>>();
    for (const node of nodes) {
      keywordMap.set(node.id, extractKeywords(node.fullText));
    }

    // Step 5: Sort nodes by timestamp for temporal threading
    const sortedNodes = [...nodes].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const links: GraphLink[] = [];
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    for (let i = 0; i < sortedNodes.length; i++) {
      const nodeA = sortedNodes[i];
      const kwA = keywordMap.get(nodeA.id)!;
      const timeA = new Date(nodeA.timestamp).getTime();

      for (let j = i + 1; j < sortedNodes.length; j++) {
        const nodeB = sortedNodes[j];
        const timeB = new Date(nodeB.timestamp).getTime();

        // Only compare within a window to avoid O(n^2) at scale
        if (timeB - timeA > TWO_HOURS_MS * 2 && links.length > 20) break;

        const kwB = keywordMap.get(nodeB.id)!;
        const sharedCount = sharedKeywordCount(kwA, kwB);

        // Semantic link: 2+ shared significant keywords
        if (sharedCount >= 2) {
          links.push({ source: nodeA.id, target: nodeB.id, type: 'semantic' });
        }
        // Temporal link: created within 2 hours of each other (and no semantic link)
        else if (Math.abs(timeB - timeA) <= TWO_HOURS_MS) {
          links.push({ source: nodeA.id, target: nodeB.id, type: 'temporal' });
        }
      }
    }

    // Step 6: Update node sizes based on link count (centrality)
    const degreeMap = new Map<string, number>();
    for (const link of links) {
      degreeMap.set(link.source, (degreeMap.get(link.source) ?? 0) + 1);
      degreeMap.set(link.target, (degreeMap.get(link.target) ?? 0) + 1);
    }
    for (const node of nodes) {
      node.val = 1 + (degreeMap.get(node.id) ?? 0);
    }

    console.log(`[GRAPH] Built graph: ${nodes.length} nodes, ${links.length} links`);
    return { nodes, links };

  } catch (err) {
    console.error('[GRAPH] Error generating graph data:', err);
    return { nodes: [], links: [] };
  }
}
