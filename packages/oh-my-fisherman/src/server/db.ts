import { Database } from "bun:sqlite";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import type { Notebook, SourceMeta, Entity, Relation } from "../shared/types.js";
import type { Message } from "@2na3k/omfsh-provider";

const DATA_DIR = join(import.meta.dir, "../../data");
const DB_PATH = join(DATA_DIR, "fisherman.db");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  ensureDataDir();
  _db = new Database(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      page_count INTEGER,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      label TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_name ON entities(notebook_id, name);
  `);
}

// ---- Notebooks ----

export function createNotebook(id: string, name: string): Notebook {
  const db = getDb();
  const now = new Date().toISOString();
  db.run("INSERT INTO notebooks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)", [id, name, now, now]);
  return { id, name, createdAt: now, updatedAt: now };
}

export function listNotebooks(): Notebook[] {
  const db = getDb();
  const rows = db.query("SELECT id, name, created_at, updated_at FROM notebooks ORDER BY updated_at DESC").all();
  return (rows as Array<{ id: string; name: string; created_at: string; updated_at: string }>).map((r) => ({
    id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export function getNotebook(id: string): Notebook | null {
  const db = getDb();
  const row = db.query("SELECT id, name, created_at, updated_at FROM notebooks WHERE id = ?").get(id) as { id: string; name: string; created_at: string; updated_at: string } | null;
  if (!row) return null;
  return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function deleteNotebook(id: string): boolean {
  const db = getDb();
  const result = db.run("DELETE FROM notebooks WHERE id = ?", [id]);
  return result.changes > 0;
}

export function touchNotebook(id: string) {
  const db = getDb();
  db.run("UPDATE notebooks SET updated_at = datetime('now') WHERE id = ?", [id]);
}

// ---- Messages (conversation history) ----

export function saveMessage(notebookId: string, role: string, content: string) {
  const db = getDb();
  db.run("INSERT INTO messages (notebook_id, role, content) VALUES (?, ?, ?)", [notebookId, role, content]);
}

export function getMessages(notebookId: string): Message[] {
  const db = getDb();
  const rows = db.query("SELECT role, content FROM messages WHERE notebook_id = ? ORDER BY id ASC").all(notebookId);
  return (rows as Array<{ role: string; content: string }>).map((r) => {
    if (r.role === "user") return { role: "user" as const, content: r.content };
    if (r.role === "assistant") return { role: "assistant" as const, content: JSON.parse(r.content) };
    if (r.role === "tool") return { role: "tool" as const, content: JSON.parse(r.content) };
    return { role: "user" as const, content: r.content };
  });
}

export function getChatHistory(notebookId: string): Array<{ role: string; content: string }> {
  const db = getDb();
  return db.query("SELECT role, content FROM messages WHERE notebook_id = ? ORDER BY id ASC").all(notebookId) as Array<{ role: string; content: string }>;
}

export function clearMessages(notebookId: string) {
  const db = getDb();
  db.run("DELETE FROM messages WHERE notebook_id = ?", [notebookId]);
}

// ---- Sources ----

export function insertSource(source: SourceMeta) {
  const db = getDb();
  db.run(
    "INSERT INTO sources (id, notebook_id, type, title, url, page_count, chunk_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [source.id, source.notebookId, source.type, source.title, source.url ?? null, source.pageCount ?? null, source.chunkCount, source.createdAt],
  );
}

export function listSources(notebookId: string): SourceMeta[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM sources WHERE notebook_id = ? ORDER BY created_at DESC").all(notebookId);
  return (rows as Array<{ id: string; notebook_id: string; type: string; title: string; url: string | null; page_count: number | null; chunk_count: number; created_at: string }>).map((r) => ({
    id: r.id, notebookId: r.notebook_id, type: r.type as SourceMeta["type"], title: r.title,
    url: r.url ?? undefined, pageCount: r.page_count ?? undefined, chunkCount: r.chunk_count, createdAt: r.created_at,
  }));
}

export function deleteSource(id: string): boolean {
  const db = getDb();
  return db.run("DELETE FROM sources WHERE id = ?", [id]).changes > 0;
}

// ---- Entities ----

export function upsertEntity(entity: Entity): Entity {
  const db = getDb();
  db.run(
    `INSERT INTO entities (id, notebook_id, name, type, description) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(notebook_id, name) DO UPDATE SET type = excluded.type, description = excluded.description`,
    [entity.id, entity.notebookId, entity.name, entity.type, entity.description ?? null],
  );
  return entity;
}

export function listEntities(notebookId: string): Entity[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM entities WHERE notebook_id = ?").all(notebookId);
  return (rows as Array<{ id: string; notebook_id: string; name: string; type: string; description: string | null }>).map((r) => ({
    id: r.id, notebookId: r.notebook_id, name: r.name, type: r.type as Entity["type"], description: r.description ?? undefined,
  }));
}

// ---- Relations ----

export function insertRelation(relation: Relation) {
  const db = getDb();
  db.run("INSERT OR IGNORE INTO relations (id, notebook_id, source_id, target_id, label) VALUES (?, ?, ?, ?, ?)",
    [relation.id, relation.notebookId, relation.sourceId, relation.targetId, relation.label]);
}

export function listRelations(notebookId: string): Relation[] {
  const db = getDb();
  const rows = db.query("SELECT * FROM relations WHERE notebook_id = ?").all(notebookId);
  return (rows as Array<{ id: string; notebook_id: string; source_id: string; target_id: string; label: string }>).map((r) => ({
    id: r.id, notebookId: r.notebook_id, sourceId: r.source_id, targetId: r.target_id, label: r.label,
  }));
}

// ---- Notebook data dir helpers ----

export function notebookDir(notebookId: string): string {
  const dir = join(DATA_DIR, "notebooks", notebookId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function sourcesDir(notebookId: string): string {
  const dir = join(notebookDir(notebookId), "sources");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function reportPath(notebookId: string): string {
  return join(notebookDir(notebookId), "report.md");
}
