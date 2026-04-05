import { useState, useRef, useCallback, type DragEvent } from "react";
import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";

export function SourceUpload() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const addSource = useNotebookStore((s) => s.addSource);

  const uploadFile = useCallback(async (file: File) => {
    if (!activeNotebookId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/notebooks/${activeNotebookId}/sources`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const source = await res.json();
        addSource(source);
      }
    } finally {
      setUploading(false);
    }
  }, [activeNotebookId, addSource]);

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await uploadFile(file);
    }
  }, [uploadFile]);

  const handleFileSelect = useCallback(async () => {
    const files = fileInputRef.current?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadFile]);

  if (!activeNotebookId) return null;

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: "var(--sp-6) var(--sp-4)",
          border: `1.5px dashed ${dragging ? "var(--accent)" : "var(--border-active)"}`,
          borderRadius: "var(--radius-md)",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "var(--accent-subtle)" : "transparent",
          transition: "all 0.15s ease",
        }}
      >
        <Text variant="sm" muted={!dragging} accent={dragging}>
          {uploading ? "Uploading..." : dragging ? "Drop here" : "Drop files here"}
        </Text>
        <div style={{ marginTop: "var(--sp-1)" }}>
          <Text variant="xs" muted>PDF, TXT, MD</Text>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.text"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </div>
  );
}
