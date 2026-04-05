import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";

export function NotebookList() {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const activeId = useNotebookStore((s) => s.activeNotebookId);
  const setActive = useNotebookStore((s) => s.setActiveNotebook);

  if (notebooks.length === 0) {
    return (
      <div style={{ padding: "var(--sp-4)", textAlign: "center" }}>
        <Text variant="sm" muted>No notebooks yet</Text>
      </div>
    );
  }

  return (
    <div>
      {notebooks.map((nb) => {
        const isActive = nb.id === activeId;
        return (
          <button
            key={nb.id}
            onClick={() => setActive(nb.id)}
            className="w-full text-left block transition-colors"
            style={{
              padding: "var(--sp-2) var(--sp-4)",
              paddingLeft: isActive ? "14px" : "var(--sp-4)",
              borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
              background: isActive ? "var(--accent-subtle)" : "transparent",
              color: isActive ? "var(--text)" : "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {nb.name}
          </button>
        );
      })}
    </div>
  );
}
