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
        className="flex items-center gap-1 transition-colors"
        style={{
          padding: "3px 10px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--text-secondary)",
          background: "var(--surface-raised)",
          cursor: status === "running" ? "not-allowed" : "pointer",
          opacity: status === "running" ? 0.5 : 1,
        }}
      >
        <span>{modelId}</span>
        <span style={{ color: "var(--text-muted)", marginLeft: 2 }}>{open ? "\u25B4" : "\u25BE"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 280,
            background: "var(--surface-overlay)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {models.map((model, i) => {
            const isActive = model.id === modelId;
            return (
              <button
                key={model.id}
                onClick={() => {
                  setModelId(model.id);
                  setOpen(false);
                }}
                className="w-full text-left flex items-center justify-between transition-colors"
                style={{
                  padding: "8px 14px",
                  borderBottom: i < models.length - 1 ? "1px solid var(--border)" : "none",
                  background: isActive ? "var(--accent-subtle)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "var(--text-xs)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>{model.id}</span>
                <Text variant="xs" muted>{model.provider}</Text>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
