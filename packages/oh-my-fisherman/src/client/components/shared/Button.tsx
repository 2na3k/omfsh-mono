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
    background: "transparent",
  },
  accent: {
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    background: "transparent",
  },
  ghost: {
    border: "1px solid transparent",
    color: "var(--text-secondary)",
    background: "transparent",
  },
} as const;

const SIZE_STYLES = {
  sm: { padding: "var(--sp-1) var(--sp-3)", fontSize: "var(--text-xs)" },
  md: { padding: "var(--sp-2) var(--sp-4)", fontSize: "var(--text-sm)" },
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
      className={`uppercase tracking-wider ${className}`}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        letterSpacing: "0.05em",
        fontWeight: 500,
        cursor: "pointer",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
