import { useState, useCallback, useEffect } from "react";
import { useNotebookStore } from "../../stores/notebook.js";
import { useChatStore } from "../../stores/chat.js";
import { useGraphStore } from "../../stores/graph.js";
import { Text } from "../shared/Text.js";
import { NotebookList } from "./NotebookList.js";
import { SourceList } from "./SourceList.js";
import { SourceUpload } from "./SourceUpload.js";
import { UrlInput } from "./UrlInput.js";

export function Sidebar() {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const addNotebook = useNotebookStore((s) => s.addNotebook);
  const setActiveNotebook = useNotebookStore((s) => s.setActiveNotebook);
  const setNotebooks = useNotebookStore((s) => s.setNotebooks);
  const setSources = useNotebookStore((s) => s.setSources);
  const switchNotebook = useChatStore((s) => s.switchNotebook);
  const setMessages = useChatStore((s) => s.setMessages);
  const clearGraph = useGraphStore((s) => s.clear);

  // fetch notebooks on mount
  useEffect(() => {
    fetch("/api/notebooks")
      .then((r) => r.json())
      .then(setNotebooks)
      .catch(() => {});
  }, [setNotebooks]);

  // fetch sources when active notebook changes
  useEffect(() => {
    if (!activeNotebookId) return;
    switchNotebook(activeNotebookId);
    clearGraph();
    fetch(`/api/notebooks/${activeNotebookId}/sources`)
      .then((r) => r.json())
      .then(setSources)
      .catch(() => {});
    // load chat history from server if cache is empty
    const cached = useChatStore.getState().cache.get(activeNotebookId);
    if (!cached || cached.messages.length === 0) {
      fetch(`/api/notebooks/${activeNotebookId}/messages`)
        .then((r) => r.json())
        .then((messages) => {
          if (messages.length > 0 && useChatStore.getState().activeNotebookId === activeNotebookId) {
            setMessages(messages);
          }
        })
        .catch(() => {});
    }
    // load existing entities + report
    fetch(`/api/notebooks/${activeNotebookId}/entities`)
      .then((r) => r.json())
      .then((data) => {
        const graphStore = useGraphStore.getState();
        graphStore.setEntities(data.entities);
        graphStore.setRelations(data.relations);
      })
      .catch(() => {});
    fetch(`/api/notebooks/${activeNotebookId}/report`)
      .then((r) => r.json())
      .then((data) => {
        if (data.markdown) useGraphStore.getState().setReportMarkdown(data.markdown);
      })
      .catch(() => {});
  }, [activeNotebookId, setSources, setMessages, switchNotebook, clearGraph]);

  const createNotebook = useCallback(async () => {
    const name = newName.trim() || "Untitled Research";
    const res = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const nb = await res.json();
      addNotebook(nb);
      setActiveNotebook(nb.id);
      setCreating(false);
      setNewName("");
    }
  }, [newName, addNotebook, setActiveNotebook]);

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--sp-5) var(--sp-4) var(--sp-4)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Text variant="lg" serif style={{ fontStyle: "italic", letterSpacing: "-0.01em" }}>
          Fisherman 🐟︎
        </Text>
        <button
          onClick={() => setCreating(true)}
          className="transition-colors"
          style={{
            padding: "2px 10px",
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-raised)",
          }}
        >
          + New
        </button>
      </div>

      {/* new notebook input */}
      {creating && (
        <div style={{ padding: "var(--sp-3) var(--sp-4)", borderBottom: "1px solid var(--border)" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createNotebook();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder="Notebook name..."
            autoFocus
            style={{
              width: "100%",
              padding: "var(--sp-2) var(--sp-3)",
              fontSize: "var(--text-sm)",
              background: "var(--surface-raised)",
              color: "var(--text)",
              border: "1px solid var(--border-active)",
              borderRadius: "var(--radius-sm)",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* notebooks section */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div style={{ padding: "var(--sp-3) var(--sp-4) var(--sp-1)" }}>
          <Text variant="xs" secondary weight="medium" style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Notebooks
          </Text>
        </div>
        <NotebookList />
      </div>

      {/* sources section */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ padding: "var(--sp-3) var(--sp-4) var(--sp-1)" }}>
          <Text variant="xs" secondary weight="medium" style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Sources
          </Text>
        </div>
        <SourceList />
        <div style={{ padding: "var(--sp-3) var(--sp-4)" }}>
          <SourceUpload key={activeNotebookId} />
          <div style={{ marginTop: "var(--sp-3)" }}>
            <UrlInput key={activeNotebookId} />
          </div>
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          padding: "var(--sp-3) var(--sp-4)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <Text variant="xs" muted mono>v0.0.1</Text>
      </div>
    </div>
  );
}
