import { useState, type KeyboardEvent } from "react";
import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";
import { Kbd } from "../shared/Kbd.js";

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
    <div>
      <div
        className="flex items-center"
        style={{
          border: "1px solid var(--border)",
        }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="paste url..."
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
        <div style={{ padding: "0 var(--sp-2)" }}>
          {loading ? (
            <Text variant="xs" accent>...</Text>
          ) : (
            <Kbd>Enter</Kbd>
          )}
        </div>
      </div>
    </div>
  );
}
