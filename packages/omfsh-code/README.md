# `@2na3k/omfsh-code`

Terminal coding agent. Think Claude Code but running on whatever model you point it at — local llamacpp, Groq, Anthropic, anything in the provider registry.

## Structure

```
src/
├── index.ts            — entry point; parses CLI args, starts Ink app
├── constants.ts        — DEFAULT_MODEL_ID, MAX_STEPS, SYSTEM_PROMPT
├── types.ts            — UiMessage, Session, AppStatus, SlashCommand, SlashEffect
├── agent-runner.ts     — runTurn(): drives runAgentLoop for a single prompt
├── model-registry.ts   — listModels(), isValidModelId(), formatModelLabel()
├── session.ts          — session creation and persistence helpers
├── slash-commands.ts   — parseSlashCommand(), handleSlashCommand()
├── tools/
│   ├── index.ts        — TOOLS: { bash, read, write, grep }
│   ├── bash.ts         — run shell commands
│   ├── read.ts         — read file contents
│   ├── write.ts        — write / overwrite files
│   └── grep.ts         — regex search across files
└── ui/
    ├── App.tsx         — root Ink component
    ├── hooks/
    │   ├── useAppReducer.ts   — state machine for messages, status, model
    │   └── useAgentRunner.ts  — wires runTurn() into the UI event loop
    └── …
```

## Usage

```bash
# default model (llamacpp @ localhost:8080)
bun run src/index.ts

# specify a model
bun run src/index.ts claude-sonnet-4-6
bun run src/index.ts gemini-3-flash-preview
```

Type a prompt and hit Enter. The agent streams its response and tool calls inline.

## Slash commands

| Command | Effect |
|---|---|
| `/model` | Open interactive model picker |
| `/model <id>` | Switch to a specific model immediately |
| `/clear` | Clear conversation history |
| `/exit` | Quit |

## Tools

| Tool | What it does |
|---|---|
| `bash` | Runs a shell command and returns stdout/stderr |
| `read` | Reads a file path and returns its contents |
| `write` | Writes content to a file path (creates or overwrites) |
| `grep` | Searches files with a regex pattern |

## Configuration

Key constants in `src/constants.ts`:

```ts
DEFAULT_MODEL_ID = "llamacpp"   // model used when none is specified on CLI
MAX_STEPS = 20                  // max agent turns per prompt
SYSTEM_PROMPT = "..."           // injected as system message every turn
```

## Session

Each conversation is a `Session` — it holds the model ID, the full `AgentContext` (message history + tools), and accumulated token counts. Switching models or clearing history creates a fresh session.
