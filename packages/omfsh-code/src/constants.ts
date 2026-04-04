import type { ModelId } from "@2na3k/omfsh-provider";

export const DEFAULT_MODEL_ID: ModelId = "claude-sonnet-4-6";

export const MAX_STEPS = 20;

export const SYSTEM_PROMPT = `You are a helpful AI coding assistant running in a terminal. You have access to tools to read files, write files, run bash commands, and search code. Be concise and precise in your responses. When using tools, explain what you're doing briefly.`;
