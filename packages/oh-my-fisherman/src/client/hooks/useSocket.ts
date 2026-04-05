import { useEffect, useRef, useCallback } from "react";
import type { ClientMessage, ServerMessage } from "../../shared/types.js";

type OnMessage = (msg: ServerMessage) => void;

export function useSocket(onMessage: OnMessage) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let attempt = 0;

    function connect() {
      // In dev mode, connect directly to the backend server to avoid Vite proxy WS issues
      const isDev = import.meta.env.DEV;
      const wsUrl = isDev
        ? `ws://${window.location.hostname}:3000/ws`
        : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        attempt = 0;
        console.log("[ws] connected");
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          console.log("[ws] recv:", msg.type ?? msg);
          onMessageRef.current(msg as ServerMessage);
        } catch (err) {
          console.warn("[ws] parse error:", err, e.data);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        attempt++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
