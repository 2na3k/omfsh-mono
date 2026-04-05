import { useRef, useEffect } from "react";
import { useChatStore } from "../../stores/chat.js";
import { useNotebookStore } from "../../stores/notebook.js";
import { Text } from "../shared/Text.js";
import { Message } from "./Message.js";
import { Input } from "./Input.js";
import { ModelPicker } from "./ModelPicker.js";

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
        <div className="flex items-center gap-3">
          {totalInputTokens + totalOutputTokens > 0 && (
            <Text variant="xs" muted mono>
              {totalInputTokens.toLocaleString()}in / {totalOutputTokens.toLocaleString()}out
            </Text>
          )}
          <ModelPicker />
        </div>
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
              Fisherman
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
          messages.map((msg) => <Message key={msg.id} message={msg} />)
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
