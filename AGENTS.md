# AGENTS.md instructions

## How these docs fit together

Each file owns one concern. Read the relevant one before editing; update it in
the same change as the code. Do not duplicate owned facts across files —
reference them.

- `README.md` — simple public overview and local run instructions.
- `SECURITY.md` — security posture, privacy rules, reporting, and known limits.
- `AI.md` — AI provider posture, local-first recommendation, and AI safety rules.
- `ARCHITECTURE.md` — **technical source of truth**: stack, data flow, the full
  Tauri command list, the database schema and enums, the AI boundary, module map.
- `PRODUCT.md` — what and why: users, purpose, brand, medical-safety framing, scope.
- `DESIGN.md` — visual system: tokens, status color mapping, layout, components, motion.
- `AGENTS.md` (this file) — how agents operate: conventions, guardrails, verification.

When a fact appears in two files, ARCHITECTURE.md wins for technical facts and
DESIGN.md wins for visual facts. Keep them aligned.

## Project

A Tauri-only local-first personal health dashboard. Health data lives in a
SQLCipher-encrypted SQLite database owned by the Rust backend. The raw Vite URL
is unsupported; the renderer guards on `isTauriRuntime()`.

UI concept image: `assets/health-dashboard-ui-concept.png`.

## Product Direction

See `PRODUCT.md` for the full direction. Summary for daily work:

- Build the dashboard experience, not a marketing landing page.
- Keep the body-and-organ selector as the primary workspace.
- Track labs, results, symptoms, conditions, medications, and history by organ
  or body system when possible.
- Keep dense medical data scannable: compact panels, clear status states,
  readable trends.
- Avoid decorative hero layouts, oversized cards, and purely aesthetic graphics.

## AI

Full spec in `ARCHITECTURE.md` → "AI Configuration" and "AI Boundary".

- Provider catalog in `src/ai-sdk-config.ts`: Anthropic, OpenAI, Gemini, LM
  Studio, Ollama, Codex CLI, plus a custom OpenAI-compatible escape hatch.
- Selection persists in the `ai_settings` SQLite table as one JSON document.
- Remote provider API keys are referenced by **environment-variable name** and
  never stored in the database. LM Studio may store a local server token in the
  encrypted settings JSON because the app Settings form is the only configuration
  surface for that local provider.
- The only live prompt path is the Codex CLI (`codex exec`), gated by
  `hasEnabledCodexModel` (provider + `allowRemoteHealthContext` + model).
- Dropped images/PDFs are validated locally, sent to Codex for extraction only
  when `allowRemoteHealthContext` is enabled, reviewed as structured rows, then
  stored inside encrypted SQLite with their accepted results. Rust revalidates
  consent and the selected model before every extraction.

## Medical Safety and Privacy

- Do not present AI output as diagnosis, treatment, or emergency triage.
- Frame recommendations as lifestyle, follow-up, or clinician-discussion items.
- Treat health data as sensitive by default. Do not hardcode real personal medical details.
- Use obviously synthetic sample data only when needed for local UI work.
- Health data stays local unless the user explicitly opts in via
  `allowRemoteHealthContext`; that opt-in is off by default.

## Coding Conventions

### General

- Reuse existing patterns, helpers, components, APIs, and types before adding new ones. Keep code DRY.
- Prefer small, reversible edits. Inspect the worktree before editing; preserve unrelated changes.
- Use precise file edits and inspect references before changing shared code.
- Use symbol lookup tools when available.
- Keep secrets, credentials, and real medical data out of outputs, commits, and logs.

### Renderer (`src/`)

- TypeScript strict. Run `bun run typecheck` before finishing.
- All Tauri calls go through `invoke()` in `use-dashboard-controller.ts`. Do not
  call `invoke` directly from leaf components; add a controller method.
- All user-facing strings go through `t(key, values)` from `src/i18n.ts`. Never
  hardcode UI text — the `check:i18n` gate fails on any violation.
- Use shadcn primitives from `src/components/ui/`. Add new primitives through
  `components.json`, not hand-rolled equivalents.
- Use Tailwind utilities and the design tokens in `DESIGN.md`. Do not introduce
  raw hex/oklch values in components.
- Do not add browser-only persistence (localStorage, IndexedDB). Health data
  belongs in the encrypted SQLite backend.

### Backend (`src-tauri/src/`)

- Every command is registered in `invoke_handler!` in `lib.rs`. Add new commands
  there and document them in `ARCHITECTURE.md` → "Commands" in the same change.
- Validate all input at the Rust trust boundary before any write: required
  fields, ISO dates, enum values, ranges. Reuse validators in `records/parse.rs`.
- Inputs are `#[serde(rename_all = "camelCase")]`; the renderer sends camelCase.
- Derive `lab_results.flag` in Rust (`derive_flag`), never from the renderer.
- Keep mutations behind `database::with_connection`; the connection is locked
  until `unlock_database` succeeds.

### Database changes

- Schema changes are additive `ALTER TABLE ... ADD COLUMN`, guarded by
  `PRAGMA table_info` in `migrate_schema`. Never drop or rename in a migration.
- Update the schema table and enums in `ARCHITECTURE.md` when the schema changes.
- Add Rust tests for new commands and validators (mirror the existing
  `#[cfg(test)] mod tests` blocks).

## Implementation Defaults

- Use the framework, dependencies, and patterns already present.
- Do not add dependencies for simple UI state, date formatting, or small data transforms.
- Start with the smallest useful flow; expand deliberately.
- Use accessible controls, visible focus states, and readable contrast (see `DESIGN.md`).
- Store generated visual assets in `assets/` with descriptive filenames.

## Verification

Commands (see `package.json` and `.husky/`):

| Command | What it does |
| --- | --- |
| `bun run tauri:dev` | Run the native app (the only supported dev runtime) |
| `bun run tauri:build` | Production build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | JS tests (`scripts/run-tests.mjs`) + Rust tests (`scripts/run-rust-tests.mjs`) |
| `bun run check` | Console, size, locale shape, i18n baseline |

- Pre-commit (`.husky/pre-commit`) runs `check:console`, `check:size`,
  `check:i18n-locales`, `check:i18n`. Run it once you finish work.
- Pre-push (`.husky/pre-push`) runs `typecheck`, `test`, `build`, `check`. Run
  it before pushing or when the change touches release-critical code.
- Run the smallest relevant check before finishing and report what passed.
- For UI work, run `bun run tauri:dev` and verify the exact native screen. Do
  not treat a raw browser/Vite session as supported app verification.
