import type { UiMessage } from "../../../shared/types.js";
import { Text } from "../shared/Text.js";
import { ToolCall } from "./ToolCall.js";
import { StreamingText } from "./StreamingText.js";

interface MessageProps {
  message: UiMessage;
}

export function Message({ message }: MessageProps) {
  if (message.role === "tool") {
    return <ToolCall message={message} />;
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

  return (
    <div
      style={{
        padding: "var(--sp-4) 0",
        borderBottom: "1px solid var(--border)",
        opacity: isReasoning ? 0.55 : 1,
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
        {isUser ? "You" : isReasoning ? "Thinking" : "Research"}
      </Text>
      <div style={{ paddingLeft: isUser ? 0 : "var(--sp-1)", fontSize: "var(--text-sm)", lineHeight: 1.75 }}>
        {message.isStreaming ? (
          <StreamingText text={message.text ?? ""} />
        ) : (
          <Text variant="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {message.text}
          </Text>
        )}
      </div>
    </div>
  );
}
