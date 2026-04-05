import { join } from "path";
import { writeFileSync, readFileSync, readdirSync, existsSync } from "fs";
import { sourcesDir } from "../db.js";
import type { SourceMeta } from "../../shared/types.js";

interface IngestResult {
  source: SourceMeta;
  chunks: string[];
}

// chunk text into overlapping segments
function chunkText(text: string, maxChars = 3000, overlap = 500): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }
  return chunks;
}

function buildFrontMatter(meta: { title: string; type: string; url?: string; date: string; pages?: number }): string {
  const lines = [
    "---",
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `type: ${meta.type}`,
  ];
  if (meta.url) lines.push(`url: ${meta.url}`);
  if (meta.pages) lines.push(`pages: ${meta.pages}`);
  lines.push(`date: ${meta.date}`, "---", "");
  return lines.join("\n");
}

export async function ingestPdf(notebookId: string, id: string, buffer: ArrayBuffer, filename: string): Promise<IngestResult> {
  // dynamic import pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist");
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(text);
  }

  const fullText = pages.join("\n\n");
  const chunks = chunkText(fullText);
  const title = filename.replace(/\.pdf$/i, "");
  const now = new Date().toISOString();

  const frontMatter = buildFrontMatter({ title, type: "pdf", date: now, pages: doc.numPages });
  const mdContent = frontMatter + fullText;
  const mdPath = join(sourcesDir(notebookId), `${id}.md`);
  writeFileSync(mdPath, mdContent, "utf-8");

  const source: SourceMeta = {
    id, notebookId, type: "pdf", title,
    pageCount: doc.numPages, chunkCount: chunks.length, createdAt: now,
  };

  return { source, chunks };
}

export async function ingestUrl(notebookId: string, id: string, url: string): Promise<IngestResult> {
  const response = await fetch(url);
  const html = await response.text();

  // use linkedom + readability
  const { parseHTML } = await import("linkedom");
  const { Readability } = await import("@mozilla/readability");

  const { document } = parseHTML(html);
  const reader = new Readability(document);
  const article = reader.parse();

  const title = article?.title ?? new URL(url).hostname;
  const content = article?.textContent ?? html.slice(0, 10000);
  const chunks = chunkText(content);
  const now = new Date().toISOString();

  const frontMatter = buildFrontMatter({ title, type: "url", url, date: now });
  const mdContent = frontMatter + content;
  const mdPath = join(sourcesDir(notebookId), `${id}.md`);
  writeFileSync(mdPath, mdContent, "utf-8");

  const source: SourceMeta = {
    id, notebookId, type: "url", title, url, chunkCount: chunks.length, createdAt: now,
  };

  return { source, chunks };
}

export async function ingestText(notebookId: string, id: string, text: string, title: string): Promise<IngestResult> {
  const chunks = chunkText(text);
  const now = new Date().toISOString();

  const frontMatter = buildFrontMatter({ title, type: "text", date: now });
  const mdContent = frontMatter + text;
  const mdPath = join(sourcesDir(notebookId), `${id}.md`);
  writeFileSync(mdPath, mdContent, "utf-8");

  const source: SourceMeta = {
    id, notebookId, type: "text", title, chunkCount: chunks.length, createdAt: now,
  };

  return { source, chunks };
}

// read all source .md files and return their text chunks for searching
export function loadSourceChunks(notebookId: string): Array<{ sourceId: string; chunk: string }> {
  const dir = sourcesDir(notebookId);
  if (!existsSync(dir)) return [];

  const results: Array<{ sourceId: string; chunk: string }> = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const sourceId = file.replace(/\.md$/, "");
    const content = readFileSync(join(dir, file), "utf-8");
    // strip front matter
    const body = content.replace(/^---[\s\S]*?---\n*/, "");
    const chunks = chunkText(body);
    for (const chunk of chunks) {
      results.push({ sourceId, chunk });
    }
  }
  return results;
}

// get source summaries for system prompt
export function getSourceSummaries(notebookId: string): string[] {
  const dir = sourcesDir(notebookId);
  if (!existsSync(dir)) return [];

  const summaries: string[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const content = readFileSync(join(dir, file), "utf-8");
    const titleMatch = content.match(/^title:\s*"?(.+?)"?\s*$/m);
    const typeMatch = content.match(/^type:\s*(.+)$/m);
    const title = titleMatch?.[1] ?? file;
    const type = typeMatch?.[1] ?? "unknown";
    // first 200 chars of body for summary
    const body = content.replace(/^---[\s\S]*?---\n*/, "");
    const preview = body.slice(0, 200).replace(/\n/g, " ");
    summaries.push(`[${type}] ${title}: ${preview}...`);
  }
  return summaries;
}
