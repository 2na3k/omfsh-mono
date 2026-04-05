import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { ModelPicker } from "./ModelPicker.js";

interface InputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function Input({ onSubmit, disabled = false }: InputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [text]);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit(text.trim());
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = !disabled && text.trim().length > 0;

  return (
    <div style={{ padding: "var(--sp-3) var(--sp-5) var(--sp-5)" }}>
      <div
        style={{
          border: `1px solid ${disabled ? "var(--border)" : "var(--border-active)"}`,
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
          boxShadow: disabled ? "none" : "var(--shadow-md)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          opacity: disabled ? 0.65 : 1,
        }}
      >
        {/* textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Researching..." : "Ask something..."}
          disabled={disabled}
          rows={1}
          className="w-full resize-none"
          style={{
            padding: "var(--sp-4) var(--sp-4) var(--sp-2)",
            background: "transparent",
            color: "var(--text)",
            outline: "none",
            fontSize: "var(--text-sm)",
            lineHeight: 1.7,
            display: "block",
            minHeight: 44,
            maxHeight: 180,
            overflow: "auto",
          }}
        />

        {/* bottom bar */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "var(--sp-2) var(--sp-3) var(--sp-3)" }}
        >
          <ModelPicker />

          {/* send button */}
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            title="Send (Enter)"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: canSend ? "var(--accent)" : "var(--surface-raised)",
              border: `1px solid ${canSend ? "var(--accent)" : "var(--border)"}`,
              color: canSend ? "var(--bg)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canSend ? "pointer" : "not-allowed",
              transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
              flexShrink: 0,
            }}
          >
            {/* up arrow */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
