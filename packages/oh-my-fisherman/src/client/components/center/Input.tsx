import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Text } from "../shared/Text.js";
import { Kbd } from "../shared/Kbd.js";

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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (text.trim() && !disabled) {
        onSubmit(text.trim());
        setText("");
      }
    }
  };

  return (
    <div
      style={{
        padding: "var(--sp-4) var(--sp-5)",
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          border: `1px solid ${disabled ? "var(--border)" : "var(--border-active)"}`,
          borderRadius: "var(--radius-md)",
          background: "var(--bg)",
          opacity: disabled ? 0.6 : 1,
          boxShadow: disabled ? "none" : "var(--shadow-sm)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Researching..." : "Ask something..."}
          disabled={disabled}
          rows={3}
          className="w-full resize-none"
          style={{
            padding: "var(--sp-3) var(--sp-4)",
            background: "transparent",
            color: "var(--text)",
            outline: "none",
            fontSize: "var(--text-sm)",
            lineHeight: 1.7,
          }}
        />
        <div
          className="flex items-center justify-between"
          style={{
            padding: "var(--sp-1) var(--sp-4) var(--sp-2)",
          }}
        >
          <Text variant="xs" muted>
            {text.length > 0 ? `${text.length} chars` : ""}
          </Text>
          <div className="flex items-center gap-2">
            <Kbd>^Enter</Kbd>
            <Text variant="xs" muted>send</Text>
          </div>
        </div>
      </div>
    </div>
  );
}
