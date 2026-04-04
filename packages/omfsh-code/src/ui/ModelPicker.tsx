import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { listModels, formatModelLabel } from "../model-registry.js";
import type { ModelId } from "@2na3k/omfsh-provider";

interface ModelPickerProps {
  currentModelId: ModelId;
  onSelect: (modelId: ModelId) => void;
  onCancel: () => void;
}

const models = listModels();

export function ModelPicker({ currentModelId, onSelect, onCancel }: ModelPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = models.indexOf(currentModelId);
    return idx >= 0 ? idx : 0;
  });

  useInput(
    useCallback(
      (input: string, key: { upArrow: boolean; downArrow: boolean; escape: boolean; return: boolean }) => {
        if (key.upArrow) {
          setSelectedIndex((i) => (i > 0 ? i - 1 : models.length - 1));
        } else if (key.downArrow) {
          setSelectedIndex((i) => (i < models.length - 1 ? i + 1 : 0));
        } else if (key.escape) {
          onCancel();
        } else if (key.return) {
          onSelect(models[selectedIndex]);
        }
      },
      [selectedIndex, onSelect, onCancel],
    ),
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        Select a model:
      </Text>
      <Box flexDirection="column">
        {models.map((id, i) => {
          const selected = i === selectedIndex;
          const isCurrent = id === currentModelId;
          return (
            <Box key={id}>
              <Text color={selected ? "green" : undefined}>
                {selected ? "▸ " : "  "}
              </Text>
              <Text bold={selected || isCurrent} color={selected ? "green" : isCurrent ? "yellow" : undefined}>
                {formatModelLabel(id)}
              </Text>
              {isCurrent && !selected && <Text color="yellow"> (current)</Text>}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate · enter select · esc cancel</Text>
      </Box>
    </Box>
  );
}
