import { Text } from "../shared/Text.js";

interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps) {
  return (
    <span>
      <Text variant="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {text}
      </Text>
      <span
        style={{
          display: "inline-block",
          width: "2px",
          height: "14px",
          background: "var(--accent)",
          marginLeft: "2px",
          verticalAlign: "text-bottom",
          animation: "blink 1s step-end infinite",
          borderRadius: 1,
        }}
      />
    </span>
  );
}
