import { useState } from "react";
import type { UiMessage } from "../../../shared/types.js";
import { Text } from "../shared/Text.js";
import { ToolCall } from "./ToolCall.js";
import { StreamingText } from "./StreamingText.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";

interface MessageProps {
  message: UiMessage;
}

export function Message({ message }: MessageProps) {
  if (message.role === "tool") {
    return <ToolCall message={message} />;
  }

  if (message.role === "error") {
    return (
      <div
        style={{
          padding: "var(--sp-3) var(--sp-4)",
          margin: "var(--sp-2) 0",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--error, #c0392b)",
          background: "color-mix(in srgb, var(--error, #c0392b) 8%, transparent)",
          animation: "fadeIn 0.2s ease",
        }}
      >
        <Text variant="xs" style={{ color: "var(--error, #c0392b)", display: "block", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          Error
        </Text>
        <Text variant="sm" style={{ color: "var(--error, #c0392b)", opacity: 0.85 }}>
          {message.text}
        </Text>
      </div>
    );
  }

  // log messages — subtle, editorial divider style
  if (message.role === "log") {
    return (
      <div
        style={{
          padding: "var(--sp-2) 0",
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-3)",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <Text variant="xs" muted style={{ fontStyle: "italic", whiteSpace: "nowrap" }}>
          {message.text}
        </Text>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
    );
  }

  const isUser = message.role === "user";
  const isReasoning = message.role === "reasoning";
  // auto-open while streaming, collapsed once done
  const [open, setOpen] = useState(false);

  if (isReasoning) {
    return (
      <div style={{ padding: "var(--sp-2) 0", borderBottom: "1px solid var(--border)", animation: "fadeIn 0.2s ease" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--sp-2)",
          }}
        >
          <Text
            variant="xs"
            weight="medium"
            style={{
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {message.isStreaming ? "Thinking…" : "Thinking"}
          </Text>
          <span style={{
            fontSize: 9,
            color: "var(--text-muted)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            display: "inline-block",
          }}>
            ▶
          </span>
        </button>
        {(open || message.isStreaming) && (
          <div style={{
            marginTop: "var(--sp-2)",
            paddingLeft: "var(--sp-3)",
            borderLeft: "2px solid var(--border)",
            fontSize: "var(--text-xs)",
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 320,
            overflowY: "auto",
          }}>
            {message.isStreaming
              ? <StreamingText text={message.text ?? ""} />
              : <span>{message.text}</span>
            }
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "var(--sp-4) 0",
        borderBottom: "1px solid var(--border)",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <Text
        variant="xs"
        weight="medium"
        style={{
          color: isUser ? "var(--text-muted)" : "var(--accent)",
          marginBottom: 6,
          display: "block",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {isUser ? "You" : "Research"}
      </Text>
      <div style={{ paddingLeft: isUser ? 0 : "var(--sp-1)", fontSize: "var(--text-sm)", lineHeight: 1.75 }}>
        {message.isStreaming ? (
          <StreamingText text={message.text ?? ""} />
        ) : (
          <MarkdownRenderer content={message.text ?? ""} />
        )}
      </div>
    </div>
  );
}
