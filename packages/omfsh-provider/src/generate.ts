import { generateText, streamText, tool, jsonSchema, stepCountIs } from "ai";
import type {
  ModelMessage,
  ToolSet,
  JSONSchema7,
  AssistantModelMessage,
  ToolModelMessage,
} from "ai";
import { getModel } from "./get-model.js";
import { MODELS } from "./models.js";
import type { ModelId } from "./models.js";
import type {
  Message,
  AssistantMessage,
  ToolMessage,
  ToolMap,
  GenerateOptions,
  GenerateResult,
  StreamChunk,
  FinishReason,
  ToolCallRecord,
  ToolResultRecord,
} from "./types.js";

type ResponseMessage = AssistantModelMessage | ToolModelMessage;

function toModelMessages(messages: Message[]): ModelMessage[] {
  return messages.map((msg): ModelMessage => {
    if (msg.role === "system") return { role: "system", content: msg.content };
    if (msg.role === "user") return { role: "user", content: msg.content };
    if (msg.role === "assistant") return { role: "assistant", content: msg.content } as AssistantModelMessage;
    return {
      role: "tool",
      content: msg.content.map((part) => ({
        type: "tool-result" as const,
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        output: { type: "json" as const, value: part.output },
      })),
    } as ToolModelMessage;
  });
}

function toToolSet(tools: ToolMap): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, def]) => [
      name,
      tool({
        description: def.description,
        inputSchema: jsonSchema(def.parameters as JSONSchema7),
        execute: (input: unknown) => def.execute(input),
      }),
    ]),
  ) as ToolSet;
}

function fromResponseMessages(msgs: ResponseMessage[]): Message[] {
  return msgs.flatMap((msg): Message[] => {
    if (msg.role === "assistant") {
      const raw = msg.content as AssistantModelMessage["content"];
      const parts = typeof raw === "string"
        ? [{ type: "text" as const, text: raw }]
        : (raw as Array<{ type: string; [key: string]: unknown }>).flatMap((part): AssistantMessage["content"] => {
            if (part.type === "text") return [{ type: "text", text: part.text as string }];
            if (part.type === "reasoning") return [{ type: "reasoning", text: part.text as string }];
            if (part.type === "tool-call") return [{
              type: "tool-call",
              toolCallId: part.toolCallId as string,
              toolName: part.toolName as string,
              input: part.input,
            }];
            return [];
          });
      return [{ role: "assistant", content: parts }];
    }

    if (msg.role === "tool") {
      const parts: ToolMessage["content"] = (msg.content as Array<{ type: string; [key: string]: unknown }>).flatMap((part) => {
        if (part.type !== "tool-result") return [];
        const raw = part.output as { type: string; value?: unknown };
        const output = raw.type === "text" || raw.type === "json" ? raw.value : null;
        if (output === null) return [];
        return [{
          type: "tool-result" as const,
          toolCallId: part.toolCallId as string,
          toolName: part.toolName as string,
          output,
        }];
      });
      return [{ role: "tool", content: parts }];
    }

    return [];
  });
}

export async function generate(
  modelId: ModelId,
  messages: Message[],
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const model = getModel(MODELS[modelId].provider, modelId);
  const result = await generateText({
    model,
    system: options.system,
    messages: toModelMessages(messages),
    tools: options.tools ? toToolSet(options.tools) : undefined,
    stopWhen: stepCountIs(1),
    temperature: options.temperature,
    maxOutputTokens: options.maxTokens,
  });
  return {
    text: result.text,
    reasoning: result.reasoningText,
    toolCalls: result.toolCalls.map((tc) => ({ toolCallId: tc.toolCallId, toolName: tc.toolName, input: tc.input })),
    toolResults: result.toolResults.map((tr) => ({ toolCallId: tr.toolCallId, toolName: tr.toolName, output: tr.output })),
    finishReason: result.finishReason,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    responseMessages: fromResponseMessages(result.response.messages),
  };
}

export async function* streamGenerate(
  modelId: ModelId,
  messages: Message[],
  options: GenerateOptions = {},
): AsyncGenerator<StreamChunk> {
  const model = getModel(MODELS[modelId].provider, modelId);
  const result = streamText({
    model,
    system: options.system,
    messages: toModelMessages(messages),
    tools: options.tools ? toToolSet(options.tools) : undefined,
    stopWhen: stepCountIs(1),
    temperature: options.temperature,
    maxOutputTokens: options.maxTokens,
  });

  let text = "";
  let reasoning = "";
  const toolCalls: ToolCallRecord[] = [];
  const toolResults: ToolResultRecord[] = [];
  let finishReason: FinishReason = "stop";
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const part of result.fullStream) {
    switch (part.type) {
      case "text-start":  yield { type: "text-start" }; break;
      case "text-delta":  text += part.text; yield { type: "text-delta", delta: part.text }; break;
      case "text-end":    yield { type: "text-end" }; break;
      case "reasoning-start": yield { type: "reasoning-start" }; break;
      case "reasoning-delta": reasoning += part.text; yield { type: "reasoning-delta", delta: part.text }; break;
      case "reasoning-end":   yield { type: "reasoning-end" }; break;
      case "tool-input-start": yield { type: "tool-call-start", toolCallId: part.id, toolName: part.toolName }; break;
      case "tool-input-delta": yield { type: "tool-call-delta", toolCallId: part.id, delta: part.delta }; break;
      case "tool-call":
        toolCalls.push({ toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
        break;
      case "tool-result": {
        const output = (part as { output: unknown }).output;
        toolResults.push({ toolCallId: part.toolCallId, toolName: part.toolName, output });
        yield { type: "tool-call-end", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input, output };
        break;
      }
      case "finish-step":
        finishReason = part.finishReason;
        break;
      case "finish":
        inputTokens = part.totalUsage.inputTokens ?? 0;
        outputTokens = part.totalUsage.outputTokens ?? 0;
        break;
    }
  }

  const response = await result.response;
  yield {
    type: "finish",
    result: {
      text,
      reasoning: reasoning || undefined,
      toolCalls,
      toolResults,
      finishReason,
      inputTokens,
      outputTokens,
      responseMessages: fromResponseMessages(response.messages as ResponseMessage[]),
    },
  };
}
