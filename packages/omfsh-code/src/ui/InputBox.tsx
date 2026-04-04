import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

const SPINNER_FRAMES = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

function Spinner() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return <Text>{SPINNER_FRAMES[frame]}</Text>;
}

interface InputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled: boolean;
}

export function InputBox({ value, onChange, onSubmit, disabled }: InputBoxProps) {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Text color="cyan">&gt; </Text>
      {disabled ? (
        <Text dimColor>
          <Spinner /> running...
        </Text>
      ) : (
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      )}
    </Box>
  );
}
