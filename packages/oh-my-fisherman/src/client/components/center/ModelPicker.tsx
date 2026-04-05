import { useState, useRef, useEffect, useMemo } from "react";
import { MODELS } from "@2na3k/omfsh-provider";
import type { ModelId } from "@2na3k/omfsh-provider";
import { useChatStore } from "../../stores/chat.js";
import { Text } from "../shared/Text.js";

interface ModelEntry {
  id: ModelId;
  provider: string;
}

export function ModelPicker() {
  const [open, setOpen] = useState(false);
  const modelId = useChatStore((s) => s.modelId);
  const status = useChatStore((s) => s.status);
  const setModelId = useChatStore((s) => s.setModelId);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const models: ModelEntry[] = useMemo(
    () => Object.entries(MODELS).map(([id, def]) => ({
      id: id as ModelId,
      provider: def.provider,
    })),
    [],
  );

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={status === "running"}
        className="flex items-center gap-1"
        style={{
          padding: "2px 8px",
          border: "1px solid var(--border-active)",
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
          background: "transparent",
          cursor: status === "running" ? "not-allowed" : "pointer",
          opacity: status === "running" ? 0.5 : 1,
        }}
      >
        <Text variant="xs" secondary>{modelId}</Text>
        <Text variant="xs" muted>{open ? "▴" : "▾"}</Text>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            minWidth: 280,
            background: "var(--surface)",
            border: "1px solid var(--border-active)",
            zIndex: 50,
          }}
        >
          {models.map((model) => {
            const isActive = model.id === modelId;
            return (
              <button
                key={model.id}
                onClick={() => {
                  setModelId(model.id);
                  setOpen(false);
                }}
                className="w-full text-left flex items-center justify-between"
                style={{
                  padding: "6px 12px",
                  borderBottom: "1px solid var(--border)",
                  background: isActive ? "var(--surface-raised)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "var(--text-xs)",
                }}
              >
                <span>{model.id}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                  {model.provider}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
