import { useState, type KeyboardEvent } from "react";
import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";

export function UrlInput() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const addSource = useNotebookStore((s) => s.addSource);

  if (!activeNotebookId) return null;

  const submit = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notebooks/${activeNotebookId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (res.ok) {
        const source = await res.json();
        addSource(source);
        setUrl("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="flex items-center"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-raised)",
      }}
    >
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste URL..."
        disabled={loading}
        style={{
          flex: 1,
          padding: "var(--sp-2) var(--sp-3)",
          fontSize: "var(--text-xs)",
          background: "transparent",
          color: "var(--text)",
          outline: "none",
        }}
      />
      <button
        onClick={submit}
        style={{
          padding: "var(--sp-2) var(--sp-3)",
          fontSize: "var(--text-xs)",
          color: loading ? "var(--accent)" : "var(--text-muted)",
          fontWeight: 500,
        }}
      >
        {loading ? "..." : "Add"}
      </button>
    </div>
  );
}
