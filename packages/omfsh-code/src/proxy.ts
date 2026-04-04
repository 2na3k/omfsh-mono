import type { Message } from "@2na3k/omfsh-provider";
import type { AgentContext } from "./types.js";

export function buildContext(prompt: string, base: AgentContext = { messages: [] }): AgentContext {
  return {
    ...base,
    messages: [...base.messages, { role: "user", content: prompt }],
  };
}

export function appendStep(context: AgentContext, responseMessages: Message[]): AgentContext {
  return {
    ...context,
    messages: [...context.messages, ...responseMessages],
  };
}
