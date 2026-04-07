# `@2na3k/omfsh-provider`

Provider abstraction over the [Vercel AI SDK](https://sdk.vercel.ai). Exposes a unified `generate` / `streamGenerate` API with message history, tool calls, reasoning support, and a typed model registry.

## Structure

```
src/
├── index.ts          — public exports
├── types.ts          — Message, ToolDef, ToolMap, GenerateOptions, StreamChunk, …
├── models.ts         — MODELS registry + ModelId
├── get-model.ts      — getModel(): LanguageModelV3
├── generate.ts       — generate(), streamGenerate(), executeToolsParallel(), buildToolMessage()
└── providers/        — per-provider instantiation (Anthropic, Google, OpenAI, etc.)
```

## API

### `generate(modelId, messages, options?)` → `Promise<GenerateResult>`

Single non-streaming call. Returns text, reasoning, tool calls/results, token counts, and response messages ready to append to history.

```ts
import { generate } from "@2na3k/omfsh-provider";

const result = await generate("claude-sonnet-4-6", [
  { role: "user", content: "What is 2 + 2?" },
]);
console.log(result.text); // "4"
```

### `streamGenerate(modelId, messages, options?)` → `AsyncGenerator<StreamChunk>`

Streaming variant. Yields typed chunks — text deltas, reasoning deltas, tool-call deltas, and a final `finish` chunk with the full `GenerateResult`.

```ts
import { streamGenerate } from "@2na3k/omfsh-provider";

for await (const chunk of streamGenerate("llamacpp", messages)) {
  if (chunk.type === "text-delta") process.stdout.write(chunk.delta);
  if (chunk.type === "finish")     console.log(chunk.result.inputTokens);
}
```

### `executeToolsParallel(tools, toolCalls)` → `Promise<ToolResultRecord[]>`

Runs all pending tool calls in parallel via `Promise.allSettled`. Errors are caught and returned as `{ error: string }` outputs rather than thrown.

### `buildToolMessage(results)` → `ToolMessage`

Converts `ToolResultRecord[]` into a `ToolMessage` ready to append to the message history.

### `getModel(provider, modelId)` → `LanguageModelV3`

Low-level entry point — returns a Vercel AI SDK model instance. Used internally by `generate` / `streamGenerate`. API keys are resolved from environment variables automatically.

## Models

| Model ID | Provider | Context | Max out |
|---|---|---|---|
| `claude-opus-4-6` | Anthropic | 200k | 32k |
| `claude-sonnet-4-6` | Anthropic | 200k | 64k |
| `claude-haiku-4-5-20251001` | Anthropic | 200k | 8k |
| `gemini-3-flash-preview` | Google | 1M | 8k |
| `gemini-3.1-flash-lite-preview` | Google | 1M | 8k |
| `minimax-m2.5-free` | OpenCode Zen | 204k | 128k |
| `nemotron-3-super-free` | OpenCode Zen | 204k | 128k |
| `llamacpp` | OpenAI-compatible | 128k | 50k |
| `openai/gpt-oss-120b` | Groq | 128k | 50k |
| `ministral-3` | Ollama Cloud | 128k | 50k |
| `qwen/qwen3.6-plus:free` | OpenRouter | 128k | 50k |

`llamacpp` targets `http://localhost:8080` — run any llama.cpp server locally.

To add a model, append an entry to `src/models.ts`:

```ts
"my-model": {
  provider: ModelProvider.OpenAICompatible,
  baseURL: "https://api.example.com/v1",
  contextWindow: 32000,
  maxTokens: 4096,
},
```

## Environment variables

| Provider | Env var |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` |
| OpenCode Zen | `OPENCODE_ZEN_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| OpenAI-compatible | `OPENAI_COMPATIBLE_API_KEY` |

## Types

```ts
// Tool definition — describe + execute
interface ToolDef<TInput = unknown, TOutput = unknown> {
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute: (input: TInput) => Promise<TOutput> | TOutput;
}

type ToolMap = Record<string, ToolDef>;

// Message history
type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

// Generate options
interface GenerateOptions {
  system?: string;
  tools?: ToolMap;
  temperature?: number;
  maxTokens?: number;
  executeTools?: boolean; // default true; set false for raw tool calls
}

// Stream chunks
type StreamChunk =
  | { type: "text-start" | "text-end" | "reasoning-start" | "reasoning-end" }
  | { type: "text-delta"; delta: string }
  | { type: "reasoning-delta"; delta: string }
  | { type: "tool-call-start"; toolCallId: string; toolName: string }
  | { type: "tool-call-delta"; toolCallId: string; delta: string }
  | { type: "tool-call-end"; toolCallId: string; toolName: string; input: unknown; output: unknown }
  | { type: "finish"; result: GenerateResult };
```
