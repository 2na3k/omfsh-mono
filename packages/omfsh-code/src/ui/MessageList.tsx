import React from "react";
import { Static, Box } from "ink";
import { MessageItem } from "./MessageItem.js";
import type { UiMessage } from "../types.js";

interface MessageListProps {
  messages: UiMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const committed = messages.filter((m) => !m.isStreaming);
  const streaming = messages.find((m) => m.isStreaming);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Static items={committed}>
        {(msg) => <MessageItem key={msg.id} message={msg} />}
      </Static>
      {streaming && <MessageItem message={streaming} />}
    </Box>
  );
}
