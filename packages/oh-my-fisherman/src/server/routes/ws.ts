import type { WSEvents } from "hono/ws";
import { runResearch, cancelResearch } from "../services/agent-runner.js";
import type { ClientMessage, ServerMessage } from "../../shared/types.js";

export function createWsHandler(): WSEvents {
  return {
    onOpen(_event, ws) {
      console.log("[ws] client connected");
      ws.send(JSON.stringify({ type: "connected" }));
    },

    onMessage(event, ws) {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data as ArrayBuffer));
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "invalid JSON" }));
        return;
      }

      const send = (m: ServerMessage) => {
        try {
          ws.send(JSON.stringify(m));
        } catch {
          // client disconnected
        }
      };

      switch (msg.type) {
        case "research.start":
          // fire and forget — events stream back over ws
          runResearch(msg.notebookId, msg.prompt, send, msg.modelId).catch((err) => {
            send({ type: "error", message: err instanceof Error ? err.message : "research failed" });
          });
          break;

        case "research.cancel":
          cancelResearch(msg.notebookId);
          break;

        default:
          send({ type: "error", message: `unknown message type` });
      }
    },

    onClose() {
      console.log("[ws] client disconnected");
    },

    onError(event) {
      console.error("[ws] error:", event);
    },
  };
}
