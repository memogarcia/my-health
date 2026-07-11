# Architecture

This is the technical map for the app. Product intent lives in `PRODUCT.md`,
AI policy in `AI.md`, security posture in `SECURITY.md`, visual rules in
`DESIGN.md`, and agent workflow in `AGENTS.md`.

## Shape

Me Health Dashboard is a Tauri-only desktop app. There is no hosted backend and
no supported browser runtime. The repository now includes the encrypted storage
and Rust trust boundary needed by a future Tauri iOS HealthKit bridge, but no iOS
target or live HealthKit plugin is enabled yet.

- Renderer: React + TypeScript in `src/`.
- Backend: Rust commands in `src-tauri/src/`.
- Storage: SQLCipher-encrypted SQLite owned by Rust.
- Styling: Tailwind CSS v4 + shadcn primitives.
- App config: `src-tauri/tauri.conf.json`.
- Bundle identifier: `app.mehealth.dashboard`.

Vite is renderer tooling only. The raw Vite URL is unsupported because health
data requires the Tauri runtime and unlocked Rust database.

## Target Modular Architecture

This section defines the required migration target. It does not describe the
current directory layout. The later Runtime Flow, Storage, Commands, and Current
Module Map sections remain the description of the running app until each part is
migrated.

### Architectural style

The app will remain a modular monolith: one reviewed Tauri application, one
React renderer, one Rust backend, and one SQLCipher database. A module is a
first-party product capability compiled into the app. A page is one UI entry
point owned by a module. One module may own no pages, one page, or several pages.

Modules are not downloadable plugins and cannot load arbitrary JavaScript,
native code, SQL, or commands at runtime. Supporting third-party plugins would
require a separate signed-package, permission, sandbox, and data-isolation
design. It is outside this plan.

The architecture has three levels:

1. **Platform kernel** owns the native lifecycle, database session, security and
   privacy policy, module registry, shared UI shell, and cross-cutting services.
2. **Domain modules** own business rules, commands, persistence, and UI for one
   capability such as labs, symptoms, regimen, or documents.
3. **Composition modules** build read-only experiences from public domain
   contracts. The body overview and timeline are composition modules; they do
   not become owners of the records they display.

A module must inherit the platform security boundary. It cannot replace the
unlock flow, open its own health database, bypass Rust validation, or send
health data over the network directly.

### Composition roots and module contract

There will be one explicit module registry in each process:

- the renderer composition root registers module metadata, lazy page loaders,
  navigation entries, extension slots, and typed client adapters;
- the Rust composition root registers module commands, services, repositories,
  migrations, and health-context contributors;
- contract tests compare the two catalogs so stable module IDs and declared
  capabilities cannot drift.

Each module has a stable, namespaced ID and a public definition. The definition
may declare:

- module version and required module dependencies;
- pages, route IDs, navigation placement, and keyboard actions;
- overview, timeline, intake, and settings extension contributions;
- typed renderer queries and mutations;
- Rust commands, validators, services, repositories, and migrations;
- translation keys and shared-component requirements;
- background-job kinds and bounded diagnostic metadata;
- optional AI-context fields, which remain disabled until the central privacy
  policy allows them;
- unit, migration, command-boundary, and page tests.

Registries are static and deterministic. Duplicate module IDs, route IDs,
command names, or migration versions fail a build or startup check. Module
dependencies must be explicit and acyclic.

Only a module's public entry point may be imported outside that module. A module
may call another module's public query or application-service contract. It may
not import another module's components, internal state, repository, or SQL.
Cross-module writes go through the owning module's service so its validation and
invariants always run.

The planned layout is:

```text
src/
  app/                         # bootstrap, shell, composition root, router
  platform/                    # Tauri client, session, jobs, events, i18n
  modules/<module-id>/
    index.ts                   # public module definition
    pages/                     # lazy page entry points
    components/                # module-private UI
    model/                     # types and pure transforms
    api.ts                     # typed platform-client adapter

src-tauri/src/
  platform/                    # database, session, policy, migration runner
  modules/<module_id>/
    mod.rs                     # public module registration
    commands.rs                # Tauri trust-boundary adapters
    service.rs                 # use cases and business rules
    repository.rs              # owned SQL only
    migrations.rs              # additive, versioned migrations
```

Shared primitives stay in `components/ui`, renderer platform utilities, Rust
validation helpers, or a small shared domain-contract package. Feature-specific
helpers stay inside their owning module.

### Platform kernel

The platform kernel owns behavior that every module must share:

- Tauri-only bootstrap, native-runtime guard, database gate, lock, unlock,
  selection, export, and database-session identity;
- the SQLCipher connection and transaction boundary;
- ordered schema migration and module registration;
- the app shell, typed route registry, navigation, global error boundaries,
  dialogs that truly span modules, and the job center;
- the only renderer `invoke()` adapter and the only native plugin adapters;
- centralized file, network, AI-provider, secret-resolution, consent, and
  diagnostics gateways;
- the i18n catalog, design tokens, shadcn primitives, accessibility defaults,
  and common date/status types;
- post-commit domain-change notifications and query invalidation.

The kernel must stay small. It coordinates modules but does not absorb their
business rules. Domain modules cannot depend on renderer shell components or
platform implementation details.

### Renderer flow

`App` will own only bootstrap and shell state. The current
`use-dashboard-controller.ts` will be split into a small app/session controller
and module-owned controllers or hooks. The current conditional `FeatureRouter`
will be replaced by the static page registry. Adding a page will require a
module definition and translation keys, not another branch in a global router.

All renderer calls to Rust go through a typed platform client. Page components
and module hooks never call `invoke()` or a Tauri plugin directly. The client
normalizes command errors and attaches the active opaque database-session ID to
operations that can become stale. That ID is a consistency token, not a secret
or an authorization credential.

Pages load data through module-specific queries. The app will retire the single
all-feature `DashboardController` and all-feature snapshot as modules are
extracted. Composition pages request purpose-built, read-only projections from
Rust instead of joining private module state in React. Rust is authoritative for
health-status calculations; the renderer formats and displays the returned
status but does not reimplement the rule.

The route and navigation state contains only stable route IDs and harmless UI
state. Health records, conversations, document bytes, and secrets never enter a
URL, browser storage, or navigation manifest.

### Rust request flow

Every module mutation follows the same path:

1. A typed renderer client invokes a statically registered module command.
2. The command deserializes camelCase input and validates context-free fields,
   dates, enums, ranges, and sizes in Rust.
3. The command requests a database lease for the expected opaque session ID.
   While holding the session lock, the kernel atomically verifies that the
   database is unlocked and the session still matches.
4. The kernel opens one bounded transaction on the leased connection and passes
   a transaction context to the owning module service.
5. The module validates database-backed invariants and central consent,
   provider, file, network, and secret policy before the first write.
6. The service calls its repositories or public application services of
   dependent modules with that same context. Modules do not start nested or
   independent transactions inside the operation.
7. The transaction commits before a domain-change notification is published,
   then the kernel releases the lease.
8. The response returns only the data needed by the caller. Affected renderer
   queries are then invalidated or refreshed.

Routes, hidden controls, renderer module IDs, and TypeScript checks are never
authorization. Rust commands remain the trust boundary. There will be no generic
SQL, arbitrary filesystem, arbitrary HTTP, or execute-command bridge available
to modules.

Long-running work captures the database-session ID at start but does not hold a
connection across file, network, or model work. Before persistence it requests
a new session-bound lease; the kernel compares the ID while holding the session
lock and retains that lease through commit or rollback. Locking or switching
cancels work where possible and waits only for an active bounded database
section to finish. It then invalidates module caches, clears sensitive in-memory
drafts, closes the connection, and prevents old work from writing into a new
session.

### Shared data model and persistence

All durable app and health data remains in the active SQLCipher database.
Modules do not create sidecar databases or browser stores. Encrypted export
continues to copy the complete database so module data cannot be silently
omitted.

The shared model is a set of canonical identifiers, value types, provenance,
relationships, and lifecycle fields. It is not one catch-all records table or
one unbounded JSON document. Existing organ keys, health status values, ISO date
rules, timestamps, source metadata, and deletion semantics remain canonical.
New modules reuse those contracts instead of defining near-duplicates.

Table ownership is explicit:

- platform tables store schema versions, bounded app settings, module enablement,
  job metadata, and diagnostics policy;
- a domain module owns its normalized record tables and all writes to them;
- composition modules own projections or caches only when measurement proves
  they are needed; source records remain in their domain tables;
- module tables may reference canonical shared entities through foreign keys;
- cross-module reads use public query or application-service contracts, not
  copied records or another module's repository.

The current-to-target ownership map is:

| Current data | Target owner | Target rule |
| --- | --- | --- |
| `app_metadata` | platform | Database identity and migration metadata only. |
| `organs` | health-core | Health-core migrations are the only writer; record modules read the canonical catalog. |
| `lab_results` | labs | Labs owns validation, marker history, flags, links to reports, and writes. |
| `lab_reports` | labs | Part of the lab-report aggregate; labs alone writes source bytes and handles link, unlink, and delete behavior. |
| `symptoms` | symptoms | Symptoms owns observations, severity, and writes. |
| `conditions` | conditions | Conditions owns lifecycle state and writes. |
| `regimen_items` | regimen | Regimen owns medication and supplement periods. |
| `health_samples`, `healthkit_sync_state` | apple-health | Apple Health owns samples, provenance, tombstones, and anchors. |
| `ai_settings` | platform AI gateway | Central provider, consent, and secret-shape policy. |
| `user_state` profile and anatomy preferences | health-core | Typed profile data; bounded visual preferences may use namespaced module state. |
| `user_state` body notes | health-core | Normalized body-annotation records shared through read contracts. |
| `user_state` activity and fasting sessions | lifestyle | Normalized activity and fasting records. |
| `user_state` Apple Health import summaries | apple-health | Import history or a projection derived from owned sync data. |
| `user_state` conversations | assistant | Validated conversation and message records. |
| `user_state` background jobs | platform jobs | Bounded resumable/interrupted job metadata. |
| `user_state` developer logs and LLM calls | platform diagnostics | Bounded metadata only; never prompts, results, or secrets. |

Durable medical records, source files, conversations containing health context,
and recoverable job state move out of the general `user_state` JSON document
into validated domain- or platform-owned tables. A namespaced module-state store
may hold small, versioned, size-bounded preferences such as a selected view. It
must not hold health records, secrets, files, or an unbounded log. Compatibility
readers will migrate existing `user_state` fields incrementally.

The migration runner records `(module_id, version, checksum, applied_at)` in a
shared schema-migration table. At unlock it compares applied rows with the
compiled migration catalog. An applied version missing from the catalog or a
checksum mismatch fails closed; an unapplied compiled version is migrated. The
migration body and its registry row commit in the same transaction. Existing
databases receive a baseline only after their required tables and columns have
been verified.

Migrations are ordered, idempotent, and additive. New tables use guarded
`CREATE TABLE IF NOT EXISTS`; new columns use `PRAGMA table_info` followed by
`ALTER TABLE ... ADD COLUMN`. Drops and renames remain forbidden. Migrations run
after SQLCipher unlock and before module data loads. A failed required migration
does not mount health pages. Disabling or removing a module never drops its
tables or user data; removal needs an explicit, reviewed data-retention
migration.

### Cross-module composition

Modules integrate through narrow typed contracts:

- read models for overview panels, organ status, history, and timeline;
- post-commit domain-change events carrying IDs and revisions rather than full
  health payloads;
- registered intake actions and settings panels;
- the platform job service for cancellable long-running work;
- the central AI-context builder for explicitly allowlisted context.

Events are in-process invalidation signals, not an event-sourced health record.
The database remains authoritative. A consumer must be able to reload the same
result from a query after an event.

The overview module combines public signals from labs, symptoms, and conditions
and asks one Rust policy to derive organ status. The timeline combines public
summary projections. Neither module writes another module's tables.

The initial lab-document workflow has one dependency direction: documents
depends on labs. Documents owns bounded intake, rendering, extraction, and the
review session until acceptance. After the user accepts, the documents UI calls
the public labs acceptance service. Labs stores the report bytes and accepted
results atomically as one aggregate. Labs also owns report listing, unlink, and
delete commands; the documents page consumes those public queries and actions.
Labs never imports documents internals. Both modules use the platform file and
AI gateways for their shared security policy.

A module that wants to expose data to AI registers a Rust-side context
contributor with explicit fields, size limits, and provenance. The central AI
gateway decides whether the provider is local or remote, verifies saved consent,
resolves secrets, and constructs the final request. Context is excluded by
default. A renderer page cannot opt a module into remote context by assembling
or sending records itself. Apple Health samples, provenance, tombstones, and
anchors keep their stricter exclusion until a separate product and privacy
decision changes it.

### Lifecycle and failure behavior

The app follows one module lifecycle:

1. **Boot:** load the static catalog and shell without loading health data.
2. **Locked:** expose only the database gate and non-sensitive native actions.
3. **Unlock:** open SQLCipher, verify the database, run all required migrations,
   create a new database-session ID, then load module queries.
4. **Active:** mount registered pages and accept commands through platform
   gateways.
5. **Lock or switch:** stop module work, invalidate the session ID, clear caches
   and drafts, close the connection, then return to the gate.
6. **Close:** persist only approved bounded state and mark unfinished jobs as
   interrupted.

A migration or security-policy initialization failure blocks the data session.
A page render or query failure is isolated by a module error boundary so the
shell can show a localized recovery action without exposing raw errors or
crashing unrelated pages.

### Initial module boundaries

The first extraction should use these ownership boundaries:

- **health-core:** canonical profile, organ/system catalog, body annotations,
  shared health value contracts, and no top-level page;
- **overview:** body/organ workspace and status projections; owns no source
  health records;
- **labs:** lab reports, source bytes, accepted results, marker history, flags,
  report lifecycle, and lab analytics;
- **symptoms:** symptom records and symptom trends;
- **conditions:** condition records and current/managed/past state;
- **regimen:** medications, supplements, and regimen periods;
- **documents:** bounded file intake, rendering, extraction, and review; accepted
  lab documents are persisted through the public labs service;
- **apple-health:** normalized samples, provenance, tombstones, and sync anchors;
- **lifestyle:** activity, fasting sessions, and breathing tools, with separate
  subdomains if their data or rules grow independently;
- **assistant:** conversations, research, and recommendations; it requests
  module-approved health context through the platform AI gateway;
- **platform pages:** database gate, settings shell, privacy controls, and
  developer diagnostics.

A module does not need a top-level page. Conditions may initially contribute an
inspector panel, intake action, and timeline projection while still owning its
commands and tables.

### Incremental migration plan

This re-architecture must be incremental. Each phase keeps the native app usable
and existing encrypted databases readable.

1. **Characterize current contracts.** Add tests around unlock/lock, stale-path
   rejection, command validation, organ-status rules, current schema migration,
   and the data returned by existing pages. Record ownership for every command,
   table, and `user_state` field.
2. **Add composition roots.** Introduce the static renderer and Rust module
   catalogs. Register existing pages and commands through adapters without
   changing behavior or moving tables.
3. **Extract the platform kernel.** Add the typed Tauri client, opaque database
   session, route registry, shared policy gateways, and module error boundaries.
   Reduce `App` and the dashboard controller to shell/session concerns.
4. **Extract domain modules one at a time.** Move UI, business rules, commands,
   repositories, and tests together. Keep temporary public adapters so callers
   move without a big-bang rewrite.
5. **Split queries and durable state.** Replace the all-feature snapshot with
   module queries and composition projections. Add the migration registry and
   move durable domain data out of `user_state` through additive migrations.
6. **Centralize cross-module services.** Move status composition, timeline
   summaries, jobs, diagnostics, settings contributions, and AI context onto
   their typed contracts. Remove duplicate renderer business rules.
7. **Enforce boundaries.** Add checks for forbidden imports, direct `invoke()`,
   direct plugin use, duplicate registry entries, undocumented commands, and
   module SQL that touches another module's tables. Remove compatibility
   adapters only after all callers and migration tests pass.

### Completion rules

The modular migration is complete when:

- a new page is added through one module definition without editing a global
  conditional router or all-feature controller;
- a new data module declares owned tables, additive migrations, commands,
  validation, privacy behavior, and tests in one place;
- every health-data operation fails safely while locked or when its database
  session is stale;
- cross-module views use public read contracts and one authoritative Rust rule
  for derived medical status;
- no module persists health data in browser storage, sidecar files, or generic
  unbounded JSON state;
- remote context, files, network access, secrets, diagnostics, and exports still
  pass through the existing central security and privacy policies;
- disabling a module hides its contributions without deleting its data;
- command and schema changes remain documented in this file in the same change.

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
- `health_samples` stores normalized HealthKit quantity, category, and workout
  samples. HealthKit UUID is the deduplication key; provenance, metadata,
  timestamps, and deletion tombstones are retained.
- `healthkit_sync_state` stores one opaque anchored-query cursor per device and
  HealthKit type plus the last successful import time. Anchors are not returned
  by the status command.
- `ai_settings`
- `user_state`

`user_state` stores profile/activity/import/conversation data, including an
anatomy illustration preference that is independent from demographic sex, a
fasting timer and its recent completed sessions, legacy body notes, plus recent
`backgroundJobs`, `developerLogs`, and `llmCalls` entries. Each job has a kind
(`document-analysis`, `deep-research`, or `ai-chat`), status, created/finished
timestamps, optional staged progress, and an error message. Developer entries
are bounded metadata and truncated errors, not prompt or result payloads. This
is JSON state, not a new SQLite table or a separate hosted queue. The renderer
supports update and deletion for daily entries and body notes, deletion for
completed fasts and Apple Health import summaries, and rename or deletion for
assistant conversations through the same encrypted state write path.

Legacy body notes hold a local surface label, turntable angle, normalized X/Y
coordinate, note text, and creation timestamp. They are encrypted with the
rest of `user_state`; the current organ workspace does not create new surface
notes, while Timeline retains legacy-note editing. Active chat includes them
only when its provider is allowed to receive health context.

Enums:

- Health status: `normal`, `monitor`, `attention`
- Lab flag: `low`, `normal`, `high`, `unknown`
- Condition status: `current`, `managed`, `past`
- Regimen kind: `medication`, `supplement`
- Apple Health sample kind: `quantity`, `category`, `workout`

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

Schema changes must be additive. New tables use `CREATE TABLE IF NOT EXISTS`;
new columns are guarded by `PRAGMA table_info`.

## Commands

All Tauri commands are registered in `src-tauri/src/lib.rs`.

Database:

- `get_database_status`
- `select_database`
- `unlock_database`
- `lock_database`
- `export_database`

Dashboard and records:

- `get_dashboard_snapshot`
- `add_lab_result`
- `update_lab_result`
- `update_lab_results`
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

Apple Health sync foundation:

- `get_apple_health_sync_status`
- `import_apple_health_sync_batch`

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

## Apple Health Boundary

The existing `export.xml` flow is a bounded renderer worker that stores only an
import summary in encrypted `user_state`. It does not populate `health_samples`
and is independent of the native synchronization contract.

A future Tauri iOS Swift plugin owns `HKHealthStore`, user authorization,
`HKAnchoredObjectQuery`, and `HKObserverQuery`. It sends normalized batches to
`import_apple_health_sync_batch` only after the main SQLCipher database is
unlocked. The Rust command:

- accepts only the documented allowlist of HealthKit identifiers;
- accepts no more than 5,000 samples and 5,000 deletions per batch;
- validates UUIDs, RFC 3339 timestamps, finite values, sample kinds, provenance,
  and bounded metadata before opening a transaction;
- upserts by HealthKit UUID and applies deletion tombstones;
- advances the opaque per-device/type anchor in the same transaction as the
  sample writes, so a failed import cannot skip changes;
- checks the active database path to reject writes after a database switch.

The native bridge must use foreground catch-up synchronization first. The app
does not store the SQLCipher passphrase, so background HealthKit delivery cannot
write to the main database while it is locked. See `docs/apple-health-sync.md`
for the bridge contract and iOS provisioning checklist.

## AI Boundary

Provider settings live in `src/ai-sdk-config.ts` and persist in `ai_settings`.
Remote API key values are never stored; settings store environment-variable
names for remote providers. LM Studio can store a local server token directly
in the encrypted settings JSON and Rust uses it as a bearer token when present.

The live chat execution path is provider-aware through
`src-tauri/src/codex_cli.rs`. Each request includes its active conversation plus
the complete dated local health history: lab results, symptoms, conditions,
regimen, activity, fasting, body notes, Apple Health import coverage, report
metadata, organ status, and saved recommendations. Raw report files, local
paths, database paths, and developer diagnostics are excluded. Codex uses its
CLI; Anthropic, Gemini, OpenAI, and OpenAI-compatible providers use Rust HTTP
adapters. Local providers do not require remote-context consent. Remote
providers require the saved opt-in, and Rust resolves their API keys from
environment-variable names. LM Studio can use the saved local token directly.

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
AI work reports running/completed/failed state. Each document request owns its
own review session, so concurrent work stays visible and a later request never
replaces an earlier one.

## Current Module Map

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
- `components/fasting-page.tsx` - local fasting timer, conservative stage
  guidance, and reduced-motion-aware breathing practice.
- `components/body-canvas.tsx` - organ index and the anatomy stage with clickable organ hotspots.
- `components/organ-inspector.tsx` - selected-organ record: status, counts, recent signals, conditions.
- `components/charts/` - SVG chart components for labs, symptoms, regimen periods, document coverage, and AI context coverage.
- `charts/` - pure chart data transforms and scale utilities.
- `i18n.ts`, `i18n/locales/en.json` - typed UI copy catalog.
- `styles/tailwind.css` - Tailwind v4 entry; maps the OKLCH design tokens to theme colors via `@theme inline`.
- `styles/foundations.css` - token values and base resets only.
- `styles/app.css` - residual bespoke CSS for SVG data-viz, chat/markdown, and developer diagnostics. All app shell, navigation, and page chrome is Tailwind + shadcn.
- `document-intake.ts`, `document-rendering.ts`, `use-document-intake.ts`,
  `components/document-review.tsx` - validated document rendering and review flow.
- `developer-diagnostics.ts`, `use-developer-diagnostics.ts` - bounded local
  diagnostic models and persistence helpers.
- `ai-sdk-config.ts`, `ai-actions.ts`, `ai-conversation.ts` - AI settings and chat helpers.

Backend:

- `lib.rs` - app setup, command registration, snapshot commands.
- `database.rs` - SQLCipher database setup, unlock, migration, export.
- `apple_health.rs` - allowlisted Apple Health batch validation, transactional
  sample/tombstone persistence, anchor advancement, status, and unit tests.
- `records.rs`, `records/parse.rs`, `records/reports.rs`, `records/symptoms.rs` - lab, report, and symptom validation/storage.
- `conditions.rs` - condition validation/storage.
- `regimen.rs` - medication and supplement validation/storage.
- `document_files.rs` - document signature, size, type, and filename validation.
- `codex_cli.rs`, `codex_cli/document_analysis.rs` - provider-aware chat,
  consent-checked Codex document extraction, model discovery, structured output,
  HTTP/CLI timeouts, output draining, and per-request cleanup.
- `ai_settings.rs` - AI settings validation.

## Invariants

- Health data stays in encrypted local SQLite.
- Browser-only storage is not used for health records.
- Apple Health samples, provenance, tombstones, and anchors are not copied into
  developer diagnostics or remote AI context automatically.
- A HealthKit anchor advances only in the transaction that stores its associated
  samples and deletions.
- Background-job and developer diagnostic metadata are persisted with encrypted
  `user_state`; raw document bytes and health context stay governed by the
  existing intake and AI consent rules.
- Remote API keys never enter persisted settings; LM Studio may store a local token.
- Remote AI context is opt-in, never automatic.
- PDF/image intake is consent-gated AI extraction followed by mandatory manual
  review, then atomically saved with its source bytes inside encrypted SQLite.
- Charts use saved structured data only; they are record-review aids, not diagnostic quality scores.
- Rust validates before every write.
- New Tauri commands must be registered in `lib.rs`.
- Schema migrations are additive only.
