import React from "react";
import { Box, Text } from "ink";
import type { UiMessage } from "../types.js";

const TRUNCATE_LEN = 200;

function truncate(val: unknown): string {
  const s = typeof val === "string" ? val : JSON.stringify(val) ?? "";
  if (s.length <= TRUNCATE_LEN) return s;
  const remaining = s.length - TRUNCATE_LEN;
  return s.slice(0, TRUNCATE_LEN) + `... (${remaining} more chars)`;
}

interface ToolCallItemProps {
  message: UiMessage;
}

export function ToolCallItem({ message }: ToolCallItemProps) {
  const { toolName, toolInput, toolOutput, isStreaming } = message;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color="yellow" bold>tool: </Text>
        <Text color="yellow">{toolName ?? "unknown"}</Text>
        {isStreaming && <Text dimColor> (running...)</Text>}
      </Box>
      {toolInput != null && (
        <Box marginLeft={2}>
          <Text dimColor>in: </Text>
          <Text>{truncate(toolInput)}</Text>
        </Box>
      )}
      {toolOutput != null && (
        <Box marginLeft={2}>
          <Text dimColor>out: </Text>
          <Text>{truncate(toolOutput)}</Text>
        </Box>
      )}
    </Box>
  );
}
