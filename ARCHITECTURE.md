# Architecture

This is the technical map for the app. Product intent lives in `PRODUCT.md`,
AI policy in `AI.md`, security posture in `SECURITY.md`, visual rules in
`DESIGN.md`, and agent workflow in `AGENTS.md`.

## Shape

Me Health Dashboard is a Tauri-only desktop app. There is no hosted backend and
no supported browser runtime.

- Renderer: React + TypeScript in `src/`.
- Backend: Rust commands in `src-tauri/src/`.
- Storage: SQLCipher-encrypted SQLite owned by Rust.
- Styling: Tailwind CSS v4 + shadcn primitives.
- App config: `src-tauri/tauri.conf.json`.
- Bundle identifier: `app.mehealth.dashboard`.

Vite is renderer tooling only. The raw Vite URL is unsupported because health
data requires the Tauri runtime and unlocked Rust database.

## Runtime Flow

1. `App.tsx` mounts `DatabaseGate`.
2. The user selects/unlocks a database.
3. UI actions route through `use-dashboard-controller.ts`.
4. The controller calls Tauri commands with `invoke()`.
5. Rust validates input at the trust boundary.
6. Rust reads or writes SQLite through `database::with_connection`.
7. The renderer reloads `get_dashboard_snapshot`.

Leaf components should not call `invoke()` directly.

## Storage

The release app defaults to `health-dashboard.sqlite3` in the user's Documents
folder; New Database can choose another `.sqlite3` location. First run creates
an encrypted database. An old plaintext local database is migrated once.
Exports are encrypted SQLCipher copies.

`AppState` holds the active database path and a locked `Option<Connection>`.
All writes require an unlocked connection.

Tables:

- `organs`
- `lab_reports`
- `lab_results`
- `symptoms`
- `conditions`
- `regimen_items`
- `ai_settings`
- `user_state`

Enums:

- Health status: `normal`, `monitor`, `attention`
- Lab flag: `low`, `normal`, `high`, `unknown`
- Condition status: `current`, `managed`, `past`
- Regimen kind: `medication`, `supplement`

`lab_results.flag` is derived in Rust from numeric value and reference range.
The renderer does not set it.

Schema changes must be additive migrations guarded by `PRAGMA table_info`.

## Commands

All Tauri commands are registered in `src-tauri/src/lib.rs`.

Database:

- `get_database_status`
- `select_database`
- `unlock_database`
- `export_database`

Dashboard and records:

- `get_dashboard_snapshot`
- `add_lab_result`
- `add_lab_results`
- `add_symptom`
- `add_condition`
- `add_regimen_item`

Documents and AI:

- `save_document_copy`
- `ask_llm`
- `get_codex_options`
- `analyze_document`

Settings and user state:

- `get_ai_settings`
- `save_ai_settings`
- `get_user_state`
- `save_user_state`

Inputs use camelCase from the renderer. Rust validates required fields, ISO
dates, enum values, ranges, and secret-shape rules before writes.

## AI Boundary

Provider settings live in `src/ai-sdk-config.ts` and persist in `ai_settings`.
API key values are never stored; settings store environment-variable names.

The live execution path is Codex CLI through `src-tauri/src/codex_cli.rs`.
Other providers are configured in the catalog but still need Rust-backed
execution before they can run prompts.

AI output is advisory only. Remote health context requires explicit opt-in.
See `AI.md` for provider details.

## Module Map

Renderer:

- `App.tsx` - root app shell and database gate.
- `use-dashboard-controller.ts` - state, navigation, dialogs, settings, and all Tauri calls.
- `dashboard-model.ts` - shared types, organ visuals, snapshot shaping.
- `tauri-runtime.ts` - native-runtime guard.
- `components/` - pages and UI primitives.
- `i18n.ts`, `i18n/locales/en.json` - typed UI copy catalog.
- `document-intake.ts`, `use-document-intake.ts` - dropped-file review flow.
- `ai-sdk-config.ts`, `ai-actions.ts`, `ai-conversation.ts` - AI settings and chat helpers.

Backend:

- `lib.rs` - app setup, command registration, snapshot commands.
- `database.rs` - SQLCipher database setup, unlock, migration, export.
- `records.rs`, `records/parse.rs` - lab and symptom validation/storage.
- `conditions.rs` - condition validation/storage.
- `regimen.rs` - medication and supplement validation/storage.
- `document_files.rs` - saved document copies.
- `codex_cli.rs` - Codex prompt and document extraction path.
- `ai_settings.rs` - AI settings validation.

## Invariants

- Health data stays in encrypted local SQLite.
- Browser-only storage is not used for health records.
- Raw API keys never enter persisted settings.
- Remote AI context is opt-in, never automatic.
- PDF/image intake is review-first, then save.
- Rust validates before every write.
- New Tauri commands must be registered in `lib.rs`.
- Schema migrations are additive only.
