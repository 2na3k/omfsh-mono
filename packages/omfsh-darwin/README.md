# `@2na3k/omfsh-darwin`

The agent loop engine. Drives multi-step LLM execution with tool calls, streaming, parallel tool batches, and full event visibility.

## Structure

```
src/
├── index.ts        — public exports
├── types.ts        — AgentConfig, AgentContext, AgentState, LoopYield, AgentEventType
├── agent-loop.ts   — runAgentLoop(): core async generator
├── agent.ts        — Agent class (run / stream wrappers)
└── proxy.ts        — context helpers: buildContext, appendStep
```

## Concepts

**Agent loop** — runs until the model stops calling tools or `maxSteps` is reached. Each iteration is a _turn_: send context → get response → execute tools → append results → repeat.

**LoopYield** — every meaningful thing that happens during a run is yielded as a typed event. Consumers observe the stream and derive whatever state they need.

**AgentState** — snapshot attached to every event. Contains the current context, accumulated steps, token counts, and streaming flags.

**Parallel tool calls** — set `parallelToolCalls: true` in config to execute all tool calls in a turn concurrently via `executeToolsParallel`, emitting `ToolBatchStart` / `ToolBatchEnd` events around the batch.

## API

### `runAgentLoop(prompt, config, context?)` → `AsyncGenerator<LoopYield>`

The primitive. Yields a stream of `LoopYield` events from start to finish.

```ts
import { runAgentLoop, AgentEventType } from "@2na3k/omfsh-darwin";

for await (const y of runAgentLoop("summarize this repo", config, context)) {
  if (y.event === AgentEventType.MessageDelta) {
    process.stdout.write(y.delta);
  }
}
```

### `Agent`

Thin class wrapper around `runAgentLoop` for convenience.

```ts
import { Agent } from "@2na3k/omfsh-darwin";

const agent = new Agent(
  { modelId: "claude-sonnet-4-6", maxSteps: 15, stream: true },
  { systemPrompt: "You are a helpful assistant.", tools: myTools },
);

// Simple one-shot — resolves when the agent finishes
const { text, state } = await agent.run("What files are in src/?");

// Full event stream — same as runAgentLoop
for await (const y of agent.stream("explain the codebase")) {
  // handle events
}
```

## Configuration

```ts
interface AgentConfig {
  modelId: ModelId;
  maxSteps?: number;          // default: 10
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;           // enable streaming chunks (text/reasoning/tool deltas)
  parallelToolCalls?: boolean; // execute all tool calls in a turn concurrently
}
```

## Context

```ts
interface AgentContext {
  systemPrompt?: string;
  messages?: Message[];  // conversation history
  tools?: ToolMap;
}
```

Pass an existing context to continue a conversation. The loop appends each turn's response messages and returns the updated context in every `AgentState`.

## Events

All events carry `state: AgentState`. Delta events additionally carry their payload.

| Event | Extra fields | When |
|---|---|---|
| `AgentStart` | — | Before the first turn |
| `TurnStart` | — | Before each LLM call |
| `MessageStart` | — | Text content begins |
| `MessageDelta` | `delta: string` | Text chunk |
| `MessageEnd` | — | Text content ends |
| `ReasoningStart` | — | Reasoning/thinking begins |
| `ReasoningDelta` | `delta: string` | Reasoning chunk |
| `ReasoningEnd` | — | Reasoning ends |
| `ToolCallStart` | `toolCallId`, `toolName` | Tool call begins |
| `ToolCallDelta` | `toolCallId`, `delta` | Tool input chunk |
| `ToolCallEnd` | `toolCallId`, `toolName`, `input`, `output` | Tool executed |
| `ToolBatchStart` | `toolCallIds: string[]` | Parallel batch begins (parallelToolCalls mode) |
| `ToolBatchEnd` | — | Parallel batch complete |
| `TurnEnd` | `step: StepResult` | Turn complete, tokens available |
| `AgentEnd` | — | Loop finished |

```ts
import { AgentEventType } from "@2na3k/omfsh-darwin";
import type { LoopYield } from "@2na3k/omfsh-darwin";

function handle(y: LoopYield) {
  switch (y.event) {
    case AgentEventType.MessageDelta:
      process.stdout.write(y.delta);
      break;
    case AgentEventType.ToolCallEnd:
      console.log(`[${y.toolName}]`, y.input, "→", y.output);
      break;
    case AgentEventType.TurnEnd:
      console.log(`tokens: ${y.step.inputTokens} in / ${y.step.outputTokens} out`);
      break;
  }
}
```

## AgentState

```ts
interface AgentState {
  context: AgentContext;       // current conversation context
  steps: StepResult[];         // completed turns so far
  totalInputTokens: number;    // cumulative input tokens
  totalOutputTokens: number;   // cumulative output tokens
  isRunning: boolean;
  isStreaming: boolean;
}
```
