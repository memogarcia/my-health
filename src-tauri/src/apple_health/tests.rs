use super::*;
use rusqlite::Connection;
use serde_json::json;

#[test]
fn imports_updates_and_deletes_anchored_samples() {
    let conn = test_connection();
    let first = AppleHealthSyncBatch {
        device_id: "11111111-1111-4111-8111-111111111111".into(),
        type_identifier: "HKQuantityTypeIdentifierStepCount".into(),
        next_anchor: "anchor-1".into(),
        samples: vec![quantity_sample(
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            4_200.0,
        )],
        deleted_uuids: vec![],
    };

    assert_eq!(
        import_batch_in_conn(&conn, &first).unwrap(),
        AppleHealthSyncResult {
            inserted: 1,
            updated: 0,
            deleted: 0,
            active_sample_count: 1,
        }
    );

    let second = AppleHealthSyncBatch {
        next_anchor: "anchor-2".into(),
        samples: vec![quantity_sample(
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            4_500.0,
        )],
        deleted_uuids: vec!["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa".into()],
        ..first
    };
    let result = import_batch_in_conn(&conn, &second).unwrap();

    assert_eq!(result.inserted, 0);
    assert_eq!(result.updated, 1);
    assert_eq!(result.deleted, 1);
    assert_eq!(result.active_sample_count, 1);
    let (value, deleted_at): (f64, String) = conn
        .query_row(
            "SELECT numeric_value, deleted_at FROM health_samples WHERE healthkit_uuid = ?1",
            ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(value, 4_500.0);
    assert!(deleted_at.is_empty());
    let anchor: String = conn
        .query_row(
            "SELECT anchor FROM healthkit_sync_state",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(anchor, "anchor-2");
}

#[test]
fn rejects_unsupported_types_and_malformed_samples_without_writes() {
    let conn = test_connection();
    let mut input = AppleHealthSyncBatch {
        device_id: "11111111-1111-4111-8111-111111111111".into(),
        type_identifier: "HKQuantityTypeIdentifierStepCount".into(),
        next_anchor: "anchor-1".into(),
        samples: vec![quantity_sample(
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            4_200.0,
        )],
        deleted_uuids: vec![],
    };
    input.samples[0].start_at = "not-a-date".into();

    assert!(import_batch_in_conn(&conn, &input).is_err());
    assert_eq!(count_rows(&conn, "health_samples"), 0);
    input.type_identifier = "HKQuantityTypeIdentifierUnknown".into();
    assert!(import_batch_in_conn(&conn, &input).is_err());
    assert_eq!(count_rows(&conn, "healthkit_sync_state"), 0);
}

#[test]
fn reports_sync_status_without_exposing_anchor_values() {
    let conn = test_connection();
    let input = AppleHealthSyncBatch {
        device_id: "11111111-1111-4111-8111-111111111111".into(),
        type_identifier: "HKQuantityTypeIdentifierStepCount".into(),
        next_anchor: "private-anchor".into(),
        samples: vec![quantity_sample(
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            4_200.0,
        )],
        deleted_uuids: vec![],
    };
    import_batch_in_conn(&conn, &input).unwrap();

    let status = status_in_conn(&conn).unwrap();
    assert_eq!(status.active_sample_count, 1);
    assert_eq!(status.deleted_sample_count, 0);
    assert_eq!(status.synced_type_count, 1);
    assert_eq!(status.synced_device_count, 1);
    assert!(!status.last_success_at.is_empty());
}

fn quantity_sample(uuid: &str, value: f64) -> AppleHealthSampleInput {
    AppleHealthSampleInput {
        uuid: uuid.into(),
        sample_kind: "quantity".into(),
        start_at: "2026-07-10T08:00:00+09:00".into(),
        end_at: "2026-07-10T08:05:00+09:00".into(),
        numeric_value: Some(value),
        category_value: None,
        unit: "count".into(),
        workout_activity_type: None,
        duration_seconds: None,
        total_energy_kcal: None,
        total_distance_meters: None,
        source_name: "Synthetic Watch".into(),
        source_bundle_id: "com.example.synthetic".into(),
        source_version: "1.0".into(),
        metadata: Some(json!({ "synthetic": true })),
    }
}

fn count_rows(conn: &Connection, table: &str) -> i64 {
    conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
        row.get(0)
    })
    .unwrap()
}

fn test_connection() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch(
        "CREATE TABLE health_samples (
           healthkit_uuid TEXT PRIMARY KEY,
           type_identifier TEXT NOT NULL,
           sample_kind TEXT NOT NULL CHECK (sample_kind IN ('quantity', 'category', 'workout')),
           start_at TEXT NOT NULL,
           end_at TEXT NOT NULL,
           numeric_value REAL,
           category_value INTEGER,
           unit TEXT NOT NULL DEFAULT '',
           workout_activity_type INTEGER,
           duration_seconds REAL,
           total_energy_kcal REAL,
           total_distance_meters REAL,
           source_name TEXT NOT NULL DEFAULT '',
           source_bundle_id TEXT NOT NULL DEFAULT '',
           source_version TEXT NOT NULL DEFAULT '',
           metadata_json TEXT NOT NULL DEFAULT '{}',
           created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           deleted_at TEXT NOT NULL DEFAULT ''
         );
         CREATE TABLE healthkit_sync_state (
           device_id TEXT NOT NULL,
           type_identifier TEXT NOT NULL,
           anchor TEXT NOT NULL,
           last_success_at TEXT NOT NULL DEFAULT '',
           last_error TEXT NOT NULL DEFAULT '',
           PRIMARY KEY (device_id, type_identifier)
         );",
    )
    .unwrap();
    conn
}
