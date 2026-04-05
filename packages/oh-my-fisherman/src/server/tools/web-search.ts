import type { ToolDef } from "@2na3k/omfsh-provider";

interface WebSearchInput {
  query: string;
  maxResults?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchTavily(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: false,
    }),
  });

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const data = await res.json() as { results: Array<{ title: string; url: string; content: string }> };

  return data.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 300),
  }));
}

async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  // DuckDuckGo instant answer API (limited but free, no key needed)
  const encoded = encodeURIComponent(query);
  const res = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1`);
  if (!res.ok) return [];

  const data = await res.json() as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const results: SearchResult[] = [];

  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading ?? "DuckDuckGo Result",
      url: data.AbstractURL,
      snippet: data.AbstractText.slice(0, 300),
    });
  }

  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.slice(0, 80),
          url: topic.FirstURL,
          snippet: topic.Text.slice(0, 300),
        });
      }
    }
  }

  return results.slice(0, maxResults);
}

export const web_search: ToolDef<WebSearchInput, SearchResult[]> = {
  description: "Search the web for information. Returns titles, URLs, and snippets. Use specific queries for best results.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query" },
      maxResults: { type: "number", description: "Max results to return (default: 5)" },
    },
    required: ["query"],
  },
  async execute(input: WebSearchInput): Promise<SearchResult[]> {
    const max = input.maxResults ?? 5;
    try {
      return await searchTavily(input.query, max);
    } catch {
      // fallback to DuckDuckGo
      return searchDuckDuckGo(input.query, max);
    }
  },
};
