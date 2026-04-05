import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "accent" | "ghost";
  size?: "sm" | "md";
  children: ReactNode;
}

const VARIANT_STYLES = {
  default: {
    border: "1px solid var(--border-active)",
    color: "var(--text)",
    background: "var(--surface)",
  },
  accent: {
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    background: "var(--accent-subtle)",
  },
  ghost: {
    border: "1px solid transparent",
    color: "var(--text-secondary)",
    background: "transparent",
  },
} as const;

const SIZE_STYLES = {
  sm: { padding: "2px 8px", fontSize: "var(--text-xs)" },
  md: { padding: "6px 14px", fontSize: "var(--text-sm)" },
} as const;

export function Button({
  variant = "default",
  size = "md",
  children,
  className = "",
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`transition-colors ${className}`}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        fontWeight: 500,
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
