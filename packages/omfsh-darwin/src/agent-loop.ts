import { generate, streamGenerate, executeToolsParallel, buildToolMessage } from "@2na3k/omfsh-provider";
import type { Message, AssistantMessage } from "@2na3k/omfsh-provider";
import { buildContext, appendStep } from "./proxy.js";
import { AgentEventType } from "./types.js";
import type { AgentConfig, AgentContext, AgentState, LoopYield, StepResult } from "./types.js";

// Detect unresolved tool calls in a message list and return synthetic tool
// results that plug the gap, so the next LLM call never sees a broken history.
function repairUnresolvedToolCalls(messages: Message[]): Message[] {
  const pending = new Map<string, string>(); // toolCallId → toolName

  for (const msg of messages) {
    if (msg.role === "assistant") {
      for (const part of msg.content) {
        if (part.type === "tool-call") {
          pending.set(
            (part as AssistantMessage["content"][number] & { toolCallId: string; toolName: string }).toolCallId,
            (part as AssistantMessage["content"][number] & { toolCallId: string; toolName: string }).toolName,
          );
        }
      }
    } else if (msg.role === "tool") {
      for (const part of msg.content) {
        const p = part as { toolCallId: string };
        pending.delete(p.toolCallId);
      }
    }
  }

  if (pending.size === 0) return messages;

  console.warn(`[agent-loop] repairing ${pending.size} unresolved tool call(s): ${[...pending.keys()].join(", ")}`);

  const synthetic: Message = {
    role: "tool",
    content: [...pending.entries()].map(([toolCallId, toolName]) => ({
      type: "tool-result" as const,
      toolCallId,
      toolName,
      output: "Tool result unavailable — please continue.",
    })),
  };

  return [...messages, synthetic];
}

export async function* runAgentLoop(
  prompt: string,
  config: AgentConfig,
  context: AgentContext = { messages: [] },
): AsyncGenerator<LoopYield> {
  let ctx = buildContext(prompt, context);
  const maxSteps = config.maxSteps ?? 10;
  const steps: StepResult[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const state = (isStreaming = false): AgentState => ({
    context: ctx,
    steps: [...steps],
    totalInputTokens,
    totalOutputTokens,
    isRunning: true,
    isStreaming,
  });

  yield { event: AgentEventType.AgentStart, state: state() };

  let done = false;
  for (let i = 0; i < maxSteps && !done; i++) {
    yield { event: AgentEventType.TurnStart, state: state() };

    if (config.stream) {
      let step: StepResult | undefined;

      for await (const chunk of streamGenerate(config.modelId, ctx.messages ?? [], {
        system: ctx.systemPrompt,
        tools: ctx.tools,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        executeTools: config.parallelToolCalls ? false : undefined,
      })) {
        switch (chunk.type) {
          case "text-start":    yield { event: AgentEventType.MessageStart,   state: state(true) }; break;
          case "text-delta":    yield { event: AgentEventType.MessageDelta,   delta: chunk.delta, state: state(true) }; break;
          case "text-end":      yield { event: AgentEventType.MessageEnd,     state: state() }; break;
          case "reasoning-start": yield { event: AgentEventType.ReasoningStart, state: state(true) }; break;
          case "reasoning-delta": yield { event: AgentEventType.ReasoningDelta, delta: chunk.delta, state: state(true) }; break;
          case "reasoning-end":   yield { event: AgentEventType.ReasoningEnd,   state: state() }; break;
          case "tool-call-start": yield { event: AgentEventType.ToolCallStart, toolCallId: chunk.toolCallId, toolName: chunk.toolName, state: state() }; break;
          case "tool-call-delta": yield { event: AgentEventType.ToolCallDelta, toolCallId: chunk.toolCallId, delta: chunk.delta, state: state() }; break;
          case "tool-call-end":   yield { event: AgentEventType.ToolCallEnd,   toolCallId: chunk.toolCallId, toolName: chunk.toolName, input: chunk.input, output: chunk.output, state: state() }; break;
          case "finish": {
            step = chunk.result;
            // Always execute tools ourselves — streamGenerate never gives execute functions
            // to the SDK, so we are always responsible for tool execution here.
            if (ctx.tools && step.toolCalls.length > 0) {
              // If the SDK error recovery left responseMessages empty, synthesize the
              // assistant message from the tool calls we collected during streaming.
              let responseMessages = step.responseMessages;
              if (responseMessages.length === 0) {
                responseMessages = [{
                  role: "assistant" as const,
                  content: step.toolCalls.map((tc) => ({
                    type: "tool-call" as const,
                    toolCallId: tc.toolCallId,
                    toolName: tc.toolName,
                    input: tc.input,
                  })),
                }];
              }

              const toolResults = await executeToolsParallel(ctx.tools, step.toolCalls);
              if (config.parallelToolCalls) {
                yield { event: AgentEventType.ToolBatchStart, toolCallIds: step.toolCalls.map((tc) => tc.toolCallId), state: state() };
                for (const r of toolResults) {
                  const tc = step.toolCalls.find((c) => c.toolCallId === r.toolCallId)!;
                  yield { event: AgentEventType.ToolCallEnd, toolCallId: r.toolCallId, toolName: r.toolName, input: tc.input, output: r.output, state: state() };
                }
                yield { event: AgentEventType.ToolBatchEnd, results: toolResults, state: state() };
              } else {
                for (const r of toolResults) {
                  const tc = step.toolCalls.find((c) => c.toolCallId === r.toolCallId)!;
                  yield { event: AgentEventType.ToolCallEnd, toolCallId: r.toolCallId, toolName: r.toolName, input: tc.input, output: r.output, state: state() };
                }
              }
              step = { ...step, toolResults, responseMessages: [...responseMessages, buildToolMessage(toolResults)] };
            }
            steps.push(step);
            totalInputTokens += step.inputTokens;
            totalOutputTokens += step.outputTokens;
            const appendedCtx = appendStep(ctx, step.responseMessages);
            ctx = { ...appendedCtx, messages: repairUnresolvedToolCalls(appendedCtx.messages ?? []) } as typeof ctx;
            yield { event: AgentEventType.TurnEnd, step, state: state() };
            if (step.finishReason !== "tool-calls") done = true;
            break;
          }
        }
      }
    } else {
      const raw = await generate(config.modelId, ctx.messages ?? [], {
        system: ctx.systemPrompt,
        tools: ctx.tools,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        executeTools: config.parallelToolCalls ? false : undefined,
      });

      let result = raw;
      if (config.parallelToolCalls && ctx.tools && raw.toolCalls.length > 0) {
        yield { event: AgentEventType.ToolBatchStart, toolCallIds: raw.toolCalls.map((tc) => tc.toolCallId), state: state() };
        const toolResults = await executeToolsParallel(ctx.tools, raw.toolCalls);
        for (const r of toolResults) {
          const tc = raw.toolCalls.find((c) => c.toolCallId === r.toolCallId)!;
          yield { event: AgentEventType.ToolCallEnd, toolCallId: r.toolCallId, toolName: r.toolName, input: tc.input, output: r.output, state: state() };
        }
        yield { event: AgentEventType.ToolBatchEnd, results: toolResults, state: state() };
        result = { ...raw, toolResults, responseMessages: [...raw.responseMessages, buildToolMessage(toolResults)] };
      }

      steps.push(result);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;
      const appendedCtxNonStream = appendStep(ctx, result.responseMessages);
      ctx = { ...appendedCtxNonStream, messages: repairUnresolvedToolCalls(appendedCtxNonStream.messages ?? []) } as typeof ctx;
      yield { event: AgentEventType.TurnEnd, step: result, state: state() };
      if (result.finishReason !== "tool-calls") done = true;
    }
  }

  yield { event: AgentEventType.AgentEnd, state: { ...state(), isRunning: false } };
}
