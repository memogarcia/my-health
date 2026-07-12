# Me Health Dashboard

Me Health Dashboard is a private desktop app for tracking personal health
records on your own computer.

You can add lab results, symptoms, conditions, medications, supplements, meals,
daily context, and documents, then review them by body system and date. Chat
answers questions about the approved record context, while Deep Research builds
a longer structured report. The release app stores health data locally in an
encrypted SQLite database. There is no hosted service.

This project is not medical advice, diagnosis, treatment, or emergency triage.
Use it as a personal tracking tool and discuss health decisions with a
clinician.

## Table of Contents

- [Run Locally](#run-locally)
- [Product](PRODUCT.md)
- [Features](FEATURES.md)
- [Security](SECURITY.md)
- [AI](AI.md)
- [Design](DESIGN.md)
- [Architecture](ARCHITECTURE.md)
- [Agent Guide](AGENTS.md)
- [Common Commands](#common-commands)
- [Release Checklist](RELEASE_CHECKLIST.md)

## Run Locally

You need:

- Bun
- Node.js
- Rust and Cargo

Then run:

```sh
bun install
bun run tauri:dev
```

The app opens as a native desktop window. Development always copies the bundled
synthetic SQLite fixture into app data once and opens that copy without
encryption or a passphrase. Delete the app-data copy when you want to reset it
from the tracked fixture. Release builds do not include this startup branch and
continue to use SQLCipher-encrypted databases.

## Common Commands

```sh
bun run tauri:dev     # run the app locally
bun run tauri:build   # build the desktop app
bun run typecheck     # run TypeScript checks
bun run test          # run typecheck, JS/TS/TSX tests, and Rust tests
bun run check         # run project checks
```

## Optional AI Features

AI features are optional. Chat and Deep Research support Codex CLI, Anthropic,
OpenAI, Gemini, LM Studio, Ollama, and custom OpenAI-compatible providers.
Loopback LM Studio/Ollama endpoints stay on-device; every remote endpoint
requires explicit health-context consent.

Configure AI in Settings after the app is running. Remote provider API keys are
referenced by environment variable name and are not stored in the database. For
LM Studio servers that require auth, paste the LM Studio token directly in
Settings. It is encrypted in release; never use a real token in the plaintext
development mock.
Enabling remote health context also allows selected PDF and image reports to be
sent to Codex for draft result extraction. PDFs are rendered locally, and every
extracted row must be reviewed before saving. The native Developer area shows
bounded local LLM call metadata and errors without storing prompt contents or
secrets.
