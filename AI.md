# AI

AI is optional. The recommended path is local first: use a model running on the
same machine whenever possible, especially when prompts include health context.

This app is not a diagnostic tool. AI output must stay advisory, non-emergency,
and reviewable by the user before anything is saved.

## Providers

Recommended local providers:

- LM Studio
- Ollama
- Custom local OpenAI-compatible endpoints

Live providers:

- Codex CLI

- Claude through Anthropic
- Gemini
- OpenAI
- Custom OpenAI-compatible endpoints

Provider settings live in `src/ai-sdk-config.ts` and persist in the encrypted
SQLite `ai_settings` table.

## Current State

The provider catalog marks execution state explicitly. Chat supports every
configured provider. The default state is "Not configured" so first use asks
for setup instead of failing against an unconfigured provider.

Codex chat runs with an ephemeral, per-request workspace and a five-minute
execution timeout. Other providers use Rust HTTP adapters with the same
five-minute request limit. Rust rechecks the saved provider, model, database,
and remote-health opt-in before execution. Document extraction uses the Codex
checks and remains Codex-only because it requires structured image input.
Supported images are attached directly; PDFs are rendered locally into bounded
page images before those images are attached. Codex returns
schema-constrained structured results, and the ephemeral workspace is removed
afterward. The user must review every extracted row before it is saved.

The native Developer page shows bounded request metadata and lifecycle events
for LLM calls, including timing and truncated errors. It excludes prompt
content, extracted results, and secrets.

Codex CLI's read-only sandbox prevents writes but does not confine reads to the
request workspace. Extraction ignores user configuration and labels document
content as untrusted, but users should only enable remote extraction when they
accept that Codex runs with the CLI's normal local read boundary.

## Privacy Rules

- Local LLM providers are preferred.
- Remote health context is opt-in and off by default.
- Enabling remote health context allows health context to be sent to the selected
  remote provider. Selected documents are still sent to Codex for extraction.
- API keys are never stored directly.
- Settings store API key environment variable names, such as `OPENAI_API_KEY`.
- Raw API key fields and raw-looking key values are rejected by the Rust backend.
- AI output must not be presented as diagnosis, treatment, or emergency triage.
- User-entered health records included in prompts are serialized as untrusted JSON data.

## Adding Provider Execution

Keep provider execution behind Rust commands, not leaf UI components. Resolve
environment variables at the Rust boundary, keep remote-context opt-in explicit,
and return advisory output that the user can review. Chat supports the provider
catalog's native protocol or OpenAI-compatible chat-completions protocol.
