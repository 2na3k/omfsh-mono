import { useReducer } from "react";
import {
  appendUiMessage,
  patchUiMessage,
  updateTokenCounts,
  syncContext,
  clearSession,
  setModel,
} from "../../session.js";
import type { Session, AppStatus, AgentRunnerEvent, SlashEffect, UiMessage } from "../../types.js";
import type { ModelId } from "@2na3k/omfsh-provider";

export interface AppState {
  session: Session;
  status: AppStatus;
  inputText: string;
  pendingPrompt: string | null;
  showModelPicker: boolean;
  slashMenuIndex: number;
}

export type AppAction =
  | { type: "SUBMIT_PROMPT"; text: string; abortController: AbortController }
  | { type: "AGENT_EVENT"; event: AgentRunnerEvent }
  | { type: "SLASH_EFFECT"; effect: SlashEffect }
  | { type: "SET_STATUS"; status: AppStatus }
  | { type: "INPUT_CHANGE"; text: string }
  | { type: "SLASH_MENU_NAVIGATE"; index: number }
  | { type: "TOGGLE_MODEL_PICKER"; show: boolean }
  | { type: "SELECT_MODEL"; modelId: ModelId };

function applyAgentEvent(state: AppState, event: AgentRunnerEvent): AppState {
  switch (event.type) {
    case "message_start": {
      const msg: UiMessage = { id: event.messageId, role: "assistant", text: "", isStreaming: true };
      return { ...state, session: appendUiMessage(state.session, msg) };
    }
    case "message_delta": {
      const current = state.session.messages.find((m) => m.id === event.messageId);
      return {
        ...state,
        session: patchUiMessage(state.session, event.messageId, { text: (current?.text ?? "") + event.delta }),
      };
    }
    case "message_end": {
      return { ...state, session: patchUiMessage(state.session, event.messageId, { isStreaming: false }) };
    }
    case "reasoning_start": {
      const msg: UiMessage = { id: event.messageId, role: "reasoning", text: "", isStreaming: true };
      return { ...state, session: appendUiMessage(state.session, msg) };
    }
    case "reasoning_delta": {
      const current = state.session.messages.find((m) => m.id === event.messageId);
      return {
        ...state,
        session: patchUiMessage(state.session, event.messageId, { text: (current?.text ?? "") + event.delta }),
      };
    }
    case "reasoning_end": {
      return { ...state, session: patchUiMessage(state.session, event.messageId, { isStreaming: false }) };
    }
    case "tool_start": {
      const msg: UiMessage = {
        id: event.messageId,
        role: "tool",
        toolName: event.toolName,
        isStreaming: true,
      };
      return { ...state, session: appendUiMessage(state.session, msg) };
    }
    case "tool_end": {
      // Find the tool message by matching toolName; the messageId was stored on tool_start
      // We need to find by toolCallId-associated messageId — stored in agent-runner, not here.
      // We match by the last streaming tool message with no output yet.
      const toolMsg = [...state.session.messages].reverse().find(
        (m) => m.role === "tool" && m.isStreaming && m.toolOutput == null,
      );
      if (!toolMsg) return state;
      return {
        ...state,
        session: patchUiMessage(state.session, toolMsg.id, {
          toolInput: event.input,
          toolOutput: event.output,
          isStreaming: false,
        }),
      };
    }
    case "turn_end": {
      const s = updateTokenCounts(state.session, event.inputTokens, event.outputTokens);
      return { ...state, session: syncContext(s, event.context) };
    }
    case "agent_end": {
      return { ...state, status: { kind: "idle" }, pendingPrompt: null };
    }
    case "error": {
      return { ...state, status: { kind: "error", message: event.message }, pendingPrompt: null };
    }
    default:
      return state;
  }
}

function applySlashEffect(state: AppState, effect: SlashEffect): AppState {
  switch (effect.kind) {
    case "add_message":
      return { ...state, session: appendUiMessage(state.session, effect.message) };
    case "set_model":
      return { ...state, session: setModel(state.session, effect.modelId) };
    case "clear":
      return { ...state, session: clearSession(state.session) };
    case "open_model_picker":
      return { ...state, showModelPicker: true };
    default:
      return state;
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SUBMIT_PROMPT": {
      const userMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: action.text,
        isStreaming: false,
      };
      return {
        ...state,
        session: appendUiMessage(state.session, userMsg),
        status: { kind: "running", abortController: action.abortController },
        inputText: "",
        pendingPrompt: action.text,
      };
    }
    case "AGENT_EVENT":
      return applyAgentEvent(state, action.event);
    case "SLASH_EFFECT":
      return applySlashEffect(state, action.effect);
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "INPUT_CHANGE": {
      const isSlash = action.text.startsWith("/");
      return {
        ...state,
        inputText: action.text,
        slashMenuIndex: isSlash ? 0 : -1,
      };
    }
    case "SLASH_MENU_NAVIGATE": {
      return { ...state, slashMenuIndex: action.index };
    }
    case "TOGGLE_MODEL_PICKER":
      return { ...state, showModelPicker: action.show };
    case "SELECT_MODEL": {
      return {
        ...state,
        session: setModel(state.session, action.modelId),
        showModelPicker: false,
      };
    }
    default:
      return state;
  }
}

export function useAppReducer(initialState: AppState) {
  return useReducer(appReducer, initialState);
}
