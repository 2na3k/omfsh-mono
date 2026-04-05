import type { ToolDef } from "@2na3k/omfsh-provider";

interface WebReadInput {
  url: string;
}

interface WebReadOutput {
  title: string;
  content: string;
  url: string;
}

export const web_read: ToolDef<WebReadInput, WebReadOutput> = {
  description: "Fetch a URL and extract its readable text content. Use this to read full articles from URLs found via web_search.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to fetch and extract content from" },
    },
    required: ["url"],
  },
  async execute(input: WebReadInput): Promise<WebReadOutput> {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Fisherman/1.0)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return { title: "Error", content: `Failed to fetch: HTTP ${res.status}`, url: input.url };
    }

    const html = await res.text();

    const { parseHTML } = await import("linkedom");
    const { Readability } = await import("@mozilla/readability");

    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();

    const title = article?.title ?? new URL(input.url).hostname;
    // cap content to avoid flooding context
    const content = (article?.textContent ?? html.slice(0, 5000)).slice(0, 8000);

    return { title, content, url: input.url };
  },
};
