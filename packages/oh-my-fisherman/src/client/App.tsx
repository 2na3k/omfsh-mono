import { useEffect, useCallback } from "react";
import { Shell } from "./components/layout/Shell.js";
import { Sidebar } from "./components/left/Sidebar.js";
import { Chat } from "./components/center/Chat.js";
import { Report } from "./components/right/Report.js";
import { useSocket } from "./hooks/useSocket.js";
import { useAgentStream } from "./hooks/useAgentStream.js";
import { useChatStore } from "./stores/chat.js";
import { useNotebookStore } from "./stores/notebook.js";

export function App() {
  const { handleMessage } = useAgentStream();
  const { send } = useSocket(handleMessage);
  const submitUserMessage = useChatStore((s) => s.submitUserMessage);
  const modelId = useChatStore((s) => s.modelId);
  const activeNotebookId = useNotebookStore((s) => s.activeNotebookId);

  const handleSubmit = useCallback(
    (prompt: string) => {
      if (!activeNotebookId) return;
      submitUserMessage(prompt);
      send({ type: "research.start", notebookId: activeNotebookId, prompt, modelId });
    },
    [activeNotebookId, submitUserMessage, send, modelId],
  );

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+N — new notebook (handled in Sidebar, but trigger focus)
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        // let it bubble to Sidebar
      }
      // Escape — cancel research
      if (e.key === "Escape" && activeNotebookId) {
        send({ type: "research.cancel", notebookId: activeNotebookId });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeNotebookId, send]);

  return (
    <Shell
      left={<Sidebar />}
      center={<Chat onSubmit={handleSubmit} />}
      right={<Report />}
    />
  );
}
