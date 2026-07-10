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

Long-running renderer actions also create a small persisted background-job
record in `user_state`. The job center tracks document extraction and AI work
across navigation and reloads; it does not replace the underlying Tauri
command or claim model-reported progress when only staged progress is known.
If the app closes while a renderer task is running, restore marks that job as
interrupted instead of leaving a false-running row.

The Developer page records bounded local diagnostics for these actions: LLM
command, model, reasoning effort, timing, byte/page counts, output size, event
messages, and truncated errors. Prompt text, extracted results, and secrets are
not copied into diagnostics.

Leaf components should not call `invoke()` directly.

## Storage

The release app defaults to `health-dashboard.sqlite3` in the user's Documents
folder; New Database can choose another `.sqlite3` location. First run creates
an encrypted database. An old plaintext local database is migrated once.
Exports are encrypted SQLCipher copies.

`AppState` holds the active database path and a locked `Option<Connection>`.
All writes require an unlocked connection.

Tables:

- `organs` includes `display_order` for backend/frontend ordering. Its reserved
  `other` record is available for symptoms that do not match a listed organ or
  system and is omitted from the body workspace.
- `lab_reports` includes the encrypted source document bytes plus `updated_at`
  and `deleted_at` for report management.
- `lab_results` includes derived numeric/range fields plus `updated_at` and `deleted_at`.
- `symptoms` includes `updated_at` and `deleted_at`.
- `conditions` includes `updated_at` and `deleted_at`.
- `regimen_items` includes `updated_at`, `deleted_at`, and active/stop-date state.
- `ai_settings`
- `user_state`

`user_state` stores profile/activity/import/conversation data plus recent
`backgroundJobs`, `developerLogs`, and `llmCalls` entries. Each job has a kind
(`document-analysis`, `deep-research`, or `ai-chat`), status, created/finished
timestamps, optional staged progress, and an error message. Developer entries
are bounded metadata and truncated errors, not prompt or result payloads. This
is JSON state, not a new SQLite table or a separate hosted queue.

Enums:

- Health status: `normal`, `monitor`, `attention`
- Lab flag: `low`, `normal`, `high`, `unknown`
- Condition status: `current`, `managed`, `past`
- Regimen kind: `medication`, `supplement`

`lab_results.flag` is derived in Rust from numeric value and reference range.
The renderer does not set it. The UI presents that range position separately
from the user-selected follow-up priority stored in `lab_results.status`.
New manual and document-import rows require an explicit follow-up-priority
choice; the renderer never silently defaults that field to `normal`.
Schema installation backfills those derived numeric, range-bound, and flag
fields for older rows that predate them.

Current organ status uses one shared model in Rust and the renderer:

- the latest result for each normalized marker within that organ;
- symptoms observed from the inclusive 30-day local-date lookback through today;
- conditions whose status is `current`.

Historical rows still count toward record totals and remain visible in history,
but superseded results, older symptoms, and managed or past conditions do not
keep an organ in `monitor` or `attention` indefinitely.

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
- `update_lab_result`
- `delete_lab_result`
- `add_lab_results`
- `import_lab_results_document`
- `list_lab_reports`
- `unlink_lab_report`
- `delete_lab_report`
- `add_symptom`
- `update_symptom`
- `delete_symptom`
- `add_condition`
- `update_condition`
- `delete_condition`
- `add_regimen_item`
- `update_regimen_item`
- `delete_regimen_item`
- `stop_regimen_item`
- `reactivate_regimen_item`

Documents and AI:

- `ask_llm`
- `analyze_document`
- `get_codex_options`

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

The live chat execution path is Codex CLI through `src-tauri/src/codex_cli.rs`.
Other providers are visible as planned/configuration-only entries and cannot be
selected from chat until Rust-backed execution exists.

Dropped PDFs and images are sent to Codex only after Rust validates the file,
the saved provider and model, and the remote-health opt-in. Each request uses a
permission-restricted ephemeral workspace and a JSON output schema. Supported
images use Codex CLI image attachments; PDFs are rendered locally into JPEG page
images and attached without placing the original PDF in the Codex workspace.
The rendered page payload remains bounded by the Rust byte limit. Extracted rows
remain drafts until the user reviews and accepts them.
Codex runs with `--ignore-user-config` and treats document contents as untrusted,
but its read-only sandbox is not an OS-level filesystem read boundary.

AI output is advisory only. Remote health context requires explicit opt-in.
See `AI.md` for provider details.

The renderer job center wraps the existing `analyze_document` and `ask_llm`
commands. Document intake reports preparation, extraction, and review stages;
AI work reports running/completed/failed state. A newer document request marks
the older renderer job as replaced, while Rust remains the trust boundary for
the actual request.

## Module Map

Renderer:

- `App.tsx` - root app shell and database gate.
- `use-dashboard-controller.ts` - state, navigation, dialogs, settings, and all Tauri calls.
- `use-dashboard-record-actions.ts` - record mutation command wrappers.
- `dashboard-model.ts` - shared types, organ visuals, snapshot shaping.
- `tauri-runtime.ts` - native-runtime guard.
- `components/` - pages and UI primitives.
- `components/ui/date-picker.tsx` - shared ISO-date picker composed from the
  shadcn Calendar and Popover primitives.
- `components/job-center.tsx` - persisted document-analysis and AI work queue
  shown in the native app bar.
- `components/developer-page.tsx` - local Codex call metadata and event log.
- `components/body/` - body source rail, stable anatomy coordinate plane,
  selected-organ inspector, and display-status helpers.
- `components/charts/` - SVG chart components for labs, symptoms, regimen periods, document coverage, and AI context coverage.
- `charts/` - pure chart data transforms and scale utilities.
- `i18n.ts`, `i18n/locales/en.json` - typed UI copy catalog.
- `document-intake.ts`, `document-rendering.ts`, `use-document-intake.ts`,
  `components/document-review.tsx` - validated document rendering and review flow.
- `developer-diagnostics.ts`, `use-developer-diagnostics.ts` - bounded local
  diagnostic models and persistence helpers.
- `ai-sdk-config.ts`, `ai-actions.ts`, `ai-conversation.ts` - AI settings and chat helpers.

Backend:

- `lib.rs` - app setup, command registration, snapshot commands.
- `database.rs` - SQLCipher database setup, unlock, migration, export.
- `records.rs`, `records/parse.rs`, `records/reports.rs`, `records/symptoms.rs` - lab, report, and symptom validation/storage.
- `conditions.rs` - condition validation/storage.
- `regimen.rs` - medication and supplement validation/storage.
- `document_files.rs` - document signature, size, type, and filename validation.
- `codex_cli.rs`, `codex_cli/document_analysis.rs` - consent-checked Codex chat
  and document extraction, model discovery, structured output, stdin, timeout,
  output draining, and per-request cleanup.
- `ai_settings.rs` - AI settings validation.

## Invariants

- Health data stays in encrypted local SQLite.
- Browser-only storage is not used for health records.
- Background-job and developer diagnostic metadata are persisted with encrypted
  `user_state`; raw document bytes and health context stay governed by the
  existing intake and AI consent rules.
- Raw API keys never enter persisted settings.
- Remote AI context is opt-in, never automatic.
- PDF/image intake is consent-gated AI extraction followed by mandatory manual
  review, then atomically saved with its source bytes inside encrypted SQLite.
- Charts use saved structured data only; they are record-review aids, not diagnostic quality scores.
- Rust validates before every write.
- New Tauri commands must be registered in `lib.rs`.
- Schema migrations are additive only.
