import React, { useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { MessageList } from "./MessageList.js";
import { InputBox, Spinner } from "./InputBox.js";
import { StatusBar } from "./StatusBar.js";
import { ModelPicker } from "./ModelPicker.js";
import { SlashCommandMenu, SLASH_COMMANDS } from "./SlashCommandMenu.js";
import { useAppReducer } from "./hooks/useAppReducer.js";
import { useAgentRunner } from "./hooks/useAgentRunner.js";
import { parseSlashCommand, handleSlashCommand } from "../slash-commands.js";
import { createSession } from "../session.js";
import type { ModelId } from "@2na3k/omfsh-provider";

interface AppProps {
  modelId?: ModelId;
}

export function App({ modelId }: AppProps) {
  const { exit } = useApp();
  const slashConsumed = useRef(false);

  const [state, dispatch] = useAppReducer({
    session: createSession({ modelId }),
    status: { kind: "idle" },
    inputText: "",
    pendingPrompt: null,
    showModelPicker: false,
    slashMenuIndex: -1,
    streamingMessageId: null,
    streamingReasoningId: null,
  });

  useAgentRunner(state, dispatch);

  const isRunning = state.status.kind === "running";
  const slashFilter = state.inputText.startsWith("/") ? state.inputText.split(/\s/)[0] : "";
  const slashCommands = SLASH_COMMANDS.filter((cmd) => cmd.command.startsWith(slashFilter) || slashFilter === "/");
  const showSlashMenu = !isRunning && state.inputText.startsWith("/") && slashCommands.length > 0;

  useInput((_input, key) => {
    if (key.ctrl && _input === "c") {
      if (state.status.kind === "running") {
        state.status.abortController.abort();
        dispatch({ type: "SET_STATUS", status: { kind: "idle" } });
      } else {
        exit();
      }
      return;
    }

    if (!showSlashMenu) return;

    if (key.upArrow) {
      const next = state.slashMenuIndex <= 0 ? slashCommands.length - 1 : state.slashMenuIndex - 1;
      dispatch({ type: "SLASH_MENU_NAVIGATE", index: next });
    } else if (key.downArrow) {
      const next = state.slashMenuIndex >= slashCommands.length - 1 ? 0 : state.slashMenuIndex + 1;
      dispatch({ type: "SLASH_MENU_NAVIGATE", index: next });
    } else if (key.return) {
      slashConsumed.current = true;
      const selected = slashCommands[state.slashMenuIndex]?.command;
      if (selected) {
        const cmd = parseSlashCommand(selected);
        const effect = handleSlashCommand(cmd);
        dispatch({ type: "SLASH_EFFECT", effect });
        dispatch({ type: "INPUT_CHANGE", text: "" });
      }
      setTimeout(() => { slashConsumed.current = false; }, 0);
    } else if (key.tab) {
      const selected = slashCommands[state.slashMenuIndex]?.command;
      if (selected) {
        dispatch({ type: "INPUT_CHANGE", text: selected + " " });
      }
    }
  });

  function handleSubmit(text: string) {
    if (slashConsumed.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("/")) {
      const cmd = parseSlashCommand(trimmed);
      const effect = handleSlashCommand(cmd);
      dispatch({ type: "SLASH_EFFECT", effect });
      dispatch({ type: "INPUT_CHANGE", text: "" });
    } else {
      dispatch({ type: "SUBMIT_PROMPT", text: trimmed, abortController: new AbortController() });
    }
  }

  return (
    <Box flexDirection="column" height="100%">
      <MessageList messages={state.session.messages} />
      {state.showModelPicker ? (
        <ModelPicker
          currentModelId={state.session.modelId}
          onSelect={(id) => dispatch({ type: "SELECT_MODEL", modelId: id })}
          onCancel={() => dispatch({ type: "TOGGLE_MODEL_PICKER", show: false })}
        />
      ) : (
        <>
          {isRunning && (
            <Box paddingLeft={1}>
              <Spinner /><Text> running...</Text>
            </Box>
          )}
          <InputBox
            value={state.inputText}
            onChange={(text) => dispatch({ type: "INPUT_CHANGE", text })}
            onSubmit={handleSubmit}
            disabled={isRunning}
          />
          {showSlashMenu && (
            <SlashCommandMenu
              filter={slashFilter}
              selectedIndex={state.slashMenuIndex}
              onSelect={(cmd) => {
                dispatch({ type: "INPUT_CHANGE", text: cmd });
              }}
              onNavigate={(index) => dispatch({ type: "SLASH_MENU_NAVIGATE", index })}
            />
          )}
        </>
      )}
      <StatusBar session={state.session} />
    </Box>
  );
}
