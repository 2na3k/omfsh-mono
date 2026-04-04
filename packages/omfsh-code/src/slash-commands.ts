import { isValidModelId, listModels, formatModelLabel } from "./model-registry.js";
import { createSession } from "./session.js";
import type { SlashCommand, SlashEffect, UiMessage, Session } from "./types.js";
import type { ModelId } from "@2na3k/omfsh-provider";

export function parseSlashCommand(input: string): SlashCommand {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return { kind: "unknown", raw: trimmed };
  }

  const parts = trimmed.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case "model":
      if (parts.length === 1) return { kind: "model_list" };
      return { kind: "model_set", modelId: parts[1] };
    case "clear":
      return { kind: "clear" };
    case "exit":
    case "quit":
      return { kind: "exit" };
    default:
      return { kind: "unknown", raw: trimmed };
  }
}

function systemMsg(text: string): UiMessage {
  return {
    id: crypto.randomUUID(),
    role: "system",
    text,
    isStreaming: false,
  };
}

export function handleSlashCommand(cmd: SlashCommand, _session: Session): SlashEffect {
  switch (cmd.kind) {
    case "model_list":
      return { kind: "open_model_picker" };

    case "model_set": {
      if (isValidModelId(cmd.modelId)) {
        return { kind: "set_model", modelId: cmd.modelId as ModelId };
      }
      return {
        kind: "add_message",
        message: systemMsg(`Unknown model: "${cmd.modelId}". Use /model to list available models.`),
      };
    }

    case "clear":
      return { kind: "clear" };

    case "exit":
      process.exit(0);

    case "unknown":
      return {
        kind: "add_message",
        message: systemMsg(`Unknown command: "${cmd.raw}". Try /model, /clear, or /exit.`),
      };
  }
}
