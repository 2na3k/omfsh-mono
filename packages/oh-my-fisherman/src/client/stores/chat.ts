import { create } from "zustand";
import type { UiMessage, SerializedAgentEvent } from "../../shared/types.js";

type AgentStatus = "idle" | "running" | "error";

interface NotebookChat {
  messages: UiMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  contextTokens: number;
  executionTimeMs: number;
}

interface ChatState {
  messages: UiMessage[];
  status: AgentStatus;
  modelId: string;
  activeNotebookId: string | null;
  streamingMessageId: string | null;
  streamingReasoningId: string | null;
  checklistMessageId: string | null;
  pendingChecklistCallId: string | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  contextTokens: number;
  executionTimeMs: number;
  sessionStartTime: number | null;
  errorMessage: string | null;
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
  modelId: "llamacpp",
  activeNotebookId: null,
  streamingMessageId: null,
  streamingReasoningId: null,
  checklistMessageId: null,
  pendingChecklistCallId: null,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  contextTokens: 0,
  executionTimeMs: 0,
  sessionStartTime: null,
  errorMessage: null,
  cache: new Map(),

  switchNotebook: (notebookId) =>
    set((s) => {
      const cache = new Map(s.cache);

      if (s.activeNotebookId) {
        cache.set(s.activeNotebookId, {
          messages: s.messages,
          totalInputTokens: s.totalInputTokens,
          totalOutputTokens: s.totalOutputTokens,
          contextTokens: s.contextTokens,
          executionTimeMs: s.executionTimeMs,
        });
      }

      const restored = notebookId ? cache.get(notebookId) : undefined;

      return {
        cache,
        activeNotebookId: notebookId,
        messages: restored?.messages ?? [],
        totalInputTokens: restored?.totalInputTokens ?? 0,
        totalOutputTokens: restored?.totalOutputTokens ?? 0,
        contextTokens: restored?.contextTokens ?? 0,
        executionTimeMs: restored?.executionTimeMs ?? 0,
        streamingMessageId: null,
        streamingReasoningId: null,
        checklistMessageId: null,
        pendingChecklistCallId: null,
        sessionStartTime: null,
        errorMessage: null,
      };
    }),

  submitUserMessage: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: crypto.randomUUID(), role: "user", text, isStreaming: false }],
      status: "running",
      errorMessage: null,
      sessionStartTime: Date.now(),
      totalInputTokens: 0,
      totalOutputTokens: 0,
      contextTokens: 0,
      executionTimeMs: 0,
    })),

  applyAgentEvent: (event) =>
    set((s) => {
      switch (event.event) {
        case "agent.start": {
          return { ...s, checklistMessageId: null, pendingChecklistCallId: null };
        }
        case "turn.start": {
          return s;
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
          if (event.toolName === "research_plan") {
            if (!s.checklistMessageId) {
              // First call — create the checklist message
              return {
                ...s,
                checklistMessageId: event.toolCallId,
                messages: [...s.messages, {
                  id: event.toolCallId,
                  role: "tool" as const,
                  toolName: event.toolName,
                  isStreaming: true,
                }],
              };
            }
            // Subsequent call — track id but don't append a new message
            return { ...s, pendingChecklistCallId: event.toolCallId };
          }
          return {
            ...s,
            messages: [...s.messages, {
              id: event.toolCallId,
              role: "tool" as const,
              toolName: event.toolName,
              isStreaming: true,
            }],
          };
        }
        case "tool_call.end": {
          if (event.toolName === "research_plan" && s.checklistMessageId) {
            return {
              ...s,
              pendingChecklistCallId: null,
              messages: s.messages.map((m) =>
                m.id === s.checklistMessageId
                  ? { ...m, toolInput: event.input, toolOutput: event.output, isStreaming: false }
                  : m,
              ),
            };
          }
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
          const elapsed = s.sessionStartTime ? Date.now() - s.sessionStartTime : 0;
          return {
            ...s,
            status: "idle",
            sessionStartTime: null,
            executionTimeMs: elapsed,
            contextTokens: s.totalInputTokens + s.totalOutputTokens,
          };
        }
        default:
          return s;
      }
    }),

  setStatus: (status) => set({ status }),
  setModelId: (modelId) => set({ modelId }),
  setError: (message) =>
    set((s) => ({
      errorMessage: message,
      status: message ? "error" : "idle",
      messages: message
        ? [...s.messages, { id: crypto.randomUUID(), role: "error" as const, text: message, isStreaming: false }]
        : s.messages,
    })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [], totalInputTokens: 0, totalOutputTokens: 0 }),
}));
