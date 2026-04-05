import { runAgentLoop } from "@2na3k/omfsh-darwin";
import { AgentEventType } from "@2na3k/omfsh-darwin";
import type { LoopYield, AgentContext } from "@2na3k/omfsh-darwin";
import type { ModelId } from "@2na3k/omfsh-provider";
import { buildToolMap } from "../tools/index.js";
import { buildResearchPrompt } from "../prompts/research-system.js";
import { getSourceSummaries } from "./source-ingest.js";
import { getMessages, saveMessage, touchNotebook, reportPath } from "../db.js";
import { readFileSync, existsSync } from "fs";
import type { ServerMessage, SerializedAgentEvent, Entity, Relation } from "../../shared/types.js";

const MAX_STEPS = 15;
const DEFAULT_MODEL: ModelId = "claude-sonnet-4-6";

// active research sessions, keyed by notebookId
const activeSessions = new Map<string, AbortController>();

function serializeEvent(y: LoopYield): SerializedAgentEvent {
  switch (y.event) {
    case AgentEventType.AgentStart:     return { event: "agent.start" };
    case AgentEventType.AgentEnd:       return { event: "agent.end" };
    case AgentEventType.TurnStart:      return { event: "turn.start" };
    case AgentEventType.TurnEnd:        return { event: "turn.end", inputTokens: y.step.inputTokens, outputTokens: y.step.outputTokens };
    case AgentEventType.MessageStart:   return { event: "message.start" };
    case AgentEventType.MessageDelta:   return { event: "message.delta", delta: y.delta };
    case AgentEventType.MessageEnd:     return { event: "message.end" };
    case AgentEventType.ReasoningStart: return { event: "reasoning.start" };
    case AgentEventType.ReasoningDelta: return { event: "reasoning.delta", delta: y.delta };
    case AgentEventType.ReasoningEnd:   return { event: "reasoning.end" };
    case AgentEventType.ToolCallStart:  return { event: "tool_call.start", toolCallId: y.toolCallId, toolName: y.toolName };
    case AgentEventType.ToolCallDelta:  return { event: "tool_call.delta", toolCallId: y.toolCallId, delta: y.delta };
    case AgentEventType.ToolCallEnd:    return { event: "tool_call.end", toolCallId: y.toolCallId, toolName: y.toolName, input: y.input, output: y.output };
  }
}

export async function runResearch(
  notebookId: string,
  prompt: string,
  send: (msg: ServerMessage) => void,
  modelId?: string,
): Promise<void> {
  // cancel existing session if running
  cancelResearch(notebookId);

  const ac = new AbortController();
  activeSessions.set(notebookId, ac);

  const resolvedModel = (modelId ?? DEFAULT_MODEL) as ModelId;

  const sourceSummaries = getSourceSummaries(notebookId);
  const systemPrompt = buildResearchPrompt(sourceSummaries);
  const history = getMessages(notebookId);

  const tools = buildToolMap({
    notebookId,
    modelId: resolvedModel,
    onEntityExtracted: (entities: Entity[], relations: Relation[]) => {
      send({ type: "entity.extracted", notebookId, entities, relations });
    },
  });

  const context: AgentContext = {
    systemPrompt,
    messages: history,
    tools,
  };

  // save user message
  saveMessage(notebookId, "user", prompt);

  const gen = runAgentLoop(prompt, { modelId: resolvedModel, maxSteps: MAX_STEPS, stream: true }, context);

  let _lastAssistantText = "";

  console.log(`[agent] starting research for notebook=${notebookId} model=${resolvedModel}`);

  try {
    for await (const y of gen) {
      if (ac.signal.aborted) break;

      const serialized = serializeEvent(y);
      console.log(`[agent] event: ${serialized.event}${"toolName" in serialized ? ` (${serialized.toolName})` : ""}`);
      send({ type: "agent.event", notebookId, event: serialized });

      // track assistant text for persistence
      if (y.event === AgentEventType.MessageDelta) {
        _lastAssistantText += y.delta;
      }

      // when note_write runs, push report update
      if (y.event === AgentEventType.ToolCallEnd && y.toolName === "note_write") {
        const rPath = reportPath(notebookId);
        if (existsSync(rPath)) {
          const markdown = readFileSync(rPath, "utf-8");
          send({ type: "report.updated", notebookId, markdown });
        }
      }

      // persist context on turn end
      if (y.event === AgentEventType.TurnEnd) {
        // save assistant messages from this turn
        for (const msg of y.step.responseMessages) {
          if (msg.role === "assistant") {
            saveMessage(notebookId, "assistant", JSON.stringify(msg.content));
          } else if (msg.role === "tool") {
            saveMessage(notebookId, "tool", JSON.stringify(msg.content));
          }
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[agent] error:`, err);
    send({ type: "error", message });
  } finally {
    console.log(`[agent] research ended for notebook=${notebookId}`);
    activeSessions.delete(notebookId);
    touchNotebook(notebookId);
  }
}

export function cancelResearch(notebookId: string) {
  const existing = activeSessions.get(notebookId);
  if (existing) {
    existing.abort();
    activeSessions.delete(notebookId);
  }
}

export function isResearchActive(notebookId: string): boolean {
  return activeSessions.has(notebookId);
}
