interface KbdProps {
  children: string;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd
      style={{
        display: "inline-block",
        fontSize: "var(--text-xs)",
        padding: "1px 6px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        lineHeight: 1.4,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </kbd>
  );
}
