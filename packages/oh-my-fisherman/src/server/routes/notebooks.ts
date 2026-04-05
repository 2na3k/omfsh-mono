import { Hono } from "hono";
import {
  createNotebook,
  listNotebooks,
  getNotebook,
  deleteNotebook,
  listSources,
  listEntities,
  listRelations,
  reportPath,
  getChatHistory,
} from "../db.js";
import { readFileSync, existsSync } from "fs";

function safeParse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

const app = new Hono();

// list notebooks
app.get("/", (c) => {
  return c.json(listNotebooks());
});

// create notebook
app.post("/", async (c) => {
  const body = await c.req.json<{ name: string }>();
  const id = crypto.randomUUID();
  const notebook = createNotebook(id, body.name || "Untitled Research");
  return c.json(notebook, 201);
});

// get notebook with sources
app.get("/:id", (c) => {
  const id = c.req.param("id");
  const notebook = getNotebook(id);
  if (!notebook) return c.json({ error: "not found" }, 404);
  const sources = listSources(id);
  return c.json({ ...notebook, sources });
});

// delete notebook
app.delete("/:id", (c) => {
  const id = c.req.param("id");
  const deleted = deleteNotebook(id);
  if (!deleted) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

// get report
app.get("/:id/report", (c) => {
  const id = c.req.param("id");
  const path = reportPath(id);
  if (!existsSync(path)) return c.json({ markdown: "" });
  const markdown = readFileSync(path, "utf-8");
  return c.json({ markdown });
});

// get chat history
app.get("/:id/messages", (c) => {
  const id = c.req.param("id");
  const rows = getChatHistory(id);
  const messages: Array<{ id: string; role: string; text?: string; toolName?: string; toolInput?: unknown; toolOutput?: unknown; isStreaming: boolean }> = [];

  for (const r of rows) {
    if (r.role === "user") {
      messages.push({ id: crypto.randomUUID(), role: "user", text: r.content, isStreaming: false });
    } else if (r.role === "assistant") {
      const parsed = safeParse(r.content);
      if (!Array.isArray(parsed)) continue;
      for (const block of parsed) {
        if (block.type === "text" && block.text) {
          messages.push({ id: crypto.randomUUID(), role: "assistant", text: block.text, isStreaming: false });
        } else if (block.type === "tool-call") {
          messages.push({
            id: block.toolCallId ?? crypto.randomUUID(),
            role: "tool",
            toolName: block.toolName,
            toolInput: block.input,
            isStreaming: false,
          });
        }
      }
    } else if (r.role === "tool") {
      const parsed = safeParse(r.content);
      if (!Array.isArray(parsed)) continue;
      for (const block of parsed) {
        if (block.type === "tool-result" && block.toolCallId) {
          // find matching tool call and attach output
          const existing = messages.find((m) => m.id === block.toolCallId);
          if (existing) {
            existing.toolOutput = block.output;
          }
        }
      }
    }
  }

  return c.json(messages);
});

// get entities + relations
app.get("/:id/entities", (c) => {
  const id = c.req.param("id");
  const entities = listEntities(id);
  const relations = listRelations(id);
  return c.json({ entities, relations });
});

export { app as notebooksRouter };
