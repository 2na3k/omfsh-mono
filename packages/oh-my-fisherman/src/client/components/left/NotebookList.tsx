import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";

export function NotebookList() {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const activeId = useNotebookStore((s) => s.activeNotebookId);
  const setActive = useNotebookStore((s) => s.setActiveNotebook);

  if (notebooks.length === 0) {
    return (
      <div style={{ padding: "var(--sp-4)", textAlign: "center" }}>
        <Text variant="sm" muted>no notebooks</Text>
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
            className="w-full text-left block"
            style={{
              padding: "var(--sp-2) var(--sp-4)",
              borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              background: isActive ? "var(--surface-raised)" : "transparent",
              color: isActive ? "var(--text)" : "var(--text-secondary)",
              fontSize: "var(--text-sm)",
            }}
          >
            {nb.name}
          </button>
        );
      })}
    </div>
  );
}
