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

function toToolSet(tools: ToolMap, withExecute: boolean): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, def]) => {
      if (withExecute) {
        return [name, tool({
          description: def.description,
          inputSchema: jsonSchema(def.parameters as JSONSchema7),
          execute: (input: unknown) => def.execute(input),
        })];
      }
      return [name, tool({
        description: def.description,
        inputSchema: jsonSchema(def.parameters as JSONSchema7),
      })];
    }),
  ) as ToolSet;
}

export async function executeToolsParallel(
  tools: ToolMap,
  toolCalls: ToolCallRecord[],
): Promise<ToolResultRecord[]> {
  const settled = await Promise.allSettled(
    toolCalls.map(async (tc) => {
      const def = tools[tc.toolName];
      if (!def) throw new Error(`Unknown tool: ${tc.toolName}`);
      const output = await def.execute(tc.input);
      return { toolCallId: tc.toolCallId, toolName: tc.toolName, output };
    }),
  );

  return settled.map((r, i): ToolResultRecord => {
    if (r.status === "fulfilled") return r.value;
    return {
      toolCallId: toolCalls[i].toolCallId,
      toolName: toolCalls[i].toolName,
      output: { error: r.reason instanceof Error ? r.reason.message : String(r.reason) },
    };
  });
}

export function buildToolMessage(results: ToolResultRecord[]): ToolMessage {
  return {
    role: "tool",
    content: results.map((r) => ({
      type: "tool-result" as const,
      toolCallId: r.toolCallId,
      toolName: r.toolName,
      output: r.output,
    })),
  };
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
        // The SDK stores output as either { type, value } (when we built the message)
        // or as the raw tool return value (string/object) when the SDK executed the tool.
        const raw = part.output;
        let output: unknown;
        if (raw && typeof raw === "object" && "type" in raw && "value" in raw) {
          const typed = raw as { type: string; value?: unknown };
          output = (typed.type === "text" || typed.type === "json") ? typed.value : raw;
        } else {
          output = raw;
        }
        return [{
          type: "tool-result" as const,
          toolCallId: part.toolCallId as string,
          toolName: part.toolName as string,
          output,
        }];
      });
      if (parts.length === 0) return [];
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
    tools: options.tools ? toToolSet(options.tools, options.executeTools ?? true) : undefined,
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
    tools: options.tools ? toToolSet(options.tools, options.executeTools ?? true) : undefined,
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
        console.log(`[provider] tool-result: ${part.toolName} (${part.toolCallId}) output type=${typeof output}, isArray=${Array.isArray(output)}, length=${Array.isArray(output) ? output.length : 'N/A'}`);
        if (Array.isArray(output) && output.length === 0) {
          console.log(`[provider] WARNING: tool ${part.toolName} returned empty array`);
        }
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
