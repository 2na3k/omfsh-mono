import { useMemo } from "react";
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
  const segments = useMemo((): Segment[] => {
    const tokens = marked.Lexer.lex(content);
    const result: Segment[] = [];
    let acc: Token[] = [];
    let chartIndex = 0;

    const flush = () => {
      if (acc.length === 0) return;
      const html = marked.Parser.parse(acc as marked.TokensList);
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
