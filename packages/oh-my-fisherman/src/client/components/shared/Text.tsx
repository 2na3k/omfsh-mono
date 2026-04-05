import type { CSSProperties, ReactNode } from "react";

type TextVariant = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
type TextWeight = "normal" | "medium" | "semibold" | "bold";

interface TextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  muted?: boolean;
  secondary?: boolean;
  accent?: boolean;
  serif?: boolean;
  mono?: boolean;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "label" | "div";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const SIZE_MAP: Record<TextVariant, string> = {
  xs: "var(--text-xs)",
  sm: "var(--text-sm)",
  base: "var(--text-base)",
  lg: "var(--text-lg)",
  xl: "var(--text-xl)",
  "2xl": "var(--text-2xl)",
};

const WEIGHT_MAP: Record<TextWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export function Text({
  variant = "base",
  weight = "normal",
  muted = false,
  secondary = false,
  accent = false,
  serif = false,
  mono = false,
  as: Tag = "span",
  className = "",
  style,
  children,
}: TextProps) {
  const color = accent
    ? "var(--accent)"
    : muted
      ? "var(--text-muted)"
      : secondary
        ? "var(--text-secondary)"
        : "var(--text)";

  const fontFamily = serif
    ? "var(--font-serif)"
    : mono
      ? "var(--font-mono)"
      : undefined;

  return (
    <Tag
      className={className}
      style={{
        fontSize: SIZE_MAP[variant],
        fontWeight: WEIGHT_MAP[weight],
        fontFamily,
        color,
        lineHeight: serif ? 1.3 : 1.6,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
