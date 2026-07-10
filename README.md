# Me Health Dashboard

Me Health Dashboard is a private desktop app for tracking personal health
records on your own computer.

You can add lab results, symptoms, conditions, medications, supplements, and
documents, then review them by body system. The app stores health data locally
in an encrypted SQLite database. There is no hosted service.

This project is not medical advice, diagnosis, treatment, or emergency triage.
Use it as a personal tracking tool and discuss health decisions with a
clinician.

## Table of Contents

- [Run Locally](#run-locally)
- [Product](PRODUCT.md)
- [Security](SECURITY.md)
- [AI](AI.md)
- [Design](DESIGN.md)
- [Architecture](ARCHITECTURE.md)
- [Agent Guide](AGENTS.md)
- [Common Commands](#common-commands)
- [Release Checklist](RELEASE_CHECKLIST.md)

## Run Locally

You need:

- Node.js
- Rust and Cargo

Then run:

```sh
npm install
npm run tauri:dev
```

The app opens as a native desktop window. On first launch, choose a database
passphrase. Keep it safe; the app uses it to unlock your local encrypted data.

Development starts with the encrypted setup flow. To use the bundled synthetic
mock database instead, run:

```sh
ME_HEALTH_USE_MOCK_DB=1 npm run tauri:dev
```

## Common Commands

```sh
npm run tauri:dev     # run the app locally
npm run tauri:build   # build the desktop app
npm run typecheck     # run TypeScript checks
npm test              # run typecheck, JS/TS/TSX tests, and Rust tests
npm run check         # run project checks
```

## Optional AI Features

AI features are optional. Chat supports Codex CLI, Anthropic, OpenAI, Gemini,
LM Studio, Ollama, and custom OpenAI-compatible providers. Local providers stay
on-device; remote providers require explicit health-context consent.

Configure AI in Settings after the app is running. API keys are referenced by
environment variable name and are not stored in the database. Enabling remote
health context also allows selected PDF and image reports to be sent to Codex
for draft result extraction. PDFs are rendered locally, and every extracted row
must be reviewed before saving. The native Developer area shows bounded local
LLM call metadata and errors without storing prompt contents or secrets.
