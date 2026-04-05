interface KbdProps {
  children: string;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd
      style={{
        display: "inline-block",
        fontSize: "var(--text-xs)",
        padding: "1px 5px",
        border: "1px solid var(--border-active)",
        background: "var(--surface-raised)",
        color: "var(--text-secondary)",
        fontFamily: "inherit",
        lineHeight: 1.4,
      }}
    >
      {children}
    </kbd>
  );
}
