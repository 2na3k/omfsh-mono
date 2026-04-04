import { useEffect } from "react";
import { runTurn } from "../../agent-runner.js";
import type { AppAction, AppState } from "./useAppReducer.js";

export function useAgentRunner(state: AppState, dispatch: (action: AppAction) => void): void {
  const { status, session, pendingPrompt } = state;

  useEffect(() => {
    if (status.kind !== "running" || !pendingPrompt) return;

    const { abortController } = status;

    runTurn(session, pendingPrompt, (event) => {
      dispatch({ type: "AGENT_EVENT", event });
    }, abortController.signal).catch((err: unknown) => {
      if (!abortController.signal.aborted) {
        const message = err instanceof Error ? err.message : String(err);
        dispatch({ type: "AGENT_EVENT", event: { type: "error", message } });
      }
    });

    return () => abortController.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
}
