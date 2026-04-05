import { useRef, useEffect } from "react";
import { useChatStore } from "../../stores/chat.js";
import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";
import { Message } from "./Message.js";
import { ToolCallGroup } from "./ToolCallGroup.js";
import { Input } from "./Input.js";
import type { UiMessage } from "../../../shared/types.js";

type GroupedItem =
  | { kind: "single"; message: UiMessage }
  | { kind: "toolGroup"; messages: UiMessage[]; id: string };

// Roles that can appear between / around tool calls and should be absorbed into the group
const TOOL_ADJACENT = new Set<UiMessage["role"]>(["tool", "reasoning", "log"]);

function groupMessages(messages: UiMessage[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === "tool") {
      // Absorb all consecutive tool / reasoning / log messages into one group
      const group: UiMessage[] = [];
      while (i < messages.length && TOOL_ADJACENT.has(messages[i].role)) {
        if (messages[i].role === "tool") group.push(messages[i]);
        i++;
      }
      result.push({ kind: "toolGroup", messages: group, id: group[0].id });
    } else if (msg.role === "reasoning" || msg.role === "log") {
      // Peek ahead (skipping only reasoning/log) to see if a tool call follows.
      // If so, skip this message — it will be absorbed when the tool group starts.
      let j = i + 1;
      while (j < messages.length && (messages[j].role === "reasoning" || messages[j].role === "log")) j++;
      if (j < messages.length && messages[j].role === "tool") {
        i++; // skip silently
      } else {
        result.push({ kind: "single", message: msg });
        i++;
      }
    } else {
      result.push({ kind: "single", message: msg });
      i++;
    }
  }
  return result;
}

interface ChatProps {
  onSubmit: (prompt: string) => void;
}

export function Chat({ onSubmit }: ChatProps) {
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const totalInputTokens = useChatStore((s) => s.totalInputTokens);
  const totalOutputTokens = useChatStore((s) => s.totalOutputTokens);
  const errorMessage = useChatStore((s) => s.errorMessage);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = (text: string) => {
    if (!activeNotebookId) return;
    onSubmit(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* status bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--sp-2) var(--sp-5)",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: status === "running" ? "var(--accent)" : "var(--border-active)",
                animation: status === "running" ? "pulse 1.5s ease infinite" : "none",
              }}
            />
            <Text variant="xs" mono secondary>
              {status === "running" ? "researching" : "idle"}
            </Text>
          </div>
          {errorMessage && (
            <Text variant="xs" style={{ color: "var(--error)" }}>
              {errorMessage}
            </Text>
          )}
        </div>
        {totalInputTokens + totalOutputTokens > 0 && (
          <Text variant="xs" muted mono>
            {totalInputTokens.toLocaleString()}in / {totalOutputTokens.toLocaleString()}out
          </Text>
        )}
      </div>

      {/* message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ padding: "var(--sp-6) var(--sp-8)" }}
      >
        {messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full"
            style={{ opacity: 0.6 }}
          >
            <Text variant="2xl" serif style={{ fontStyle: "italic", color: "var(--text)" }}>
              Fisherman 🐟︎
            </Text>
            <div style={{ marginTop: "var(--sp-2)" }}>
              <Text variant="sm" secondary>Deep research agent</Text>
            </div>
            <div
              style={{
                marginTop: "var(--sp-8)",
                padding: "var(--sp-4) var(--sp-6)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface)",
              }}
            >
              <Text variant="sm" muted>
                {activeNotebookId
                  ? "Add sources to the left, then ask questions here"
                  : "Create or select a notebook to start"}
              </Text>
            </div>
          </div>
        ) : (
          groupMessages(messages).map((item) =>
            item.kind === "toolGroup" ? (
              <ToolCallGroup key={item.id} messages={item.messages} />
            ) : (
              <Message key={item.message.id} message={item.message} />
            )
          )
        )}
      </div>

      {/* input */}
      <Input
        onSubmit={handleSubmit}
        disabled={status === "running" || !activeNotebookId}
      />
    </div>
  );
}
