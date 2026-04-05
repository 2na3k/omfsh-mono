import type { ToolDef } from "@2na3k/omfsh-provider";
import { loadSourceChunks } from "../services/source-ingest.js";

interface SourceSearchInput {
  query: string;
}

interface SourceSearchResult {
  sourceId: string;
  relevance: number;
  excerpt: string;
}

// simple keyword search — scored by term frequency
function scoreChunk(chunk: string, terms: string[]): number {
  const lower = chunk.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const regex = new RegExp(term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = lower.match(regex);
    if (matches) score += matches.length;
  }
  return score;
}

// stored per-notebook, populated on demand
const chunkCache = new Map<string, Array<{ sourceId: string; chunk: string }>>();

export function buildSourceSearchTool(notebookId: string): ToolDef<SourceSearchInput, SourceSearchResult[]> {
  return {
    description: "Search across the user's uploaded sources (PDFs, web pages, documents). Returns relevant excerpts.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query to find relevant information in sources" },
      },
      required: ["query"],
    },
    execute(input: SourceSearchInput): SourceSearchResult[] {
      // reload chunks each time to pick up newly ingested sources
      const chunks = loadSourceChunks(notebookId);
      chunkCache.set(notebookId, chunks);

      const terms = input.query.split(/\s+/).filter((t) => t.length > 2);
      if (terms.length === 0) return [];

      const scored = chunks
        .map((c) => ({
          sourceId: c.sourceId,
          relevance: scoreChunk(c.chunk, terms),
          excerpt: c.chunk.slice(0, 500),
        }))
        .filter((r) => r.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10);

      return scored;
    },
  };
}

export function invalidateCache(notebookId: string) {
  chunkCache.delete(notebookId);
}
