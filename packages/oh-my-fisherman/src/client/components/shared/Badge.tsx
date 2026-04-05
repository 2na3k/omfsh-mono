import type { ReactNode } from "react";

interface BadgeProps {
  variant?: "default" | "accent" | "muted";
  children: ReactNode;
}

const COLORS = {
  default: { border: "var(--border-active)", color: "var(--text-secondary)" },
  accent: { border: "var(--accent)", color: "var(--accent)" },
  muted: { border: "var(--border)", color: "var(--text-muted)" },
} as const;

export function Badge({ variant = "default", children }: BadgeProps) {
  const { border, color } = COLORS[variant];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "var(--text-xs)",
        padding: "1px 6px",
        border: `1px solid ${border}`,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        fontWeight: 500,
        lineHeight: 1.6,
      }}
    >
      {children}
    </span>
  );
}
