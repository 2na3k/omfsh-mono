import { useState } from "react";
import type { UiMessage } from "../../../shared/types.js";
import { Text } from "../shared/Text.js";

interface ToolCallGroupProps {
  messages: UiMessage[];
}

const TOOL_ICONS: Record<string, string> = {
  web_search:     "⌕",
  web_read:       "↗",
  source_search:  "◈",
  note_write:     "✎",
  entity_extract: "◎",
};

const TOOL_LABELS: Record<string, string> = {
  web_search:     "Search the web",
  web_read:       "Read webpage",
  source_search:  "Search sources",
  note_write:     "Write report section",
  entity_extract: "Extract entities",
};

function getKeyArg(msg: UiMessage): string | null {
  const input = msg.toolInput as Record<string, unknown> | null;
  if (!input) return null;
  if (msg.toolName === "web_search" && typeof input.query === "string") return input.query;
  if (msg.toolName === "web_read" && typeof input.url === "string") return input.url;
  if (msg.toolName === "source_search" && typeof input.query === "string") return input.query;
  if (msg.toolName === "note_write" && typeof input.section === "string") return input.section;
  if (msg.toolName === "entity_extract" && typeof input.text === "string")
    return input.text.slice(0, 60) + (input.text.length > 60 ? "…" : "");
  const first = Object.values(input)[0];
  if (typeof first === "string") return first.slice(0, 80);
  return null;
}

function getDownloadInfo(msg: UiMessage): { filename: string; content: string; mime: string } | null {
  const output = typeof msg.toolOutput === "string" ? msg.toolOutput : null;
  if (!output) return null;
  if (msg.toolName === "note_write") return { filename: "report.md", content: output, mime: "text/markdown" };
  const trimmed = output.trimStart();
  if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html"))
    return { filename: "output.html", content: output, mime: "text/html" };
  return null;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ToolCallGroup({ messages }: ToolCallGroupProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const doneCount = messages.filter((m) => !m.isStreaming).length;
  const totalCount = messages.length;
  const isAnyRunning = messages.some((m) => m.isStreaming);

  const label = isAnyRunning
    ? `${doneCount} / ${totalCount} steps`
    : `${totalCount} step${totalCount !== 1 ? "s" : ""}`;

  return (
    <div
      style={{
        margin: "6px 0",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface)",
        overflow: "hidden",
        animation: "fadeIn 0.15s ease",
      }}
    >
      {/* Header toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left"
        style={{
          padding: "6px 12px",
          cursor: "pointer",
          background: "transparent",
          border: "none",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1 }}>
          {open ? "▾" : "▸"}
        </span>
        <Text variant="xs" mono muted>
          {open ? "Less steps" : "More steps"}
        </Text>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            color: isAnyRunning ? "var(--accent)" : "var(--text-muted)",
            animation: isAnyRunning ? "pulse 1.5s ease infinite" : "none",
          }}
        >
          {label}
        </span>
      </button>

      {/* Step list */}
      {open && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {messages.map((msg) => {
            const icon = TOOL_ICONS[msg.toolName ?? ""] ?? "◆";
            const toolLabel = TOOL_LABELS[msg.toolName ?? ""] ?? (msg.toolName ?? "tool");
            const keyArg = getKeyArg(msg);
            const isRunning = msg.isStreaming;
            const isExpanded = expandedId === msg.id;
            const dlInfo = getDownloadInfo(msg);

            return (
              <div
                key={msg.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {/* Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 12px",
                  }}
                >
                  {/* Status dot + icon */}
                  <div className="flex items-center gap-2" style={{ paddingTop: 2, flexShrink: 0 }}>
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: isRunning ? "var(--accent)" : "var(--text-muted)",
                        animation: isRunning ? "pulse 1.5s ease infinite" : "none",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                      <Text variant="xs" secondary style={{ flexShrink: 0 }}>
                        {toolLabel}
                      </Text>
                      {isRunning && (
                        <Text variant="xs" accent style={{ animation: "pulse 1.5s ease infinite" }}>
                          running…
                        </Text>
                      )}
                    </div>

                    {keyArg && (
                      <div
                        style={{
                          marginTop: 4,
                          display: "inline-block",
                          maxWidth: "100%",
                          padding: "2px 7px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface-raised)",
                          border: "1px solid var(--border)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={keyArg}
                      >
                        {keyArg}
                      </div>
                    )}
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1" style={{ flexShrink: 0, paddingTop: 1 }}>
                    {!isRunning && dlInfo && (
                      <button
                        onClick={() => downloadFile(dlInfo.filename, dlInfo.content, dlInfo.mime)}
                        title={`Download ${dlInfo.filename}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          fontSize: 11,
                          lineHeight: 1,
                          transition: "color 0.1s, border-color 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                        }}
                      >
                        ↓
                      </button>
                    )}
                    {!isRunning && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          background: "transparent",
                          border: "1px solid transparent",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          fontSize: 10,
                          lineHeight: 1,
                        }}
                      >
                        {isExpanded ? "▴" : "▾"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && !isRunning && (
                  <div
                    style={{
                      margin: "0 12px 8px 28px",
                      paddingLeft: "var(--sp-3)",
                      borderLeft: "2px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--sp-2)",
                    }}
                  >
                    {msg.toolInput != null && (
                      <div>
                        <Text variant="xs" muted style={{ display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Input
                        </Text>
                        <pre style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflow: "auto", background: "var(--surface-raised)", padding: "var(--sp-2) var(--sp-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", margin: 0 }}>
                          {typeof msg.toolInput === "string" ? msg.toolInput : JSON.stringify(msg.toolInput, null, 2)}
                        </pre>
                      </div>
                    )}
                    {msg.toolOutput != null && (
                      <div>
                        <Text variant="xs" muted style={{ display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Output
                        </Text>
                        <pre style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflow: "auto", background: "var(--surface-raised)", padding: "var(--sp-2) var(--sp-3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", margin: 0 }}>
                          {typeof msg.toolOutput === "string" ? msg.toolOutput : JSON.stringify(msg.toolOutput, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
