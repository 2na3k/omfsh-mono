import React from "react";
import { Box, Text } from "ink";
import { ToolCallItem } from "./ToolCallItem.js";
import type { UiMessage } from "../types.js";

interface MessageItemProps {
  message: UiMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  if (message.role === "tool") {
    return <ToolCallItem message={message} />;
  }

  const { role, text, isStreaming } = message;

  let prefix: string;
  let color: string;

  switch (role) {
    case "user":
      prefix = "You";
      color = "cyan";
      break;
    case "assistant":
      prefix = "Agent";
      color = "green";
      break;
    case "reasoning":
      prefix = "Thinking";
      color = "magenta";
      break;
    case "system":
      prefix = "System";
      color = "gray";
      break;
    default:
      prefix = role;
      color = "white";
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={color as Parameters<typeof Text>[0]["color"]} bold>{prefix}: </Text>
        <Text>{text ?? ""}{isStreaming ? "▌" : ""}</Text>
      </Box>
    </Box>
  );
}
