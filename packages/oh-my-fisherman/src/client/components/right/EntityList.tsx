import { useGraphStore } from "../../stores/graph.js";
import { Text } from "../shared/Text.js";
import { Badge } from "../shared/Badge.js";

const TYPE_COLORS: Record<string, string> = {
  person: "#4fc3f7",
  org: "#81c784",
  concept: "#ffb74d",
  event: "#e57373",
  location: "#ba68c8",
  work: "#90a4ae",
};

export function EntityList() {
  const entities = useGraphStore((s) => s.entities);
  const selectedId = useGraphStore((s) => s.selectedEntityId);
  const setSelected = useGraphStore((s) => s.setSelectedEntity);

  if (entities.length === 0) {
    return (
      <div style={{ padding: "var(--sp-4)", textAlign: "center" }}>
        <Text variant="sm" muted>no entities extracted</Text>
      </div>
    );
  }

  return (
    <div>
      {entities.map((e) => (
        <button
          key={e.id}
          onClick={() => setSelected(selectedId === e.id ? null : e.id)}
          className="w-full text-left flex items-start gap-2"
          style={{
            padding: "var(--sp-2) var(--sp-3)",
            borderBottom: "1px solid var(--border)",
            background: selectedId === e.id ? "var(--surface-raised)" : "transparent",
          }}
        >
          <Badge>
            <span style={{ color: TYPE_COLORS[e.type] ?? "var(--text-secondary)" }}>
              {e.type}
            </span>
          </Badge>
          <div className="flex-1 min-w-0">
            <Text variant="sm">{e.name}</Text>
            {e.description && (
              <Text variant="xs" muted as="p" style={{ marginTop: 2 }}>
                {e.description}
              </Text>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
