# Release Checklist

Use this before storing real health records or shipping a build.

- Run `npm test`.
- Run `npm run check`.
- Run `npm run tauri:build`.
- Verify first-run encrypted setup in `npm run tauri:dev` without mock data.
- Verify optional mock data only with `ME_HEALTH_USE_MOCK_DB=1`.
- Confirm AI defaults to Not configured and Codex requires explicit remote-context opt-in.
- Confirm document extraction requires review of organ, date, status, and value before saving.
- Confirm edit/delete flows hide deleted records from dashboard counts, trends, prompts, and documents.
- Export an encrypted backup and verify it unlocks with the export passphrase.
- Do not use real medical records in screenshots, tests, issues, or logs.
