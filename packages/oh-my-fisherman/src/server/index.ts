import { Hono } from "hono";
import { cors } from "hono/cors";
import { upgradeWebSocket, websocket } from "hono/bun";
import { notebooksRouter } from "./routes/notebooks.js";
import { sourcesRouter } from "./routes/sources.js";
import { createWsHandler } from "./routes/ws.js";
import { getDb } from "./db.js";

// init database on startup
getDb();

const app = new Hono();

app.use("*", cors());

app.get("/api/health", (c) => {
  return c.json({ status: "ok", name: "oh-my-fisherman" });
});

// REST routes
app.route("/api/notebooks", notebooksRouter);
app.route("/api/notebooks", sourcesRouter);

// WebSocket
app.get("/ws", upgradeWebSocket(() => createWsHandler()));

const port = Number(process.env.PORT) || 3000;

console.log(`[fisherman] server listening on :${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};
