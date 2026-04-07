# `@2na3k/oh-my-fisherman`

Deep research agent with a web UI. NotebookLM but not terrible.

Three-panel layout: notebooks & sources on the left, chat in the center, live report + knowledge graph on the right. The agent researches the web, reads documents, extracts entities, and builds a structured report as it goes — including inline charts.

## Stack

| Layer | Tech |
|---|---|
| Server | Bun + Hono, WebSocket (streaming), SQLite (`bun:sqlite`) |
| Client | React 19, Zustand, Vite, Tailwind CSS v4 |
| Markdown | `marked` — token-walked to intercept chart blocks |
| Graph | D3 (force-directed) |
| PDF parsing | `pdfjs-dist` + `@mozilla/readability` |

## Running

```bash
# server (hot-reload)
bun run --hot src/server/index.ts

# client dev server (port 3001, proxies /api + /ws to :3000)
vite

# production build
vite build
```

## Agent tools

| Tool | Description |
|---|---|
| `web_search` | Tavily API search with DuckDuckGo fallback |
| `web_read` | Fetch and extract readable content from a URL |
| `source_search` | Keyword search across ingested notebook sources |
| `note_write` | Append a markdown section to the research report |
| `chart_write` | Insert a chart (bar/line/pie/scatter) into an existing report section |
| `entity_extract` | Extract named entities and relationships from a text passage |

### `chart_write`

Charts are embedded as `fisherman-chart` fenced code blocks in `report.md`. The client intercepts these during markdown rendering and renders them as interactive inline SVGs — no extra libraries.

```
## Primary Import Sources

```fisherman-chart
{"type":"bar","title":"Top import sources","xLabel":"Country","yLabel":"USD bn","data":[...]}
```
```

Always call `note_write` first with the section heading, then `chart_write` with that exact same heading to embed the chart inside it.

Supported chart types: `bar`, `line`, `pie`, `scatter`.

## Data layout

All persistence lives under `packages/oh-my-fisherman/data/`:

```
data/
├── fisherman.db                        — SQLite (notebooks, messages, sources, entities, relations)
└── notebooks/
    └── {notebookId}/
        ├── report.md                   — live research report
        └── sources/                    — ingested source chunks
```

## Source ingestion

POST to `/api/:notebookId/sources` with:
- `multipart/form-data` → `file` field (PDF or plain text)
- `application/json` → `{ url }` to fetch and ingest a URL
- `application/json` → `{ text, title }` to ingest raw text

## Export

The report can be exported from the UI (Export ▼ button in the report tab):

| Format | Output |
|---|---|
| Markdown | Raw `report.md` download |
| HTML | Self-contained `.html` with inlined CSS matching the current theme (light/dark). Charts rendered as inline SVG. |
| PDF | Same HTML opened in a new tab + `window.print()` |

## Configuration

Key values in `src/server/services/agent-runner.ts`:

```ts
MAX_STEPS = 15          // max agent turns per research session
DEFAULT_MODEL = "llamacpp"  // model used when client doesn't specify one
```

Model can be overridden per-session from the model picker in the chat UI.

## WebSocket protocol

The client connects to `/ws`. Messages are JSON.

**Client → Server:**
```ts
{ type: "research.start"; notebookId: string; prompt: string; modelId?: string }
{ type: "research.cancel"; notebookId: string }
```

**Server → Client:**
```ts
{ type: "agent.event";      notebookId: string; event: SerializedAgentEvent }
{ type: "report.updated";   notebookId: string; markdown: string }
{ type: "entity.extracted"; notebookId: string; entities: Entity[]; relations: Relation[] }
{ type: "source.ingested";  notebookId: string; source: SourceMeta }
{ type: "error";            message: string }
```
