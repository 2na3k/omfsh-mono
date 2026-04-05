import { useState } from "react";
import type { UiMessage } from "../../../shared/types.js";
import { Text } from "../shared/Text.js";
import { Badge } from "../shared/Badge.js";

interface ToolCallProps {
  message: UiMessage;
}

export function ToolCall({ message }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        padding: "var(--sp-2) 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
        style={{ padding: "var(--sp-1) 0" }}
      >
        <Badge variant={message.isStreaming ? "accent" : "default"}>
          {message.toolName ?? "tool"}
        </Badge>
        {message.isStreaming ? (
          <Text variant="xs" accent>running...</Text>
        ) : (
          <Text variant="xs" muted>
            {expanded ? "[-]" : "[+]"}
          </Text>
        )}
      </button>

      {expanded && !message.isStreaming && (
        <div style={{ paddingLeft: "var(--sp-4)", marginTop: "var(--sp-2)" }}>
          {message.toolInput != null && (
            <div style={{ marginBottom: "var(--sp-2)" }}>
              <Text variant="xs" secondary style={{ display: "block", marginBottom: 2 }}>input:</Text>
              <pre
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: 200,
                  overflow: "auto",
                  background: "var(--surface-raised)",
                  padding: "var(--sp-2)",
                  border: "1px solid var(--border)",
                }}
              >
                {typeof message.toolInput === "string"
                  ? message.toolInput
                  : JSON.stringify(message.toolInput, null, 2)}
              </pre>
            </div>
          )}
          {message.toolOutput != null && (
            <div>
              <Text variant="xs" secondary style={{ display: "block", marginBottom: 2 }}>output:</Text>
              <pre
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: 200,
                  overflow: "auto",
                  background: "var(--surface-raised)",
                  padding: "var(--sp-2)",
                  border: "1px solid var(--border)",
                }}
              >
                {typeof message.toolOutput === "string"
                  ? message.toolOutput
                  : JSON.stringify(message.toolOutput, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
