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

Other supported provider options:

- Codex CLI
- Claude through Anthropic
- Gemini
- OpenAI
- Custom remote OpenAI-compatible endpoints

Provider settings live in `src/ai-sdk-config.ts` and persist in the encrypted
SQLite `ai_settings` table.

## Current State

The provider catalog supports local and remote providers, but the live prompt
and document-analysis path currently runs through Codex CLI. Other providers
are configuration-ready until execution is routed through the Rust backend.

Codex runs with an ephemeral, read-only workspace. Dropped documents are written
temporarily for extraction, then removed after the Codex run. Extracted results
are shown to the user for review before they are saved.

## Privacy Rules

- Local LLM providers are preferred.
- Remote health context is opt-in and off by default.
- API keys are never stored directly.
- Settings store API key environment variable names, such as `OPENAI_API_KEY`.
- Raw API key fields and raw-looking key values are rejected by the Rust backend.
- AI output must not be presented as diagnosis, treatment, or emergency triage.

## Adding Provider Execution

Keep provider execution behind Rust commands, not leaf UI components. Resolve
environment variables at the Rust boundary, keep remote-context opt-in explicit,
and return advisory output that the user can review.
