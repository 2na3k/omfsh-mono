import type { UiMessage } from "../../../shared/types.js";
import type { ResearchPlanTask } from "../../../shared/types.js";
import { Text } from "../shared/Text.js";

interface ChecklistCardProps {
  message: UiMessage;
}

function isResearchPlanInput(v: unknown): v is { tasks: ResearchPlanTask[] } {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj.tasks)) return false;
  return obj.tasks.every(
    (t) =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as Record<string, unknown>).task === "string" &&
      ((t as Record<string, unknown>).status === "pending" ||
        (t as Record<string, unknown>).status === "done"),
  );
}

export function ChecklistCard({ message }: ChecklistCardProps) {
  const input = message.toolInput;
  if (!isResearchPlanInput(input)) return null;

  const { tasks } = input;
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;

  return (
    <div
      style={{
        margin: "var(--sp-3) 0",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-raised)",
        overflow: "hidden",
        animation: "fadeIn 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <Text variant="xs" mono style={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
          Research Plan
        </Text>
        <Text variant="xs" mono style={{ color: done === total ? "var(--accent)" : "var(--text-secondary)" }}>
          {done}/{total}
          {message.isStreaming && (
            <span style={{ marginLeft: 6, color: "var(--text-muted)" }}>updating…</span>
          )}
        </Text>
      </div>

      {/* Task list */}
      <ul style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
        {tasks.map((t, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "5px 12px",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: t.status === "done" ? "var(--accent)" : "var(--text-muted)",
                marginTop: 1,
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
              }}
            >
              {t.status === "done" ? "✓" : "○"}
            </span>
            <Text
              variant="xs"
              secondary
              style={{
                opacity: t.status === "done" ? 0.45 : 1,
                textDecoration: t.status === "done" ? "line-through" : "none",
                transition: "opacity 0.2s ease",
              }}
            >
              {t.task}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
