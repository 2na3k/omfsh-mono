import { useReducer } from "react";
import { AgentEventType } from "@2na3k/omfsh-darwin";
import type { LoopYield } from "@2na3k/omfsh-darwin";
import {
  appendUiMessage,
  patchUiMessage,
  updateTokenCounts,
  syncContext,
  clearSession,
  setModel,
} from "../../session.js";
import type { Session, AppStatus, SlashEffect, UiMessage } from "../../types.js";
import type { ModelId } from "@2na3k/omfsh-provider";

export interface AppState {
  session: Session;
  status: AppStatus;
  inputText: string;
  pendingPrompt: string | null;
  showModelPicker: boolean;
  slashMenuIndex: number;
  streamingMessageId: string | null;
  streamingReasoningId: string | null;
}

export type AppAction =
  | { type: "SUBMIT_PROMPT"; text: string; abortController: AbortController }
  | { type: "AGENT_EVENT"; event: LoopYield }
  | { type: "SLASH_EFFECT"; effect: SlashEffect }
  | { type: "SET_STATUS"; status: AppStatus }
  | { type: "INPUT_CHANGE"; text: string }
  | { type: "SLASH_MENU_NAVIGATE"; index: number }
  | { type: "TOGGLE_MODEL_PICKER"; show: boolean }
  | { type: "SELECT_MODEL"; modelId: ModelId };

function applyAgentEvent(state: AppState, event: LoopYield): AppState {
  switch (event.event) {
    case AgentEventType.MessageStart: {
      const id = crypto.randomUUID();
      const msg: UiMessage = { id, role: "assistant", text: "", isStreaming: true };
      return { ...state, streamingMessageId: id, session: appendUiMessage(state.session, msg) };
    }
    case AgentEventType.MessageDelta: {
      if (!state.streamingMessageId) return state;
      const current = state.session.messages.find((m) => m.id === state.streamingMessageId);
      return {
        ...state,
        session: patchUiMessage(state.session, state.streamingMessageId, {
          text: (current?.text ?? "") + event.delta,
        }),
      };
    }
    case AgentEventType.MessageEnd: {
      if (!state.streamingMessageId) return state;
      const id = state.streamingMessageId;
      return {
        ...state,
        streamingMessageId: null,
        session: patchUiMessage(state.session, id, { isStreaming: false }),
      };
    }
    case AgentEventType.ReasoningStart: {
      const id = crypto.randomUUID();
      const msg: UiMessage = { id, role: "reasoning", text: "", isStreaming: true };
      return { ...state, streamingReasoningId: id, session: appendUiMessage(state.session, msg) };
    }
    case AgentEventType.ReasoningDelta: {
      if (!state.streamingReasoningId) return state;
      const current = state.session.messages.find((m) => m.id === state.streamingReasoningId);
      return {
        ...state,
        session: patchUiMessage(state.session, state.streamingReasoningId, {
          text: (current?.text ?? "") + event.delta,
        }),
      };
    }
    case AgentEventType.ReasoningEnd: {
      if (!state.streamingReasoningId) return state;
      const id = state.streamingReasoningId;
      return {
        ...state,
        streamingReasoningId: null,
        session: patchUiMessage(state.session, id, { isStreaming: false }),
      };
    }
    case AgentEventType.ToolCallStart: {
      const msg: UiMessage = {
        id: event.toolCallId,
        role: "tool",
        toolName: event.toolName,
        isStreaming: true,
      };
      return { ...state, session: appendUiMessage(state.session, msg) };
    }
    case AgentEventType.ToolCallEnd: {
      return {
        ...state,
        session: patchUiMessage(state.session, event.toolCallId, {
          toolInput: event.input,
          toolOutput: event.output,
          isStreaming: false,
        }),
      };
    }
    case AgentEventType.TurnEnd: {
      const s = updateTokenCounts(state.session, event.step.inputTokens, event.step.outputTokens);
      return { ...state, session: syncContext(s, event.state.context) };
    }
    case AgentEventType.AgentEnd: {
      return { ...state, status: { kind: "idle" }, pendingPrompt: null };
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
