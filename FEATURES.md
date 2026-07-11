# Features

This document is the behavior inventory for Me Health Dashboard as of 2026-07-10.
It covers the current renderer and Rust data layer. `DESIGN.md` owns visual and
interaction rules; `ARCHITECTURE.md` owns technical contracts.

## Product scope

Me Health Dashboard is a Tauri-only desktop app for one person tracking health
records on a local machine. The app has no hosted backend, account system, or
default cloud sync. It is a personal tracking and review tool, not medical
advice, diagnosis, treatment, or emergency triage.

## Runtime and startup

- Runs as a native Tauri desktop app. The raw Vite URL is unsupported.
- Guards the renderer when the Tauri runtime is unavailable and shows a desktop
  only error state.
- Loads the database status before loading the rest of the app.
- Shows a loading state while the native database state is being prepared.
- Supports a first-run setup flow for creating a new encrypted database.
- Supports opening an existing SQLite database through the native file picker.
- Supports creating a new local database path through the native file picker.
- Supports unlocking an existing database with a passphrase.
- Requires a minimum passphrase length and validates confirmation during setup
  and migration.
- Supports migrating an older plaintext local database into encrypted storage.
- Does not store the SQLCipher passphrase.
- Resets the active in-memory snapshot when the user switches databases.
- Configures native menu actions for opening and creating databases.
- Supports platform-aware keyboard shortcuts in the previous renderer,
  including settings, new result, and numbered navigation shortcuts.

## Local storage and privacy

- Stores records in SQLCipher-encrypted SQLite owned by the Rust backend.
- Keeps the active database connection locked until the user unlocks it.
- Routes renderer mutations through Tauri commands and Rust validation.
- Uses soft deletion for lab results, symptoms, conditions, regimen items, and
  lab reports where supported.
- Stores the following durable data in the encrypted database:
  - organ-linked health records;
  - saved report source bytes and report metadata;
  - AI provider settings;
  - profile and activity state;
  - fasting state and completed sessions;
  - legacy body notes;
  - Apple Health import summaries and future sync state;
  - assistant conversations;
  - background job metadata;
  - bounded developer diagnostics.
- Does not use browser `localStorage` or IndexedDB for health records.
- Exports an encrypted SQLCipher copy to a generated local file path.
- Never stores remote provider API key values in the database. Remote settings
  store the name of an environment variable instead.
- Allows an LM Studio local server token to be stored in encrypted settings.
- Treats health data, reports, prompts, and API credentials as sensitive.

## Body and organ workspace

The body workspace is the primary product concept in the existing implementation.

- Shows a body-system and organ browser for:
  - brain;
  - thyroid;
  - lungs;
  - heart;
  - liver;
  - spleen;
  - stomach;
  - pancreas;
  - kidneys;
  - intestines;
  - bladder;
  - blood;
  - bones;
  - skin;
  - reproductive system.
- Separates individual organs from whole-body systems.
- Allows selecting an organ from the organ list.
- Shows an organ's linked record count.
- Shows a derived organ state: `normal`, `monitor`, or `attention`.
- Shows a compact overview of tracked areas, follow-up counts, and latest
  activity date.
- Provides quick links to areas that need attention or monitoring.
- Shows a static anatomy image with clickable organ hotspots.
- Uses a female anatomy image when the saved profile sex is `female`.
- Uses the default anatomy image for other profile values.
- Preserves legacy body notes in encrypted user state and exposes them from
  Timeline for editing or deletion.
- Shows the selected organ's system, summary, status, latest lab series,
  recent symptoms, and conditions.
- Provides a quick action to add a lab result for the selected organ.
- Provides a quick action to log a symptom for the selected organ.
- Provides trend previews for the selected organ's lab markers.
- Provides links from an organ preview to global lab or symptom history.
- Allows the previous body sections to collapse and reopen independently.
- Announces selected-organ changes to assistive technology.

### Organ-state rules

- Lab state uses the latest result for each normalized marker within an organ.
- A current symptom is one observed from the inclusive local-date 30-day
  lookback through today.
- A symptom with severity 4 or 5 contributes `attention`.
- A current symptom with severity 2 or 3 contributes `monitor`.
- A latest lab with follow-up priority `attention` contributes `attention`.
- A latest lab with follow-up priority `monitor` contributes `monitor`.
- A condition with status `current` contributes `monitor`.
- Older symptoms, superseded lab results, and `managed` or `past` conditions do
  not keep an organ in a higher current state.
- Historical rows still remain available in history and counts.

## Labs and results

- Adds one lab result manually.
- Adds multiple lab results from a reviewed document-import batch.
- Associates each result with an organ or body system.
- Stores marker name, value, unit, reference range, measured date, notes, and
  follow-up priority.
- Requires an explicit follow-up priority when creating or accepting a result:
  `normal`, `monitor`, or `attention`.
- Derives numeric value, reference bounds, and lab flag in Rust.
- Supports lab flags `low`, `normal`, `high`, and `unknown`.
- Keeps lab flag separate from user-selected follow-up priority.
- Updates one lab result.
- Updates selected fields on multiple results in one bulk operation.
- Soft-deletes a lab result.
- Displays the latest result set in the body workspace.
- Displays history with marker, value, unit, date, status, flag, and notes
  context.
- Searches results by marker and related text.
- Filters results by organ or body system.
- Clears active history filters.
- Switches between list and grouped marker views.
- Shows empty states for no results and no matching filters.
- Shows marker trend sparklines and organ trend previews.
- Shows lab analytics for marker status and data coverage.
- Shows reference ranges through normalized strips or chart context where data
  permits.
- Uses tabular numeric formatting for aligned values.
- Allows opening a report-linked result in the existing result editor.

## Symptoms

- Adds a symptom with organ/body-system association.
- Supports an `Other` organ choice for symptoms that do not match a listed
  organ.
- Stores symptom name, severity from 1 through 5, observed date, and notes.
- Updates a symptom.
- Soft-deletes a symptom.
- Searches symptoms.
- Filters symptoms by organ/body system.
- Clears symptom filters.
- Shows a symptom severity chart.
- Shows a chronological symptom timeline.
- Shows symptom severity as a derived visual follow-up state while retaining
  the numeric severity.
- Shows recent symptoms for the selected organ in the body inspector.

## Conditions

- Adds a condition directly to the selected organ.
- Stores condition name, status, diagnosed date, and notes.
- Supports condition statuses `current`, `managed`, and `past`.
- Updates a condition, including changing its organ association.
- Soft-deletes a condition.
- Shows conditions in the selected-organ inspector.
- Uses the current condition status when deriving organ follow-up state.

## Medications and supplements

- Adds a regimen item as either a medication or supplement.
- Stores name, dose, unit, frequency, start date, stop date, reason, notes, and
  active state.
- Supports drafts prepared by assistant actions before saving.
- Edits a saved regimen item inline.
- Stops an active regimen item.
- Reactivates a stopped regimen item.
- Soft-deletes a regimen item.
- Separates active and stopped items.
- Shows active and stopped counts.
- Shows a regimen timeline based on saved dates.
- Displays medication/supplement kind and active/stopped status.

## Daily health context

- Opens a daily-log entry form from the shell, body workspace, or lifestyle
  area.
- Stores date, activity name, duration in minutes, cigarette count, drink count,
  and notes.
- Shows saved daily entries in reverse chronological order.
- Uses a dedicated Daily Log page for adding, editing, and deleting entries.
- Uses daily entries as local context for lifestyle suggestions and AI prompts.
- Keeps daily log data in encrypted user state.

## Fasting

- Stores a selected fasting target of 12, 14, 16, or 18 hours.
- Starts a local fasting timer.
- Updates elapsed time once per second while active.
- Prevents changing the target while a fast is active.
- Ends the active fast and stores a completed session.
- Shows elapsed time and active/ready state.
- Shows conservative stage guidance at 0, 4, 8, 12, 16, and 18 hours.
- Labels stage timing as an estimate and explains the factors that shift it.
- Shows time remaining to the target and the next zone within that target.
- Shows the current stage in text as well as through progress feedback.
- Shows up to the five most recent completed fasting sessions.
- Deletes completed fasting sessions from local history.
- Persists the active timer and session history in encrypted user state.
- Displays safety education and stop/contraindication guidance.
- Does not present fasting stages as individualized medical advice.

## Breathing practice

- Provides a paced breathing technique with 4-second inhale and 6-second exhale.
- Provides a box breathing technique with 4-second inhale, hold, exhale, and
  hold phases.
- Provides a Wim Hof-style high-intensity technique with 30 cycles of 2-second
  inhale and 2-second exhale.
- Shows technique descriptions and safety guidance.
- Requires explicit safety acknowledgment before starting the high-intensity
  technique.
- Starts, pauses, resumes, and resets the breathing timer without losing the
  current phase position.
- Shows a live countdown, phase sequence, and round count.
- Animates inhale and exhale for the full configured phase duration.
- Stops the finite high-intensity sequence after its configured cycle count.
- Provides a visual breathing orb and reduced-motion behavior.
- Never guides a breath hold in the Wim Hof-style technique.
- Displays safety education and does not present practice guidance as medical
  treatment.

## Documents and report intake

- Accepts supported PDF and image files for result extraction.
- Supports drag-and-drop and file-picker selection.
- Validates file names, signatures, types, and size limits locally and again in
  Rust.
- Renders PDF pages locally into bounded JPEG images before analysis.
- Uses an ephemeral, permission-restricted per-request workspace for Codex
  document analysis.
- Keeps the original document bytes out of the Codex workspace.
- Requires a configured model and explicit remote-health-context consent before
  sending a document for extraction.
- Treats document contents as untrusted input during analysis.
- Requests schema-constrained structured result drafts.
- Shows a separate review session for each in-progress document request.
- Keeps concurrent document requests visible through background jobs and review
  tabs.
- Shows analysis, no-results, and error states.
- Lets the user edit extracted marker, value, unit, reference range, organ,
  follow-up priority, date, and notes.
- Lets the user remove an extracted result row.
- Lets the user add a result row manually during document review.
- Requires the user to review and accept rows before saving them.
- Saves accepted result rows and the source document bytes in encrypted SQLite.
- Lists saved reports with source name, type, size, date, and result count.
- Opens report-linked results in a dialog.
- Selects all or individual linked results.
- Applies an organ, follow-up priority, or measured date to selected linked
  results in one bulk operation.
- Opens the existing single-result editor from linked report results.
- Unlinks a report without deleting its linked results.
- Deletes a report while keeping linked results when requested.
- Deletes a report and its linked results when requested.
- Migrates eligible older sidecar document copies into encrypted report bytes.

### Genetics area

- Provides a genetics report upload area in the current Documents surface.
- Currently routes supported uploads through the same document result-review
  flow as other lab/result documents.
- Does not currently parse raw genotype data or calculate genetic risk scores.
- Clearly labels future genetics capabilities as future work.

## Apple Health

### Current user-facing import

- Accepts an Apple Health `export.xml` file.
- Parses it in a renderer worker rather than blocking the UI thread.
- Stores a local import summary with source name, import time, record count,
  workout count, and date coverage.
- Deletes a saved import summary without changing source Apple Health data.
- Shows recent import summaries.
- The current XML flow does not populate normalized `health_samples`.

### Implemented sync foundation

- Exposes a Rust status command for the future native Apple Health sync.
- Accepts normalized quantity, category, and workout sample batches.
- Validates an allowlisted set of HealthKit identifiers.
- Bounds batches to 5,000 samples and 5,000 deletions.
- Validates UUIDs, RFC 3339 timestamps, finite values, sample kinds, provenance,
  and bounded metadata.
- Upserts by HealthKit UUID and keeps deletion tombstones.
- Stores one opaque anchored-query cursor per device and HealthKit type.
- Advances an anchor only in the same transaction as its sample changes.
- Rejects writes if the active database changed during synchronization.
- Does not expose anchor values through status output.
- Does not yet include a live iOS HealthKit plugin, entitlement setup, or
  background HealthKit delivery.

## Assistant chat

- Provides a saved conversation/thread list.
- Starts a new conversation.
- Selects an existing conversation.
- Renames or deletes a saved conversation.
- Persists conversation title, timestamps, messages, provider, model, and error
  state.
- Sends a free-form prompt with Enter-to-send and Shift+Enter for a newline.
- Renders assistant responses as sanitized Markdown with GitHub-flavored
  formatting support.
- Shows pending, error, empty, and unavailable-provider states.
- Shows a compact prompt entry point in the previous shell on eligible pages.
- Can prepare regimen drafts from assistant actions.
- Can navigate to the relevant app area from assistant actions.
- Sends the complete dated local health context only according to the selected
  provider's local/remote consent rules.
- Includes labs, symptoms, conditions, regimen, activity, fasting, body notes,
  Apple Health coverage, report metadata, organ state, and saved recommendations
  in the allowed context.
- Excludes raw report files, local paths, database paths, and developer
  diagnostics from chat health context.
- Frames output as advisory and non-emergency.

## AI providers and settings

- Supports a disabled/unconfigured state.
- Supports Codex CLI.
- Supports Anthropic.
- Supports OpenAI.
- Supports Gemini.
- Supports LM Studio.
- Supports Ollama.
- Supports a custom OpenAI-compatible endpoint.
- Selects a provider and model.
- Discovers available Codex models through the native command when possible.
- Selects Codex reasoning effort: minimal, low, medium, high, or xhigh.
- Configures an OpenAI-compatible base URL when required.
- Configures an environment-variable name for remote provider API keys.
- Configures an optional LM Studio local token.
- Requires explicit remote health-context consent for remote providers.
- Keeps local provider requests on-device where configured.
- Revalidates provider, model, database, and consent at the Rust boundary before
  each request.
- Uses five-minute request timeouts and bounded output handling.

## Lifestyle planning and research

- Generates local, non-AI lifestyle suggestions from saved records and daily
  context.
- Groups local suggestions into categories such as activity, exercise, and
  breathing.
- Shows supporting evidence labels and a follow-up priority.
- Shows a weekly routine based on the local plan.
- Opens the daily log from the lifestyle surface.
- Offers an AI refine action when a configured model is available.
- Provides a combined Research area with Lifestyle and Deep Research tabs.
- Builds a deep-research brief from the current local context.
- Shows context coverage counts and data coverage bars.
- Requires the user to open and review the generated research prompt before
  starting deep research.
- Starts deep research as a tracked background job.
- Labels lifestyle and research output as advisory.

## Background jobs

- Persists recent background jobs in encrypted user state.
- Tracks document analysis, deep research, and AI chat jobs.
- Shows running, completed, failed, stopped, and interrupted states.
- Shows staged progress when known and indeterminate progress otherwise.
- Keeps jobs visible across navigation and reloads.
- Keeps each document request associated with its own job and review session.
- Shows bounded error text.
- Stops a run by discarding its result after an already-started Codex call
  returns; it does not claim to terminate that external process.
- Clears completed, failed, and stopped jobs while retaining running jobs.
- Does not claim model-reported progress when only staged progress is known.

## Developer diagnostics

- Provides a local Developer area for troubleshooting AI/document work.
- Shows a compact list of active and recent runs with view and stop controls.
- Keeps detailed calls and lifecycle logs behind a diagnostics disclosure.
- Shows bounded LLM metadata: command, kind, input label, model, reasoning
  effort, start time, duration, prompt character count, file bytes, rendered
  page count, and output character count.
- Shows a chronological renderer event log with area, level, message, and
  bounded detail.
- Shows running, completed, and failed call states.
- Clears saved developer diagnostics.
- Persists diagnostics in encrypted user state.
- Excludes prompt contents, extracted result rows, health payloads, secrets,
  and API keys from the diagnostics surface.

## Cross-cutting UI behavior

The current renderer provides:

- Typed English i18n catalog with a hard check for unlocalized user-facing
  strings.
- Shared shadcn/Radix controls for fields, buttons, cards, dialogs, tabs,
  tables, calendars, popovers, progress, alerts, badges, and empty states.
- Shared ISO date-picker wrapper.
- Toast feedback for successful and failed mutations.
- Native database menu integration.
- Keyboard focus movement to the page heading after navigation.
- Visible focus rings and accessible labels for controls.
- Live-region announcements for selected organ changes, long-running jobs, and
  AI availability.
- Reduced-motion handling for breathing, fasting, and transition feedback.
- Responsive layout rules for desktop window resizing.
- Loading skeletons, empty states, confirmation prompts for destructive actions,
  and inline validation errors.

## Explicit non-features and current limits

- No hosted backend or user account system.
- No default cloud sync.
- No supported browser deployment.
- No diagnosis, treatment recommendation, or emergency triage.
- No automatic medication dosing or clinical decision support.
- No live iOS HealthKit bridge or background HealthKit delivery yet.
- No normalized sample display for the current `export.xml` import.
- No raw genotype parsing or genetic-risk scoring.
- No automatic acceptance of AI-extracted result rows.
- No raw API key persistence for remote providers.
- No storage of the SQLCipher passphrase.
- No claim that charts or derived statuses are diagnostic quality scores.

The authoritative behavior is the current source code and Rust command
contracts.
