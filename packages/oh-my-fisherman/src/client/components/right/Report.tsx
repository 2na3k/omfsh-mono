import { useState, useRef, useEffect } from "react";
import { useGraphStore } from "../../stores/graph.js";
import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { EntityList } from "./EntityList.js";
import { Graph } from "./Graph.js";
import { exportMarkdown, exportHtml, exportPdf } from "../../utils/exportReport.js";

type Tab = "report" | "graph" | "entities";

export function Report() {
  const [activeTab, setActiveTab] = useState<Tab>("report");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const entities = useGraphStore((s) => s.entities);
  const relations = useGraphStore((s) => s.relations);
  const reportMarkdown = useGraphStore((s) => s.reportMarkdown);

  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const notebookName = notebooks.find((n) => n.id === activeNotebookId)?.name ?? "report";

  // close dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const handleExport = (fmt: "md" | "html" | "pdf") => {
    setExportOpen(false);
    if (fmt === "md")   exportMarkdown(reportMarkdown, notebookName);
    if (fmt === "html") exportHtml(reportMarkdown, notebookName);
    if (fmt === "pdf")  exportPdf(reportMarkdown, notebookName);
  };

  return (
    <div className="flex flex-col h-full">
      {/* tabs + export */}
      <div
        className="flex items-center"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {(["report", "graph", "entities"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 transition-colors"
            style={{
              padding: "var(--sp-3) var(--sp-4)",
              fontSize: "var(--text-xs)",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
            }}
          >
            {tab}
          </button>
        ))}

        {/* export button — only when report tab has content */}
        {activeTab === "report" && reportMarkdown && (
          <div ref={exportRef} style={{ position: "relative", padding: "0 var(--sp-3)", flexShrink: 0 }}>
            <button
              onClick={() => setExportOpen((o) => !o)}
              title="Export report"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                color: exportOpen ? "var(--accent)" : "var(--text-muted)",
                background: exportOpen ? "var(--accent-subtle)" : "transparent",
                border: "1px solid",
                borderColor: exportOpen ? "var(--accent)" : "var(--border)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "color 0.1s, border-color 0.1s, background 0.1s",
                letterSpacing: "0.03em",
              }}
            >
              Export
              <span style={{
                fontSize: 8,
                display: "inline-block",
                transform: exportOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}>▼</span>
            </button>

            {exportOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "var(--surface-overlay)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)",
                overflow: "hidden",
                minWidth: 130,
                zIndex: 50,
                animation: "fadeIn 0.1s ease",
              }}>
                {(["Markdown (.md)", "HTML (.html)", "PDF (print)"] as const).map((label, i) => {
                  const fmt = (["md", "html", "pdf"] as const)[i];
                  return (
                    <button
                      key={fmt}
                      onClick={() => handleExport(fmt)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 14px",
                        fontSize: "var(--text-xs)",
                        color: "var(--text)",
                        background: "transparent",
                        border: "none",
                        borderBottom: i < 2 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: activeTab === "graph" ? 0 : "var(--sp-5)" }}>
        {activeTab === "report" && (
          reportMarkdown ? (
            <MarkdownRenderer content={reportMarkdown} />
          ) : (
            <div
              className="flex flex-col items-center justify-center"
              style={{ paddingTop: "var(--sp-12)", opacity: 0.5 }}
            >
              <Text variant="lg" serif muted style={{ fontStyle: "italic" }}>No report yet</Text>
              <div style={{ marginTop: "var(--sp-3)" }}>
                <Text variant="xs" muted>The agent builds a report as it researches</Text>
              </div>
            </div>
          )
        )}
        {activeTab === "graph" && <Graph />}
        {activeTab === "entities" && <EntityList />}
      </div>

      {/* status bar */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "var(--sp-2) var(--sp-4)", borderTop: "1px solid var(--border)" }}
      >
        <Text variant="xs" muted mono>{entities.length} entities</Text>
        <Text variant="xs" muted mono>{relations.length} relations</Text>
      </div>
    </div>
  );
}
