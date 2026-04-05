import { useState } from "react";
import { useGraphStore } from "../../stores/graph.js";
import { Text } from "../shared/Text.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { EntityList } from "./EntityList.js";
import { Graph } from "./Graph.js";

type Tab = "report" | "graph" | "entities";

export function Report() {
  const [activeTab, setActiveTab] = useState<Tab>("report");
  const entities = useGraphStore((s) => s.entities);
  const relations = useGraphStore((s) => s.relations);
  const reportMarkdown = useGraphStore((s) => s.reportMarkdown);

  return (
    <div className="flex flex-col h-full">
      {/* tabs */}
      <div
        className="flex"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {(["report", "graph", "entities"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1"
            style={{
              padding: "var(--sp-3) var(--sp-4)",
              textTransform: "uppercase",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.1em",
              fontWeight: 500,
              color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
              borderBottom: activeTab === tab ? "1px solid var(--accent)" : "1px solid transparent",
              background: "transparent",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: activeTab === "graph" ? 0 : "var(--sp-4)" }}>
        {activeTab === "report" && (
          reportMarkdown ? (
            <MarkdownRenderer content={reportMarkdown} />
          ) : (
            <div
              className="flex flex-col items-center justify-center"
              style={{ paddingTop: "var(--sp-12)", opacity: 0.5 }}
            >
              <Text variant="sm" muted>no report yet</Text>
              <div style={{ marginTop: "var(--sp-2)" }}>
                <Text variant="xs" muted>
                  the agent builds a report as it researches
                </Text>
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
        style={{
          padding: "var(--sp-2) var(--sp-4)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <Text variant="xs" muted>entities: {entities.length}</Text>
        <Text variant="xs" muted>relations: {relations.length}</Text>
      </div>
    </div>
  );
}
