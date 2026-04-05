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
          width: "8px",
          height: "15px",
          background: "var(--accent)",
          marginLeft: "2px",
          verticalAlign: "text-bottom",
          animation: "blink 1s step-end infinite",
        }}
      />
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </span>
  );
}
