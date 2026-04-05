import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";

export function NotebookList() {
  const notebooks = useNotebookStore((s) => s.notebooks);
  const activeId = useNotebookStore((s) => s.activeNotebookId);
  const setActive = useNotebookStore((s) => s.setActiveNotebook);
  const removeNotebook = useNotebookStore((s) => s.removeNotebook);
  const renameNotebook = useNotebookStore((s) => s.renameNotebook);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleNotebookClick = (id: string, name: string) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      startEdit(id, name);
    } else {
      setActive(id);
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
      }, 250);
    }
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (name) {
      await fetch(`/api/notebooks/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      renameNotebook(editingId, name);
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
    removeNotebook(id);
  };

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
        const isEditing = editingId === nb.id;

        return (
          <div
            key={nb.id}
            className="flex items-center group"
            style={{
              paddingLeft: isActive ? "14px" : "var(--sp-4)",
              borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
              background: isActive ? "var(--accent-subtle)" : "transparent",
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={commitEdit}
                style={{
                  flex: 1,
                  padding: "var(--sp-2) 0",
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 500 : 400,
                  background: "transparent",
                  color: "var(--text)",
                  outline: "none",
                  borderBottom: "1px solid var(--accent)",
                  minWidth: 0,
                }}
              />
            ) : (
              <button
                onClick={() => handleNotebookClick(nb.id, nb.name)}
                className="flex-1 text-left transition-colors"
                style={{
                  padding: "var(--sp-2) 0",
                  color: isActive ? "var(--text)" : "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 500 : 400,
                  background: "transparent",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {nb.name}
              </button>
            )}

            {!isEditing && (
              <button
                onClick={(e) => handleDelete(nb.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete notebook"
                style={{
                  padding: "var(--sp-1) var(--sp-3)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                  fontSize: "var(--text-xs)",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
