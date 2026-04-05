import { useState } from "react";
import type { UiMessage } from "../../../shared/types.js";
import { Text } from "../shared/Text.js";

interface ToolCallProps {
  message: UiMessage;
}

const TOOL_ICONS: Record<string, string> = {
  web_search:    "⌕",
  web_read:      "↗",
  source_search: "◈",
  note_write:    "✎",
  entity_extract: "◎",
};

export function ToolCall({ message }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = message.isStreaming;
  const icon = TOOL_ICONS[message.toolName ?? ""] ?? "◆";

  return (
    <div style={{ padding: "2px 0", animation: "fadeIn 0.15s ease" }}>
      <button
        onClick={() => !isRunning && setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
        style={{
          padding: "5px 10px",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          cursor: isRunning ? "default" : "pointer",
          transition: "background 0.1s ease",
        }}
      >
        {/* status dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            flexShrink: 0,
            background: isRunning ? "var(--accent)" : "var(--text-muted)",
            animation: isRunning ? "pulse 1.5s ease infinite" : "none",
          }}
        />

        {/* icon + name */}
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {icon}
        </span>
        <Text variant="xs" mono style={{ color: "var(--text-secondary)", flex: 1 }}>
          {message.toolName ?? "tool"}
        </Text>

        {/* right side */}
        {isRunning ? (
          <Text variant="xs" accent style={{ animation: "pulse 1.5s ease infinite" }}>
            running
          </Text>
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
            {expanded ? "▴" : "▾"}
          </span>
        )}
      </button>

      {expanded && !isRunning && (
        <div
          style={{
            margin: "4px 0 4px 10px",
            paddingLeft: "var(--sp-3)",
            borderLeft: "2px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--sp-2)",
          }}
        >
          {message.toolInput != null && (
            <div>
              <Text variant="xs" muted style={{ display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Input
              </Text>
              <pre
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: 160,
                  overflow: "auto",
                  background: "var(--surface-raised)",
                  padding: "var(--sp-2) var(--sp-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  margin: 0,
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
              <Text variant="xs" muted style={{ display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Output
              </Text>
              <pre
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  maxHeight: 160,
                  overflow: "auto",
                  background: "var(--surface-raised)",
                  padding: "var(--sp-2) var(--sp-3)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  margin: 0,
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
