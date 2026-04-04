import { runAgentLoop, AgentEventType } from "@2na3k/omfsh-darwin";
import { TOOLS } from "./tools/index.js";
import { MAX_STEPS, SYSTEM_PROMPT } from "./constants.js";
import type { Session, AgentRunnerEvent } from "./types.js";

export async function runTurn(
  session: Session,
  prompt: string,
  onEvent: (e: AgentRunnerEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const context = {
    ...session.context,
    systemPrompt: session.context.systemPrompt ?? SYSTEM_PROMPT,
    tools: TOOLS,
  };

  const gen = runAgentLoop(
    prompt,
    { modelId: session.modelId, maxSteps: MAX_STEPS, stream: true },
    context,
  );

  let currentMessageId: string | null = null;
  let currentReasoningId: string | null = null;
  const toolMessageIds = new Map<string, string>();

  for await (const loopYield of gen) {
    if (signal.aborted) break;

    switch (loopYield.event) {
      case AgentEventType.MessageStart: {
        currentMessageId = crypto.randomUUID();
        onEvent({ type: "message_start", messageId: currentMessageId });
        break;
      }
      case AgentEventType.MessageDelta: {
        if (currentMessageId) {
          onEvent({ type: "message_delta", messageId: currentMessageId, delta: loopYield.delta });
        }
        break;
      }
      case AgentEventType.MessageEnd: {
        if (currentMessageId) {
          onEvent({ type: "message_end", messageId: currentMessageId });
          currentMessageId = null;
        }
        break;
      }
      case AgentEventType.ReasoningStart: {
        currentReasoningId = crypto.randomUUID();
        onEvent({ type: "reasoning_start", messageId: currentReasoningId });
        break;
      }
      case AgentEventType.ReasoningDelta: {
        if (currentReasoningId) {
          onEvent({ type: "reasoning_delta", messageId: currentReasoningId, delta: loopYield.delta });
        }
        break;
      }
      case AgentEventType.ReasoningEnd: {
        if (currentReasoningId) {
          onEvent({ type: "reasoning_end", messageId: currentReasoningId });
          currentReasoningId = null;
        }
        break;
      }
      case AgentEventType.ToolCallStart: {
        const msgId = crypto.randomUUID();
        toolMessageIds.set(loopYield.toolCallId, msgId);
        onEvent({ type: "tool_start", toolCallId: loopYield.toolCallId, toolName: loopYield.toolName, messageId: msgId });
        break;
      }
      case AgentEventType.ToolCallEnd: {
        onEvent({ type: "tool_end", toolCallId: loopYield.toolCallId, input: loopYield.input, output: loopYield.output });
        toolMessageIds.delete(loopYield.toolCallId);
        break;
      }
      case AgentEventType.TurnEnd: {
        onEvent({
          type: "turn_end",
          inputTokens: loopYield.step.inputTokens,
          outputTokens: loopYield.step.outputTokens,
          context: loopYield.state.context,
        });
        break;
      }
      case AgentEventType.AgentEnd: {
        onEvent({ type: "agent_end" });
        break;
      }
    }
  }
}
