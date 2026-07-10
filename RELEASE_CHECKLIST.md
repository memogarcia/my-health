# Release Checklist

Use this before storing real health records or shipping a build.

- Run `npm test`.
- Run `npm run check`.
- Run `npm run lint:rust`.
- Run `npm run tauri:build`.
- Verify first-run encrypted setup in `npm run tauri:dev` without mock data.
- Verify optional mock data only with `ME_HEALTH_USE_MOCK_DB=1`.
- Confirm AI defaults to Not configured and Codex requires explicit remote-context opt-in.
- Confirm document imports require manual review of organ, date, status, and value before saving.
- Confirm edit/delete flows hide deleted records from dashboard counts, trends, prompts, and documents.
- Export an encrypted backup, verify it unlocks with the export passphrase, and confirm imported document bytes are present.
- Build with an Apple Developer ID Application identity, hardened runtime, and timestamping enabled.
- Submit the app for notarization, staple the ticket to the app and DMG, then run `spctl -a -t exec -vv <app>` on a clean Mac.
- Run `codesign --verify --deep --strict --verbose=2 <app>` and confirm the expected TeamIdentifier.
- Do not use real medical records in screenshots, tests, issues, or logs.
