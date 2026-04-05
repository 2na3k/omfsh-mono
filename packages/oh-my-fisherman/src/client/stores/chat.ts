import { create } from "zustand";
import type { UiMessage, SerializedAgentEvent } from "../../shared/types.js";

type AgentStatus = "idle" | "running" | "error";

interface NotebookChat {
  messages: UiMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
}

interface ChatState {
  messages: UiMessage[];
  status: AgentStatus;
  modelId: string;
  activeNotebookId: string | null;
  streamingMessageId: string | null;
  streamingReasoningId: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  errorMessage: string | null;
  // per-notebook message cache
  cache: Map<string, NotebookChat>;

  submitUserMessage: (text: string) => void;
  applyAgentEvent: (event: SerializedAgentEvent) => void;
  setStatus: (status: AgentStatus) => void;
  setModelId: (modelId: string) => void;
  setError: (message: string | null) => void;
  switchNotebook: (notebookId: string | null) => void;
  setMessages: (messages: UiMessage[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  status: "idle",
  modelId: "claude-sonnet-4-6",
  activeNotebookId: null,
  streamingMessageId: null,
  streamingReasoningId: null,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  errorMessage: null,
  cache: new Map(),

  switchNotebook: (notebookId) =>
    set((s) => {
      const cache = new Map(s.cache);

      // save current notebook's messages to cache
      if (s.activeNotebookId) {
        cache.set(s.activeNotebookId, {
          messages: s.messages,
          totalInputTokens: s.totalInputTokens,
          totalOutputTokens: s.totalOutputTokens,
        });
      }

      // restore target notebook's messages from cache
      const restored = notebookId ? cache.get(notebookId) : undefined;

      return {
        cache,
        activeNotebookId: notebookId,
        messages: restored?.messages ?? [],
        totalInputTokens: restored?.totalInputTokens ?? 0,
        totalOutputTokens: restored?.totalOutputTokens ?? 0,
        streamingMessageId: null,
        streamingReasoningId: null,
        errorMessage: null,
      };
    }),

  submitUserMessage: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: crypto.randomUUID(), role: "user", text, isStreaming: false }],
      status: "running",
      errorMessage: null,
    })),

  applyAgentEvent: (event) =>
    set((s) => {
      switch (event.event) {
        case "agent.start": {
          return {
            ...s,
            messages: [...s.messages, { id: crypto.randomUUID(), role: "log", text: "research started", isStreaming: false }],
          };
        }
        case "turn.start": {
          return {
            ...s,
            messages: [...s.messages, { id: crypto.randomUUID(), role: "log", text: "thinking...", isStreaming: false }],
          };
        }
        case "message.start": {
          const id = crypto.randomUUID();
          return {
            ...s,
            streamingMessageId: id,
            messages: [...s.messages, { id, role: "assistant", text: "", isStreaming: true }],
          };
        }
        case "message.delta": {
          if (!s.streamingMessageId) return s;
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === s.streamingMessageId
                ? { ...m, text: (m.text ?? "") + event.delta }
                : m,
            ),
          };
        }
        case "message.end": {
          if (!s.streamingMessageId) return s;
          return {
            ...s,
            streamingMessageId: null,
            messages: s.messages.map((m) =>
              m.id === s.streamingMessageId ? { ...m, isStreaming: false } : m,
            ),
          };
        }
        case "reasoning.start": {
          const id = crypto.randomUUID();
          return {
            ...s,
            streamingReasoningId: id,
            messages: [...s.messages, { id, role: "reasoning", text: "", isStreaming: true }],
          };
        }
        case "reasoning.delta": {
          if (!s.streamingReasoningId) return s;
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === s.streamingReasoningId
                ? { ...m, text: (m.text ?? "") + event.delta }
                : m,
            ),
          };
        }
        case "reasoning.end": {
          if (!s.streamingReasoningId) return s;
          return {
            ...s,
            streamingReasoningId: null,
            messages: s.messages.map((m) =>
              m.id === s.streamingReasoningId ? { ...m, isStreaming: false } : m,
            ),
          };
        }
        case "tool_call.start": {
          return {
            ...s,
            messages: [...s.messages, {
              id: event.toolCallId,
              role: "tool",
              toolName: event.toolName,
              isStreaming: true,
            }],
          };
        }
        case "tool_call.end": {
          return {
            ...s,
            messages: s.messages.map((m) =>
              m.id === event.toolCallId
                ? { ...m, toolInput: event.input, toolOutput: event.output, isStreaming: false }
                : m,
            ),
          };
        }
        case "turn.end": {
          return {
            ...s,
            totalInputTokens: s.totalInputTokens + event.inputTokens,
            totalOutputTokens: s.totalOutputTokens + event.outputTokens,
          };
        }
        case "agent.end": {
          return {
            ...s,
            status: "idle",
            messages: [...s.messages, { id: crypto.randomUUID(), role: "log" as const, text: "research complete", isStreaming: false }],
          };
        }
        default:
          return s;
      }
    }),

  setStatus: (status) => set({ status }),
  setModelId: (modelId) => set({ modelId }),
  setError: (message) => set({ errorMessage: message, status: message ? "error" : "idle" }),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [], totalInputTokens: 0, totalOutputTokens: 0 }),
}));
