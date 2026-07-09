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

## Common Commands

```sh
npm run tauri:dev     # run the app locally
npm run tauri:build   # build the desktop app
npm test              # run tests
npm run check         # run project checks
```

## Optional AI Features

AI features are optional. Local LLM providers are the recommended first choice
because they keep health context on your machine. The provider setup includes
local providers such as LM Studio and Ollama, plus other options such as Codex,
Claude, Gemini, OpenAI-compatible endpoints, and custom providers.

Configure AI in Settings after the app is running. API keys are referenced by
environment variable name and are not stored in the database.
