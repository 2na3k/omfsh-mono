import React from "react";
import { Box, Text } from "ink";

export interface SlashCommandDef {
  command: string;
  description: string;
}

export const SLASH_COMMANDS: SlashCommandDef[] = [
  { command: "/model", description: "List or set a model" },
  { command: "/clear", description: "Clear the session" },
  { command: "/exit", description: "Exit the application" },
];

interface SlashCommandMenuProps {
  filter: string;
  selectedIndex: number;
  onSelect: (command: string) => void;
  onNavigate: (index: number) => void;
}

export function SlashCommandMenu({ filter, selectedIndex, onSelect: _onSelect, onNavigate: _onNavigate }: SlashCommandMenuProps) {
  const filtered = SLASH_COMMANDS.filter((cmd) => cmd.command.startsWith(filter) || filter === "/");

  if (filtered.length === 0) return null;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan">
      {filtered.map((cmd, index) => (
        <Box key={cmd.command}>
          <Text color={index === selectedIndex ? "cyan" : undefined}>
            {index === selectedIndex ? "> " : "  "}
            <Text bold>{cmd.command}</Text>
          </Text>
          <Text dimColor> — {cmd.description}</Text>
        </Box>
      ))}
    </Box>
  );
}
