import { generate, streamGenerate } from "@2na3k/omfsh-provider";
import type { Message } from "@2na3k/omfsh-provider";
import { buildContext, appendStep } from "./proxy.js";
import { AgentEventType } from "./types.js";
import type { AgentConfig, AgentContext, AgentState, LoopYield, StepResult } from "./types.js";

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

      for await (const chunk of streamGenerate(config.modelId, ctx.messages, {
        system: ctx.systemPrompt,
        tools: ctx.tools,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
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
          case "finish":
            step = chunk.result;
            steps.push(step);
            totalInputTokens += step.inputTokens;
            totalOutputTokens += step.outputTokens;
            ctx = appendStep(ctx, step.responseMessages);
            yield { event: AgentEventType.TurnEnd, step, state: state() };
            if (step.finishReason !== "tool-calls") done = true;
            break;
        }
      }
    } else {
      const result = await generate(config.modelId, ctx.messages, {
        system: ctx.systemPrompt,
        tools: ctx.tools,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      steps.push(result);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;
      ctx = appendStep(ctx, result.responseMessages);
      yield { event: AgentEventType.TurnEnd, step: result, state: state() };
      if (result.finishReason !== "tool-calls") done = true;
    }
  }

  yield { event: AgentEventType.AgentEnd, state: { ...state(), isRunning: false } };
}
