# Product

This file owns the **what and why**: who uses the app, what it does, the brand
voice, the medical-safety framing, and the scope boundaries. Technical facts
(runtime, schema, commands) live in `ARCHITECTURE.md`; visual rules live in
`DESIGN.md`. When those change, update there, not here.

## Register

product

## Users

One person reviewing labs, medical-result history, symptoms, conditions,
medications, and daily health context on a local machine. Not a browser app:
health data lives in local encrypted SQLite owned by the Tauri/Rust backend.

## Product Purpose

Connect health records to body systems so the user can scan what changed, find
the related organ or system, and decide what to track or discuss with a
clinician. The body-and-organ selector is the primary workspace; everything
else supports reading and adding data around it.

## Primary Flows

- **Body workspace** — a drag-controlled 3D anatomical scene. Select an organ to see its latest labs,
  symptoms, and conditions in a detail rail, or click any exact surface area to
  save a local body note. Selecting Female in Profile automatically shows the
  women’s full-body model.
- **Labs and history** — add a single result or a batch from a dropped report,
  review entered values, and read trends over time.
- **Symptoms and conditions** — log severity and dates against an organ.
- **Medications and supplements** — track active and stopped regimen items.
- **Fasting and breathwork** — save a local fasting timer and recent sessions,
  see conservative stage guidance, and use a short paced-breathing timer. The
  high-intensity Wim Hof option requires an explicit safety acknowledgment and
  never guides a breath hold.
- **Documents** — drop a PDF or image, extract draft measurements with the
  configured opt-in AI, review them, then save the source bytes and accepted
  structured results inside encrypted SQLite. Saved reports open their linked
  results for individual or selected-group edits.
- **Assistant** — advisory AI chat and deep research, gated by an explicit
  remote-context opt-in.

## Brand Personality

Private, clinical, calm.

The interface should feel like a quiet clinical tool: dense but legible,
status-driven, and free of decoration that does not aid a decision.

## Design Principles

- Keep the body-and-organ selector as the primary workspace.
- Make dense medical data compact, readable, and status-driven.
- Keep AI suggestions advisory and framed for lifestyle tracking or clinician discussion.
- Prefer local-first storage and avoid hardcoded personal medical details.
- Keep the supported runtime native-only: Tauri owns SQLite access; Vite is renderer tooling only.
- Use existing controls and patterns before adding new UI systems.

Visual specifics (tokens, color, type, motion) live in `DESIGN.md`.

## Medical Safety and Privacy

- Do not present AI output as diagnosis, treatment, or emergency triage.
- Frame recommendations as lifestyle, follow-up, or clinician-discussion suggestions.
- Treat health data as sensitive by default. Do not hardcode real personal medical details.
- Fasting stages and breathwork are general education, not individualized
  recommendations. Surface contraindications and stop guidance before a fast
  or an intense breathing practice.
- Use obviously synthetic sample data only when needed for local UI work.
- Health data stays local unless the user explicitly opts in to sending specific context to a remote provider; that opt-in is off by default.
- The database is SQLCipher-encrypted from the first run; remote API keys are referenced by environment-variable name, while a local LM Studio token can be stored in encrypted settings.

The AI boundary and trust model are specified in `ARCHITECTURE.md`.

## Accessibility and Inclusion

Use accessible controls, visible focus states, readable contrast, and
reduced-motion support. Health status must not rely on color alone — every
status has a label and an icon/dot. Specifics live in `DESIGN.md`.

## Anti-references

Do not make this a marketing landing page, decorative wellness app, oversized
hero layout, or AI diagnosis surface.

## Scope Boundaries

- In scope: local organ-scoped tracking, result intake, advisory AI, encrypted export.
- Out of scope: hosted backend, browser deployment, diagnosis, automated treatment, emergency triage, syncing health data to the cloud by default.
