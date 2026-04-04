import { runAgentLoop } from "./agent-loop.js";
import { AgentEventType } from "./types.js";
import type { AgentConfig, AgentContext, AgentResult, AgentState, LoopYield } from "./types.js";

export class Agent {
  constructor(
    private readonly config: AgentConfig,
    private readonly context: AgentContext = { messages: [] },
  ) {}

  async run(prompt: string): Promise<AgentResult> {
    let text = "";
    let finalState: AgentState | undefined;
    for await (const y of runAgentLoop(prompt, this.config, this.context)) {
      if (y.event === AgentEventType.TurnEnd) text = y.step.text;
      finalState = y.state;
    }
    const state = finalState ?? {
      context: this.context,
      steps: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      isRunning: false,
      isStreaming: false,
    };
    return { text, state };
  }

  async *stream(prompt: string): AsyncGenerator<LoopYield> {
    yield* runAgentLoop(prompt, this.config, this.context);
  }
}
