import { useCallback } from "react";
import { useChatStore } from "../stores/chat.js";
import { useGraphStore } from "../stores/graph.js";
import type { ServerMessage } from "../../shared/types.js";

export function useAgentStream() {
  const applyAgentEvent = useChatStore((s) => s.applyAgentEvent);
  const setError = useChatStore((s) => s.setError);
  const addEntities = useGraphStore((s) => s.addEntities);
  const addRelations = useGraphStore((s) => s.addRelations);
  const setReportMarkdown = useGraphStore((s) => s.setReportMarkdown);

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      console.log("[stream]", msg.type, "type" in msg && msg.type === "agent.event" ? msg.event.event : "");
      switch (msg.type) {
        case "agent.event":
          applyAgentEvent(msg.event);
          break;
        case "entity.extracted":
          addEntities(msg.entities);
          addRelations(msg.relations);
          break;
        case "report.updated":
          setReportMarkdown(msg.markdown);
          break;
        case "error":
          console.error("[stream] error from server:", msg.message);
          setError(msg.message);
          // also push error as a log message so it's visible in chat
          applyAgentEvent({ event: "agent.end" });
          break;
      }
    },
    [applyAgentEvent, setError, addEntities, addRelations, setReportMarkdown],
  );

  return { handleMessage };
}
