# Apple Health sync

## Status

This document defines the native synchronization contract. The repository now
contains the encrypted tables and validated Rust ingestion commands, but it does
not yet contain an initialized Tauri iOS target, Apple Health entitlement, or
live Swift HealthKit plugin.

The existing Documents-page `export.xml` import remains a summary-only flow. It
stores record/workout counts and date coverage in encrypted `user_state`; it does
not populate the normalized `health_samples` table.

## Architecture

```text
Apple Health / HealthKit
        |
        | HKObserverQuery + HKAnchoredObjectQuery
        v
Tauri iOS Swift plugin
        |
        | normalized camelCase batch
        v
import_apple_health_sync_batch
        |
        | one SQLite transaction
        v
health_samples + healthkit_sync_state
```

HealthKit access must remain inside native Swift. React components must not call
HealthKit directly. The Swift bridge sends normalized data to the Rust command,
which remains the validation and persistence boundary.

## Initial iOS setup

1. Initialize the Tauri iOS target with the repository's Tauri CLI.
2. Open the generated Xcode project.
3. Add the HealthKit capability and `com.apple.developer.healthkit` entitlement.
4. Add `NSHealthShareUsageDescription` with a specific explanation of why the
   selected measurements are read.
5. Do not add `NSHealthUpdateUsageDescription` in the first release. Initial
   synchronization is read-only.
6. Implement the bridge as a Tauri mobile plugin in Swift.
7. Test authorization and queries on a physical iPhone; the simulator is not a
   sufficient source of representative Health data.

The first production slice should run foreground catch-up sync only. The main
database cannot be written while locked, and the app does not retain its
SQLCipher passphrase.

## Native plugin surface

The Swift plugin should expose a narrow interface:

```swift
isAvailable() -> Bool
requestAuthorization(typeIdentifiers: [String])
sync(typeIdentifiers: [String], deviceId: String)
startObservers(typeIdentifiers: [String], deviceId: String)
```

`requestAuthorization` must request only the data types the user explicitly
enables. Authorization is partial: denial for one type must not block syncing
other authorized types.

`sync` performs one `HKAnchoredObjectQuery` per type. `startObservers` uses
`HKObserverQuery` only as a change signal and follows each signal with an
anchored query. The app must also run a foreground catch-up sync after unlock,
because observer delivery is not a guarantee that the database was writable.

## Supported type identifiers

The Rust trust boundary currently accepts:

- `HKQuantityTypeIdentifierStepCount`
- `HKQuantityTypeIdentifierDistanceWalkingRunning`
- `HKQuantityTypeIdentifierBodyMass`
- `HKQuantityTypeIdentifierHeartRate`
- `HKQuantityTypeIdentifierRestingHeartRate`
- `HKQuantityTypeIdentifierWalkingHeartRateAverage`
- `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`
- `HKQuantityTypeIdentifierRespiratoryRate`
- `HKQuantityTypeIdentifierOxygenSaturation`
- `HKQuantityTypeIdentifierBloodPressureSystolic`
- `HKQuantityTypeIdentifierBloodPressureDiastolic`
- `HKQuantityTypeIdentifierBloodGlucose`
- `HKQuantityTypeIdentifierActiveEnergyBurned`
- `HKQuantityTypeIdentifierBasalEnergyBurned`
- `HKQuantityTypeIdentifierAppleExerciseTime`
- `HKCategoryTypeIdentifierSleepAnalysis`
- `HKWorkoutTypeIdentifier`

Adding a new type requires updating the Rust allowlist, normalization tests,
unit mapping, and user-facing authorization copy in the same change.

## Batch contract

Invoke `import_apple_health_sync_batch` with the active database path and one
HealthKit type per batch.

```json
{
  "dbPath": "/path/to/health-dashboard.sqlite3",
  "input": {
    "deviceId": "11111111-1111-4111-8111-111111111111",
    "typeIdentifier": "HKQuantityTypeIdentifierStepCount",
    "nextAnchor": "base64-encoded-secure-anchor",
    "samples": [
      {
        "uuid": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "sampleKind": "quantity",
        "startAt": "2026-07-10T08:00:00+09:00",
        "endAt": "2026-07-10T08:05:00+09:00",
        "numericValue": 4200,
        "categoryValue": null,
        "unit": "count",
        "workoutActivityType": null,
        "durationSeconds": null,
        "totalEnergyKcal": null,
        "totalDistanceMeters": null,
        "sourceName": "Apple Watch",
        "sourceBundleId": "com.apple.health",
        "sourceVersion": "1",
        "metadata": {}
      }
    ],
    "deletedUuids": []
  }
}
```

Quantity samples require `numericValue` and a canonical unit. Sleep samples use
`sampleKind: "category"` and require `categoryValue`. Workouts use
`sampleKind: "workout"` and require `workoutActivityType` and
`durationSeconds`; energy and distance remain optional.

The command returns inserted, updated, and deleted counts plus the total active
sample count. It does not return raw records or anchors.

## Anchor handling

Use `NSSecureCoding` to serialize the `HKQueryAnchor`, then base64-encode the
bytes for `nextAnchor`. Decode the stored anchor only inside the native plugin.
Treat it as opaque everywhere else.

One cursor is stored per `deviceId` and `typeIdentifier`. The native plugin must
not consider an anchor committed until `import_apple_health_sync_batch` returns
success. Rust updates the samples, tombstones, and next anchor in one database
transaction. On failure, rerun from the previous anchor.

The stable `deviceId` must be an app-generated UUID stored in the iOS Keychain or
other device-local protected storage. Do not derive it from advertising,
hardware, account, or personally identifying identifiers.

## Normalization rules

- Preserve `HKSample.uuid` exactly as the deduplication key.
- Convert dates to RFC 3339 with an explicit timezone.
- Convert values to one canonical unit per type before invoking Rust.
- Preserve source name, source bundle identifier, and source version.
- Include only bounded, JSON-safe metadata needed for provenance or display.
- Send deleted object UUIDs from the anchored query as `deletedUuids`.
- Split results before either samples or deletions exceed 5,000 entries.
- When splitting one HealthKit query result into multiple batches, send the new
  anchor only with the final batch. Intermediate batches must retain the prior
  committed anchor or use an internal staging strategy that cannot skip data.

## Lock and background behavior

The main SQLCipher connection exists only after the user unlocks the database.
The first implementation therefore follows this sequence:

1. User opens and unlocks the app.
2. Swift loads the last committed anchors through a narrow Rust read command or
   an equivalent private plugin-to-Rust path added in the bridge PR.
3. Swift runs anchored queries for authorized types.
4. Swift invokes the import command for each normalized batch.
5. The UI reloads sync status and relevant charts.

Do not store the SQLCipher passphrase to enable background writes. A later
background design may stage bounded encrypted payloads using a separate
Keychain-protected device key, but staged payloads must be validated again by
Rust before entering the main database.

## Privacy and product requirements

- Apple Health connection is opt-in and read-only initially.
- Permissions are requested by type, not as an unexplained bulk request.
- Imported data remains local unless the user separately enables remote AI
  context for a specific operation.
- HealthKit data is excluded from developer diagnostics.
- Disconnect must stop observers. A separate explicit action is required to
  remove already imported samples.
- UI copy must distinguish authorization, successful retrieval, no matching
  data, database locked, and synchronization failure.

## Verification checklist

- Rust tests cover insert, update, deletion, rollback, validation, and anchor advancement.
- Re-importing the same HealthKit UUID is idempotent.
- A failed batch does not advance its anchor.
- A deletion tombstone removes the sample from active counts.
- A later update for the same UUID restores it predictably.
- Switching database files during synchronization is rejected.
- Partial HealthKit authorization still syncs allowed types.
- Foreground catch-up recovers changes missed while the database was locked.
- No sample values, metadata, anchors, or permission state appear in logs.
