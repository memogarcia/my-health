# Security

Me Health Dashboard is local-first. There is no hosted backend, account system,
or default cloud sync. Health data is sensitive, so the default posture is to
keep it on the user's machine.

## Reporting

Report security issues privately through the repository's security advisory
feature if available. Do not include real health records, API keys, passphrases,
or exploit details in public issues.

## Data Storage

- The main database is SQLCipher-encrypted SQLite.
- The database is unlocked with a user passphrase.
- The passphrase is not stored by the app.
- Exports are encrypted SQLCipher database copies.
- Mutations go through the Rust backend after the database is unlocked.
- Browser-only storage is not used for health records.

## Secrets

AI API keys are not stored in the database. AI settings store environment
variable names only, such as `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. The Rust
backend rejects raw `apiKey` fields and raw-looking key values in settings.

## AI Privacy

Local LLM providers are recommended first. Remote providers require explicit
opt-in before health context is sent outside the machine. User-entered health
records in prompts are delimited as untrusted data. AI responses are advisory
only and must not be treated as diagnosis, treatment, or emergency triage.

See `AI.md` for provider details.

## Documents

Attached document copies are stored in the app data directory after backend
size/type validation. On Unix systems, the app writes these copies with
owner-only permissions. Document-analysis files used by Codex are temporary and
removed after success, failure, or timeout.

## Known Limits

- Local document copies are protected by filesystem permissions, not by the
  SQLCipher database.
- Security work targets the current app state; use the release checklist before
  storing real records.
- The app does not replace full-device disk encryption, operating-system
  account security, or safe backup handling.
