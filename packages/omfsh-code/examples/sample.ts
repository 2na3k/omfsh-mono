import { Agent, AgentEventType } from "../src/index.js";
import type { LoopYield } from "../src/index.js";

// Simple tools for testing the loop
const tools = {
  add: {
    description: "Add two numbers together",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" },
      },
      required: ["a", "b"],
    },
    execute: (input: unknown) => {
      const { a, b } = input as { a: number; b: number };
      const result = a + b;
      console.log(`  [tool] add(${a}, ${b}) = ${result}`);
      return result;
    },
  },

  get_weather: {
    description: "Get the current weather for a city",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
      },
      required: ["city"],
    },
    execute: (input: unknown) => {
      const { city } = input as { city: string };
      const result = `Sunny, 24°C in ${city}`;
      console.log(`  [tool] get_weather(${city}) = ${result}`);
      return result;
    },
  },
};

function printEvent(y: LoopYield) {
  switch (y.event) {
    case AgentEventType.AgentStart:
      console.log("\n── agent start ──────────────────────────────");
      break;
    case AgentEventType.AgentEnd:
      console.log(`── agent end (tokens: ${y.state.totalInputTokens} in / ${y.state.totalOutputTokens} out) ──`);
      break;
    case AgentEventType.TurnStart:
      console.log(`\n  [turn ${y.state.steps.length + 1}] start`);
      break;
    case AgentEventType.TurnEnd:
      console.log(`  [turn ${y.state.steps.length}] end — finish: ${y.step.finishReason}`);
      break;
    case AgentEventType.MessageStart:
      process.stdout.write("  ");
      break;
    case AgentEventType.MessageDelta:
      process.stdout.write(y.delta);
      break;
    case AgentEventType.MessageEnd:
      process.stdout.write("\n");
      break;
    case AgentEventType.ReasoningStart:
      process.stdout.write("  <thinking> ");
      break;
    case AgentEventType.ReasoningDelta:
      process.stdout.write(y.delta);
      break;
    case AgentEventType.ReasoningEnd:
      process.stdout.write(" </thinking>\n");
      break;
    case AgentEventType.ToolCallStart:
      console.log(`  [tool call] ${y.toolName} (${y.toolCallId})`);
      break;
    case AgentEventType.ToolCallEnd:
      console.log(`  [tool result] ${y.toolName} → ${JSON.stringify(y.output)}`);
      break;
  }
}

// --- non-stream run ---
async function runNonStream() {
  console.log("\n=== NON-STREAM ===");
  const agent = new Agent(
    { modelId: "llamacpp", maxSteps: 5 },
    { systemPrompt: "You are a helpful assistant. Use the provided tools when needed.", tools },
  );

  const result = await agent.run("What is 123 + 456? Also what's the weather in Tokyo?");
  console.log("\nfinal answer:", result.text);
  console.log(`steps: ${result.state.steps.length}, tokens: ${result.state.totalInputTokens}/${result.state.totalOutputTokens}`);
}

// --- stream run ---
async function runStream() {
  console.log("\n=== STREAM ===");
  const agent = new Agent(
    { modelId: "llamacpp", maxSteps: 5, stream: true },
    { systemPrompt: "You are a helpful assistant. Use the provided tools when needed.", tools },
  );

  for await (const y of agent.stream("What is 42 + 58? Respond concisely.")) {
    printEvent(y);
  }
}

await runNonStream();
await runStream();
