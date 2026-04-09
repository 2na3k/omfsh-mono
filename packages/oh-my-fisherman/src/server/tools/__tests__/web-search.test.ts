import { describe, it, expect, mock, beforeEach } from "bun:test";

// --- mocks must be declared before imports that use them ---

const mockFetch = mock(async (_url: string, _opts?: unknown): Promise<Response> => {
  throw new Error("fetch not configured");
});

mock.module("node:fetch", () => ({ default: mockFetch }));

// Patch global fetch used by the tool (Bun exposes it as a global)
(globalThis as Record<string, unknown>).fetch = mockFetch;

// Mock linkedom so tests don't need a real DOM engine
mock.module("linkedom", () => ({
  parseHTML: (html: string) => {
    // Minimal DOM stub that parseHTML callers get
    const anchors: Array<{ href: string; h3Text: string; snippetText: string }> =
      (globalThis as Record<string, unknown>).__linkedomAnchors as typeof anchors ?? [];

    return {
      document: {
        querySelectorAll: (selector: string) => {
          if (selector === "a:has(h3)") {
            return anchors.map(({ href, h3Text, snippetText }) => ({
              getAttribute: (attr: string) => (attr === "href" ? href : null),
              querySelector: (sel: string) =>
                sel === "h3" ? { textContent: h3Text } : null,
              closest: () => ({
                querySelectorAll: () => [{ textContent: snippetText }],
              }),
            }));
          }
          return [];
        },
      },
    };
  },
}));

import { scrapeGoogle } from "../google-search.js";
import { web_search } from "../web-search.js";

// Helper: make a minimal Response-like object
function makeResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response;
}

// Helper: set the linkedom anchors fixture
function setAnchors(
  anchors: Array<{ href: string; h3Text: string; snippetText: string }>,
) {
  (globalThis as Record<string, unknown>).__linkedomAnchors = anchors;
}

// --- google-search ---

describe("scrapeGoogle", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setAnchors([]);
  });

  it("returns parsed results from Google HTML", async () => {
    setAnchors([
      { href: "https://example.com/a", h3Text: "Example A", snippetText: "This is a snippet about example A content here" },
      { href: "https://example.com/b", h3Text: "Example B", snippetText: "This is a snippet about example B content here" },
    ]);
    mockFetch.mockResolvedValueOnce(makeResponse("<html>fake google html</html>"));

    const results = await scrapeGoogle("test query", 5);

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Example A");
    expect(results[0].url).toBe("https://example.com/a");
    expect(results[0].snippet).toContain("snippet about example A");
  });

  it("respects maxResults", async () => {
    setAnchors([
      { href: "https://a.com", h3Text: "A", snippetText: "long enough snippet text here to pass filter" },
      { href: "https://b.com", h3Text: "B", snippetText: "long enough snippet text here to pass filter" },
      { href: "https://c.com", h3Text: "C", snippetText: "long enough snippet text here to pass filter" },
    ]);
    mockFetch.mockResolvedValueOnce(makeResponse("<html></html>"));

    const results = await scrapeGoogle("query", 2);
    expect(results).toHaveLength(2);
  });

  it("throws on non-ok HTTP status", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("", 429));
    await expect(scrapeGoogle("query", 5)).rejects.toThrow("Google returned HTTP 429");
  });

  it("throws on CAPTCHA page", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("<html>detected unusual traffic from your computer</html>"));
    await expect(scrapeGoogle("query", 5)).rejects.toThrow("Google CAPTCHA triggered");
  });

  it("throws on /sorry/ redirect body", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse("<html>/sorry/index?continue=</html>"));
    await expect(scrapeGoogle("query", 5)).rejects.toThrow("Google CAPTCHA triggered");
  });
});

// --- web_search fallback chain ---

describe("web_search fallback chain", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setAnchors([]);
    // Suppress TAVILY_API_KEY env var so Tavily always throws "not set"
    delete process.env.TAVILY_API_KEY;
  });

  it("falls back to Google scrape when Tavily key is missing", async () => {
    setAnchors([
      { href: "https://result.com", h3Text: "Result", snippetText: "snippet long enough to be included here" },
    ]);
    mockFetch.mockResolvedValueOnce(makeResponse("<html>google</html>"));

    const results = await web_search.execute({ query: "test" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].url).toBe("https://result.com");
  });

  it("falls back to DuckDuckGo when both Tavily and Google fail", async () => {
    // Google fetch fails
    mockFetch.mockRejectedValueOnce(new Error("network error"));

    // DDG fetch succeeds with an AbstractText result
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        JSON.stringify({
          Heading: "DDG Result",
          AbstractText: "Some abstract from DDG about the topic",
          AbstractURL: "https://ddg-result.com",
          RelatedTopics: [],
        }),
      ),
    );

    const results = await web_search.execute({ query: "test" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].url).toBe("https://ddg-result.com");
  });
});
