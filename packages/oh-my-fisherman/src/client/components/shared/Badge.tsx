import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "default" | "accent" | "muted";
  children: ReactNode;
}

const STYLES = {
  default: {
    background: "var(--surface-raised)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  },
  accent: {
    background: "var(--accent-subtle)",
    color: "var(--accent)",
    border: "1px solid var(--accent)",
  },
  muted: {
    background: "var(--surface)",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
  },
} as const;

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "var(--text-xs)",
        padding: "1px 8px",
        borderRadius: "var(--radius-sm)",
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        lineHeight: 1.6,
        letterSpacing: "0.02em",
        ...STYLES[variant],
      }}
    >
      {children}
    </span>
  );
}
