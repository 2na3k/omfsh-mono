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
        padding: "var(--sp-4)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          border: `1px solid ${disabled ? "var(--border)" : "var(--border-active)"}`,
          background: "var(--surface)",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "researching..." : "ask something..."}
          disabled={disabled}
          rows={3}
          className="w-full resize-none"
          style={{
            padding: "var(--sp-3) var(--sp-4)",
            background: "transparent",
            color: "var(--text)",
            outline: "none",
            fontSize: "var(--text-sm)",
          }}
        />
        <div
          className="flex items-center justify-between"
          style={{
            padding: "var(--sp-2) var(--sp-4)",
            borderTop: "1px solid var(--border)",
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
