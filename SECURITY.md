# Security

Me Health Dashboard is local-first. There is no hosted backend, account system,
or default cloud sync. Health data is sensitive, so the default posture is to
keep it on the user's machine.

## Reporting

Report security issues privately through the repository's security advisory
feature if available. Do not include real health records, API keys, passphrases,
or exploit details in public issues.

## Data Storage

- The release database is SQLCipher-encrypted SQLite.
- The database is unlocked with a user passphrase.
- The passphrase is not stored by the app.
- Exports are encrypted SQLCipher database copies.
- Mutations go through the Rust backend after the database is unlocked.
- Browser-only storage is not used for health records.

## Development Mock

`bun run tauri:dev` always opens a copy-once plaintext database populated with
synthetic fixtures. It has no passphrase, and Lock, Open, New, and password
controls are disabled. Never put real health records, documents, API tokens, or
other secrets in the development mock. Release builds compile a separate
SQLCipher path and do not contain the mock fixture path.

## Apple Health

The Apple Health sync foundation stores normalized samples, source provenance,
deletion tombstones, and opaque anchored-query cursors in the release
SQLCipher database. Development uses synthetic mock data only.

- The Rust boundary accepts only an explicit allowlist of HealthKit identifiers.
- Batches are bounded to 5,000 samples and 5,000 deletions.
- UUIDs, RFC 3339 timestamps, finite numeric values, sample kinds, text lengths,
  and metadata shape are validated before any transaction starts.
- HealthKit UUIDs are used for idempotent upserts and deletion reconciliation.
- The next anchor is committed only with the associated samples and tombstones.
- Status output exposes counts and timestamps, not anchor values or sample data.
- A database-path guard rejects writes if the active database changes during a sync.
- Apple Health data is not added to developer diagnostics or remote AI context automatically.

The current repository does not yet contain a live iOS HealthKit plugin. The
existing `export.xml` import saves only a local count/date summary. A future
native bridge must request read-only permissions first and send normalized data
to Rust only after the main database is unlocked.

The app deliberately does not store the SQLCipher passphrase. Therefore,
HealthKit background delivery cannot write directly to the main database while
it is locked. Any future background staging design must use a separate bounded,
device-protected encrypted queue and must not weaken the main database key model.

## Secrets

Remote AI API keys are not stored in the database. AI settings store environment
variable names for remote providers, such as `ANTHROPIC_API_KEY` or
`OPENAI_API_KEY`. LM Studio can store a local server token in the release
encrypted settings database; do not save a real token in the plaintext
development mock. The Rust backend rejects raw `apiKey` fields and raw-looking
key values outside the LM Studio token field.

## AI Privacy

Local LLM providers are recommended first. Remote providers require explicit
opt-in before health context is sent outside the machine. User-entered health
records in prompts are JSON-encoded and labeled as untrusted data. AI responses are advisory
only and must not be treated as diagnosis, treatment, or emergency triage.

See `AI.md` for provider details.

## Documents

Imported document bytes are stored inside the release SQLCipher database in the
same transaction as their structured result rows. Development document intake
is for synthetic fixtures only. When remote health
context is enabled, a supported image or locally rendered PDF page is copied
into a permission-restricted, per-request Codex workspace and sent to the
configured model. Their original bytes are not placed in that workspace, and
Rust bounds the total rendered page payload before execution. Rust validates
signatures, sizes, saved consent, and the selected model. The workspace is
removed afterward.

The native Developer page stores only bounded diagnostic metadata in
`user_state`: command, model, timing, counts, lifecycle messages, and truncated
errors. That state is encrypted in release and plaintext in the synthetic-only
development mock. Prompt text, extracted result rows, and API keys are excluded.

## Known Limits

- The native HealthKit bridge and iOS entitlement/provisioning work are not yet implemented.
- Codex CLI read-only mode prevents writes but does not confine filesystem reads
  to the ephemeral document workspace. Document content is treated as untrusted
  and user configuration is ignored, but this is not an OS-level read sandbox.
- Previously imported sidecar files from older development builds are not
  automatically deleted; remove them manually after confirming an encrypted
  export contains the corresponding report.
- Security work targets the current app state; use the release checklist before
  storing real records.
- The app does not replace full-device disk encryption, operating-system
  account security, or safe backup handling.
