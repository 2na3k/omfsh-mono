import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { ModelPicker } from "./ModelPicker.js";

interface InputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function Input({ onSubmit, disabled = false }: InputProps) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
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
  const active = focused && !disabled;

  return (
    <div
      style={{
        padding: "var(--sp-2) var(--sp-4) var(--sp-4)",
        borderTop: `1px solid ${active ? "var(--border-active)" : "var(--border)"}`,
        background: "var(--bg)",
        transition: "border-color 0.15s ease",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-end gap-2">
        {/* textarea — no box, just a plain field */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={disabled ? "Researching…" : "Ask something…"}
          disabled={disabled}
          rows={1}
          className="w-full resize-none"
          style={{
            flex: 1,
            padding: "var(--sp-2) 0",
            background: "transparent",
            color: "var(--text)",
            outline: "none",
            border: "none",
            fontSize: "var(--text-sm)",
            lineHeight: 1.6,
            minHeight: 32,
            maxHeight: 140,
            overflow: "auto",
          }}
        />

        {/* right side: model picker + send */}
        <div className="flex items-center gap-2" style={{ paddingBottom: "var(--sp-1)", flexShrink: 0 }}>
          <ModelPicker />

          <button
            onClick={handleSubmit}
            disabled={!canSend}
            title="Send (Enter)"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: canSend ? "var(--accent)" : "transparent",
              border: `1px solid ${canSend ? "var(--accent)" : "var(--border)"}`,
              color: canSend ? "var(--bg)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canSend ? "pointer" : "default",
              transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
