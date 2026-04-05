import React from "react";
import { Box, Text } from "ink";
import { MODELS } from "@2na3k/omfsh-provider";
import type { Session } from "../types.js";

interface StatusBarProps {
  session: Session;
}

export function StatusBar({ session }: StatusBarProps) {
  const { modelId, totalInputTokens, totalOutputTokens } = session;
  const def = MODELS[modelId];
  const contextWindow = def.contextWindow;

  const ctxLabel = `ctx: ${totalInputTokens.toLocaleString()} / ${contextWindow.toLocaleString()} · out: ${totalOutputTokens.toLocaleString()}`;
  const providerLabel = `${def.provider} · ${modelId}`;

  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Box flexGrow={1}>
        <Text dimColor>{ctxLabel}</Text>
      </Box>
      <Box>
        <Text dimColor>{providerLabel}</Text>
      </Box>
    </Box>
  );
}
