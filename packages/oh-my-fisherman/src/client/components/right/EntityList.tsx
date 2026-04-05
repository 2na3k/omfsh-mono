import { useGraphStore } from "../../stores/graph.js";
import { Text } from "../shared/Text.js";

const TYPE_COLORS: Record<string, string> = {
  person: "#6a8fa7",
  org: "#7a9a6e",
  concept: "#c49b5c",
  event: "#b86a6a",
  location: "#8e6aa8",
  work: "#7a8a8e",
};

export function EntityList() {
  const entities = useGraphStore((s) => s.entities);
  const selectedId = useGraphStore((s) => s.selectedEntityId);
  const setSelected = useGraphStore((s) => s.setSelectedEntity);

  if (entities.length === 0) {
    return (
      <div style={{ padding: "var(--sp-6)", textAlign: "center" }}>
        <Text variant="sm" muted style={{ fontStyle: "italic" }}>No entities extracted</Text>
      </div>
    );
  }

  return (
    <div>
      {entities.map((e) => (
        <button
          key={e.id}
          onClick={() => setSelected(selectedId === e.id ? null : e.id)}
          className="w-full text-left flex items-start gap-3 transition-colors"
          style={{
            padding: "var(--sp-3) var(--sp-4)",
            borderBottom: "1px solid var(--border)",
            background: selectedId === e.id ? "var(--accent-subtle)" : "transparent",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "var(--text-xs)",
              padding: "1px 8px",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: TYPE_COLORS[e.type] ?? "var(--text-secondary)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              whiteSpace: "nowrap",
            }}
          >
            {e.type}
          </span>
          <div className="flex-1 min-w-0">
            <Text variant="sm" weight="medium">{e.name}</Text>
            {e.description && (
              <Text variant="xs" muted as="p" style={{ marginTop: 2, lineHeight: 1.5 }}>
                {e.description}
              </Text>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
