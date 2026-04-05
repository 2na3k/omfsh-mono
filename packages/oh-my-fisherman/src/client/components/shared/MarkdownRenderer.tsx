import { useMemo } from "react";
import { marked } from "marked";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontSize: "var(--text-sm)",
        lineHeight: 1.7,
        color: "var(--text)",
      }}
    />
  );
}
