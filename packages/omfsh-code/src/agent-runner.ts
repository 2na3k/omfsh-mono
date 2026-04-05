import { runAgentLoop } from "@2na3k/omfsh-darwin";
import type { LoopYield } from "@2na3k/omfsh-darwin";
import { TOOLS } from "./tools/index.js";
import { MAX_STEPS, SYSTEM_PROMPT } from "./constants.js";
import type { Session } from "./types.js";

export async function runTurn(
  session: Session,
  prompt: string,
  onEvent: (e: LoopYield) => void,
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

  for await (const loopYield of gen) {
    if (signal.aborted) break;
    onEvent(loopYield);
  }
}
