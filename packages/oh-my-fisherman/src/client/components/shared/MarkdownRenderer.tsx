import { useMemo, useRef, useEffect } from "react";
import { marked } from "marked";
import type { Token } from "marked";
import { ChartBlock } from "../right/ChartBlock.js";
import type { ChartSpec } from "../../../shared/chart-types.js";

interface MarkdownRendererProps {
  content: string;
}

type HtmlSegment   = { kind: "html";  html: string };
type ChartSegment  = { kind: "chart"; spec: ChartSpec; key: string };
type Segment = HtmlSegment | ChartSegment;

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Intercept clicks on #ref-* anchor links so they scroll within the report's
  // own scroll container rather than trying to navigate window.location.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("#")) return;
      const targetId = href.slice(1);
      const target = el.querySelector(`[id="${targetId}"], a[name="${targetId}"]`) as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, []);

  const segments = useMemo((): Segment[] => {
    const tokens = marked.Lexer.lex(content);
    const result: Segment[] = [];
    let acc: Token[] = [];
    let chartIndex = 0;

    const flush = () => {
      if (acc.length === 0) return;
      let html = marked.Parser.parse(acc as marked.TokensList);
      // Upgrade [n](#ref-n) cite links → <sup> so they render as clickable superscripts.
      // Only matches links whose text is purely a number (the inline citation markers).
      html = html.replace(
        /<a href="#(ref-\d+)">(\d+)<\/a>/g,
        '<sup><a href="#$1" class="cite-ref">$2</a></sup>',
      );
      if (html.trim()) result.push({ kind: "html", html });
      acc = [];
    };

    for (const token of tokens) {
      if (token.type === "code" && (token as marked.Tokens.Code).lang === "fisherman-chart") {
        flush();
        try {
          const spec = JSON.parse((token as marked.Tokens.Code).text) as ChartSpec;
          result.push({ kind: "chart", spec, key: `chart-${chartIndex++}` });
        } catch {
          // malformed JSON — degrade to plain <pre><code> block
          acc.push(token);
        }
      } else {
        acc.push(token);
      }
    }
    flush();
    return result;
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="markdown-body"
      style={{ fontSize: "var(--text-sm)", lineHeight: 1.7, color: "var(--text)" }}
    >
      {segments.map((seg, i) =>
        seg.kind === "html"
          ? <div key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
          : <ChartBlock key={seg.key} spec={seg.spec} />
      )}
    </div>
  );
}
