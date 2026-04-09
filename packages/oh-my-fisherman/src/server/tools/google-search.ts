import type { ToolDef } from "@2na3k/omfsh-provider";
import { parseHTML } from "linkedom";

interface GoogleSearchInput {
  query: string;
  maxResults?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Mimic a real Chrome browser to avoid bot detection
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function extractResults(html: string, maxResults: number): SearchResult[] {
  const { document } = parseHTML(html);
  const results: SearchResult[] = [];

  // Google wraps each organic result in a div with data-hveid (stable across class renames)
  // We walk all <h3> inside <a> tags — each one is a result title
  const anchors = document.querySelectorAll("a:has(h3)");

  for (const anchor of anchors) {
    if (results.length >= maxResults) break;

    const href = anchor.getAttribute("href") ?? "";
    // Skip internal Google links
    if (!href.startsWith("http") || href.includes("google.com/")) continue;

    const title = anchor.querySelector("h3")?.textContent?.trim() ?? "";
    if (!title) continue;

    // Snippet: look for the closest sibling/cousin div with descriptive text
    // Google places snippets in a div that's a sibling of the <a>'s parent or nearby
    let snippet = "";
    let node: Element | null = anchor.closest("div[data-hveid], div.g, div[jscontroller]");
    if (node) {
      // Grab all text nodes excluding the title itself
      const texts: string[] = [];
      node.querySelectorAll("span, div").forEach((el) => {
        const text = el.textContent?.trim() ?? "";
        if (text.length > 40 && !title.includes(text) && !text.includes(title)) {
          texts.push(text);
        }
      });
      snippet = texts[0]?.slice(0, 300) ?? "";
    }

    results.push({ title, url: href, snippet });
  }

  return results;
}

export async function scrapeGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
  const url =
    `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults + 2}&hl=en&gl=us`;

  console.log(`[google_search] fetching: ${url}`);

  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Google returned HTTP ${res.status}`);
  }

  const html = await res.text();

  if (html.includes("detected unusual traffic") || html.includes("/sorry/")) {
    throw new Error("Google CAPTCHA triggered — try again later or reduce request frequency");
  }

  const results = extractResults(html, maxResults);
  console.log(`[google_search] extracted ${results.length} results`);
  return results;
}

export const google_search: ToolDef<GoogleSearchInput, SearchResult[]> = {
  description:
    "Search Google directly (headless scrape). Returns organic result titles, URLs, and snippets. Prefer this for broad web searches.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query" },
      maxResults: { type: "number", description: "Max results to return (default: 8)" },
    },
    required: ["query"],
  },
  async execute(input: GoogleSearchInput): Promise<SearchResult[]> {
    return scrapeGoogle(input.query, input.maxResults ?? 8);
  },
};
