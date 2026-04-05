import type { UiMessage } from "../../../shared/types.js";
import { Text } from "../shared/Text.js";
import { ToolCall } from "./ToolCall.js";
import { StreamingText } from "./StreamingText.js";

interface MessageProps {
  message: UiMessage;
}

const ROLE_PREFIX: Record<string, string> = {
  user: "> user:",
  assistant: "$ agent:",
  reasoning: "~ thinking:",
  log: "# step:",
};

export function Message({ message }: MessageProps) {
  if (message.role === "tool") {
    return <ToolCall message={message} />;
  }

  // log messages are compact one-liners
  if (message.role === "log") {
    return (
      <div style={{ padding: "var(--sp-1) 0" }}>
        <Text variant="xs" muted style={{ fontStyle: "italic" }}>
          --- {message.text} ---
        </Text>
      </div>
    );
  }

  const prefix = ROLE_PREFIX[message.role] ?? message.role;
  const isUser = message.role === "user";
  const isReasoning = message.role === "reasoning";

  return (
    <div
      style={{
        padding: "var(--sp-3) 0",
        borderBottom: "1px solid var(--border)",
        opacity: isReasoning ? 0.6 : 1,
      }}
    >
      <Text variant="xs" style={{ color: isUser ? "var(--text-secondary)" : "var(--accent)", marginBottom: 4, display: "block" }}>
        {prefix}
      </Text>
      <div style={{ paddingLeft: "var(--sp-4)", fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
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
