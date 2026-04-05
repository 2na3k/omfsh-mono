import { Hono } from "hono";
import { insertSource, listSources, deleteSource, getNotebook } from "../db.js";
import { ingestPdf, ingestUrl, ingestText } from "../services/source-ingest.js";

const app = new Hono();

// list sources for notebook
app.get("/:notebookId/sources", (c) => {
  const notebookId = c.req.param("notebookId");
  return c.json(listSources(notebookId));
});

// add source — multipart file or JSON { url } or { text, title }
app.post("/:notebookId/sources", async (c) => {
  const notebookId = c.req.param("notebookId");
  const notebook = getNotebook(notebookId);
  if (!notebook) return c.json({ error: "notebook not found" }, 404);

  const contentType = c.req.header("content-type") ?? "";
  const id = crypto.randomUUID();

  try {
    if (contentType.includes("multipart/form-data")) {
      // file upload
      const formData = await c.req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return c.json({ error: "no file provided" }, 400);
      }

      const buffer = await file.arrayBuffer();
      const filename = file.name;

      if (filename.toLowerCase().endsWith(".pdf")) {
        const result = await ingestPdf(notebookId, id, buffer, filename);
        insertSource(result.source);
        return c.json(result.source, 201);
      } else {
        // treat as plain text
        const text = new TextDecoder().decode(buffer);
        const title = filename.replace(/\.[^.]+$/, "");
        const result = await ingestText(notebookId, id, text, title);
        insertSource(result.source);
        return c.json(result.source, 201);
      }
    } else {
      // JSON body: url or text
      const body = await c.req.json<{ url?: string; text?: string; title?: string }>();

      if (body.url) {
        const result = await ingestUrl(notebookId, id, body.url);
        insertSource(result.source);
        return c.json(result.source, 201);
      } else if (body.text) {
        const result = await ingestText(notebookId, id, body.text, body.title ?? "Untitled");
        insertSource(result.source);
        return c.json(result.source, 201);
      } else {
        return c.json({ error: "provide url, text, or file" }, 400);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion failed";
    return c.json({ error: message }, 500);
  }
});

// delete source
app.delete("/:notebookId/sources/:sourceId", (c) => {
  const sourceId = c.req.param("sourceId");
  const deleted = deleteSource(sourceId);
  if (!deleted) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

export { app as sourcesRouter };
