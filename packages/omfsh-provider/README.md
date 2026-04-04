# `@2na3k/omfsh-provider`: My own provider for application

Provider abstraction over the [Vercel AI SDK](https://sdk.vercel.ai). Returns a `LanguageModelV3` instance ready to use with `generateText`, `streamText`, etc.

## Usage

```ts
import { generateText, streamText } from "ai";
import { getModel, ModelProvider } from "omfsh-provider";

const model = getModel(ModelProvider.OpenCodeZen, "nemotron-3-super-free");

const { text } = await generateText({ model, prompt: "Hello" });

const { textStream } = streamText({ model, prompt: "Hello" });
for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

`getModel` is the primary entry point. API keys are resolved automatically from environment variables — never passed as arguments.

## Providers

| Enum | Env var |
|---|---|
| `ModelProvider.OpenAI` | `OPENAI_API_KEY` |
| `ModelProvider.Anthropic` | `ANTHROPIC_API_KEY` |
| `ModelProvider.Google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `ModelProvider.OpenCodeZen` | `OPENCODE_ZEN_API_KEY` |
| `ModelProvider.OpenAICompatible` | `OPENAI_COMPATIBLE_API_KEY` |

## Models

All available models are defined in `MODELS`. Each entry declares its provider, base URL, and backend routing (for OpenCode Zen).

```ts
import { MODELS } from "omfsh-provider";

// check which provider a model belongs to
MODELS["nemotron-3-super-free"].provider; // ModelProvider.OpenCodeZen
MODELS["nemotron-3-super-free"].baseURL;  // "https://opencode.ai/zen/v1"
```

To add a new model, add an entry to `src/models.ts`:

```ts
"my-model": { provider: ModelProvider.OpenCodeZen, baseURL: ZEN_OPENAI_URL, zenBackend: "openai-compatible" },
```

## Schema reference

These types are exported for use in application-level schema definitions — not needed for basic usage.

| Type | Description |
|---|---|
| `ModelProvider` | Enum of supported providers |
| `ModelId` | Union of all registered model ID strings |
| `ModelDefinition` | Shape of a single model entry in `MODELS` |
| `ProviderConfig` | Base config shape for provider instantiation |
| `OpenCodeZenConfig` | Config for OpenCode Zen provider |
| `OpenAICompatibleConfig` | Config for OpenAI-compatible providers (Ollama, etc.) |
