use crate::{
    database::{self, AppState},
    records::parse::validate_iso_date,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;

const MAX_SAMPLES_PER_BATCH: usize = 5_000;
const MAX_DELETIONS_PER_BATCH: usize = 5_000;
const MAX_ANCHOR_BYTES: usize = 64 * 1024;
const MAX_METADATA_BYTES: usize = 8 * 1024;
const MAX_SOURCE_TEXT_BYTES: usize = 255;
const MAX_UNIT_BYTES: usize = 64;

const SUPPORTED_TYPE_IDENTIFIERS: &[&str] = &[
    "HKQuantityTypeIdentifierStepCount",
    "HKQuantityTypeIdentifierDistanceWalkingRunning",
    "HKQuantityTypeIdentifierBodyMass",
    "HKQuantityTypeIdentifierHeartRate",
    "HKQuantityTypeIdentifierRestingHeartRate",
    "HKQuantityTypeIdentifierWalkingHeartRateAverage",
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
    "HKQuantityTypeIdentifierRespiratoryRate",
    "HKQuantityTypeIdentifierOxygenSaturation",
    "HKQuantityTypeIdentifierBloodPressureSystolic",
    "HKQuantityTypeIdentifierBloodPressureDiastolic",
    "HKQuantityTypeIdentifierBloodGlucose",
    "HKQuantityTypeIdentifierActiveEnergyBurned",
    "HKQuantityTypeIdentifierBasalEnergyBurned",
    "HKQuantityTypeIdentifierAppleExerciseTime",
    "HKCategoryTypeIdentifierSleepAnalysis",
    "HKWorkoutTypeIdentifier",
];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppleHealthSyncBatch {
    device_id: String,
    type_identifier: String,
    next_anchor: String,
    #[serde(default)]
    samples: Vec<AppleHealthSampleInput>,
    #[serde(default)]
    deleted_uuids: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleHealthSampleInput {
    uuid: String,
    sample_kind: String,
    start_at: String,
    end_at: String,
    numeric_value: Option<f64>,
    category_value: Option<i64>,
    unit: String,
    workout_activity_type: Option<i64>,
    duration_seconds: Option<f64>,
    total_energy_kcal: Option<f64>,
    total_distance_meters: Option<f64>,
    source_name: String,
    source_bundle_id: String,
    source_version: String,
    metadata: Option<Value>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppleHealthSyncResult {
    inserted: usize,
    updated: usize,
    deleted: usize,
    active_sample_count: i64,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppleHealthSyncStatus {
    healthkit_supported: bool,
    active_sample_count: i64,
    deleted_sample_count: i64,
    synced_type_count: i64,
    synced_device_count: i64,
    last_success_at: String,
}

#[tauri::command]
pub fn get_apple_health_sync_status(
    state: tauri::State<'_, AppState>,
) -> Result<AppleHealthSyncStatus, String> {
    database::with_connection(&state, status_in_conn)
}

#[tauri::command]
pub fn import_apple_health_sync_batch(
    input: AppleHealthSyncBatch,
    db_path: String,
    state: tauri::State<'_, AppState>,
) -> Result<AppleHealthSyncResult, String> {
    database::with_connection_at_path(&state, &db_path, |conn| import_batch_in_conn(conn, &input))
}

fn status_in_conn(conn: &Connection) -> Result<AppleHealthSyncStatus, String> {
    let (active_sample_count, deleted_sample_count) = conn
        .query_row(
            "SELECT
               SUM(CASE WHEN deleted_at = '' THEN 1 ELSE 0 END),
               SUM(CASE WHEN deleted_at <> '' THEN 1 ELSE 0 END)
             FROM health_samples",
            [],
            |row| Ok((row.get::<_, Option<i64>>(0)?, row.get::<_, Option<i64>>(1)?)),
        )
        .map_err(|error| error.to_string())?;
    let (synced_type_count, synced_device_count, last_success_at) = conn
        .query_row(
            "SELECT
               COUNT(DISTINCT type_identifier),
               COUNT(DISTINCT device_id),
               COALESCE(MAX(last_success_at), '')
             FROM healthkit_sync_state",
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .map_err(|error| error.to_string())?;

    Ok(AppleHealthSyncStatus {
        healthkit_supported: cfg!(target_os = "ios"),
        active_sample_count: active_sample_count.unwrap_or(0),
        deleted_sample_count: deleted_sample_count.unwrap_or(0),
        synced_type_count,
        synced_device_count,
        last_success_at,
    })
}

fn import_batch_in_conn(
    conn: &Connection,
    input: &AppleHealthSyncBatch,
) -> Result<AppleHealthSyncResult, String> {
    validate_batch(input)?;
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;

    let mut deleted = 0;
    for uuid in &input.deleted_uuids {
        deleted += transaction
            .execute(
                "UPDATE health_samples
                 SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE healthkit_uuid = ?1 AND type_identifier = ?2 AND deleted_at = ''",
                params![uuid.trim(), input.type_identifier.trim()],
            )
            .map_err(|error| error.to_string())?;
    }

    let mut inserted = 0;
    let mut updated = 0;
    for sample in &input.samples {
        let metadata_json = normalize_metadata(sample.metadata.as_ref())?;
        let inserted_rows = transaction
            .execute(
                "INSERT OR IGNORE INTO health_samples (
                   healthkit_uuid,
                   type_identifier,
                   sample_kind,
                   start_at,
                   end_at,
                   numeric_value,
                   category_value,
                   unit,
                   workout_activity_type,
                   duration_seconds,
                   total_energy_kcal,
                   total_distance_meters,
                   source_name,
                   source_bundle_id,
                   source_version,
                   metadata_json
                 ) VALUES (
                   ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
                   ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
                 )",
                params![
                    sample.uuid.trim(),
                    input.type_identifier.trim(),
                    sample.sample_kind.trim(),
                    sample.start_at.trim(),
                    sample.end_at.trim(),
                    sample.numeric_value,
                    sample.category_value,
                    sample.unit.trim(),
                    sample.workout_activity_type,
                    sample.duration_seconds,
                    sample.total_energy_kcal,
                    sample.total_distance_meters,
                    sample.source_name.trim(),
                    sample.source_bundle_id.trim(),
                    sample.source_version.trim(),
                    metadata_json,
                ],
            )
            .map_err(|error| error.to_string())?;

        if inserted_rows == 1 {
            inserted += 1;
            continue;
        }

        transaction
            .execute(
                "UPDATE health_samples
                 SET type_identifier = ?2,
                     sample_kind = ?3,
                     start_at = ?4,
                     end_at = ?5,
                     numeric_value = ?6,
                     category_value = ?7,
                     unit = ?8,
                     workout_activity_type = ?9,
                     duration_seconds = ?10,
                     total_energy_kcal = ?11,
                     total_distance_meters = ?12,
                     source_name = ?13,
                     source_bundle_id = ?14,
                     source_version = ?15,
                     metadata_json = ?16,
                     updated_at = CURRENT_TIMESTAMP,
                     deleted_at = ''
                 WHERE healthkit_uuid = ?1",
                params![
                    sample.uuid.trim(),
                    input.type_identifier.trim(),
                    sample.sample_kind.trim(),
                    sample.start_at.trim(),
                    sample.end_at.trim(),
                    sample.numeric_value,
                    sample.category_value,
                    sample.unit.trim(),
                    sample.workout_activity_type,
                    sample.duration_seconds,
                    sample.total_energy_kcal,
                    sample.total_distance_meters,
                    sample.source_name.trim(),
                    sample.source_bundle_id.trim(),
                    sample.source_version.trim(),
                    metadata_json,
                ],
            )
            .map_err(|error| error.to_string())?;
        updated += 1;
    }

    transaction
        .execute(
            "INSERT INTO healthkit_sync_state (
               device_id,
               type_identifier,
               anchor,
               last_success_at,
               last_error
             ) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, '')
             ON CONFLICT(device_id, type_identifier) DO UPDATE SET
               anchor = excluded.anchor,
               last_success_at = excluded.last_success_at,
               last_error = ''",
            params![
                input.device_id.trim(),
                input.type_identifier.trim(),
                input.next_anchor.trim(),
            ],
        )
        .map_err(|error| error.to_string())?;

    let active_sample_count = transaction
        .query_row(
            "SELECT COUNT(*) FROM health_samples WHERE deleted_at = ''",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    transaction.commit().map_err(|error| error.to_string())?;
    Ok(AppleHealthSyncResult {
        inserted,
        updated,
        deleted,
        active_sample_count,
    })
}

fn validate_batch(input: &AppleHealthSyncBatch) -> Result<(), String> {
    validate_uuid("deviceId", &input.device_id)?;
    validate_type_identifier(&input.type_identifier)?;
    validate_text("nextAnchor", &input.next_anchor, MAX_ANCHOR_BYTES, false)?;
    if input.samples.len() > MAX_SAMPLES_PER_BATCH {
        return Err(format!(
            "Apple Health sync batches can contain at most {MAX_SAMPLES_PER_BATCH} samples"
        ));
    }
    if input.deleted_uuids.len() > MAX_DELETIONS_PER_BATCH {
        return Err(format!(
            "Apple Health sync batches can contain at most {MAX_DELETIONS_PER_BATCH} deletions"
        ));
    }
    for uuid in &input.deleted_uuids {
        validate_uuid("deleted UUID", uuid)?;
    }
    for sample in &input.samples {
        validate_sample(&input.type_identifier, sample)?;
    }
    Ok(())
}

fn validate_sample(
    type_identifier: &str,
    sample: &AppleHealthSampleInput,
) -> Result<(), String> {
    validate_uuid("sample UUID", &sample.uuid)?;
    validate_rfc3339("startAt", &sample.start_at)?;
    validate_rfc3339("endAt", &sample.end_at)?;
    validate_text(
        "sourceName",
        &sample.source_name,
        MAX_SOURCE_TEXT_BYTES,
        true,
    )?;
    validate_text(
        "sourceBundleId",
        &sample.source_bundle_id,
        MAX_SOURCE_TEXT_BYTES,
        true,
    )?;
    validate_text(
        "sourceVersion",
        &sample.source_version,
        MAX_SOURCE_TEXT_BYTES,
        true,
    )?;
    validate_text("unit", &sample.unit, MAX_UNIT_BYTES, true)?;
    validate_optional_finite("numericValue", sample.numeric_value)?;
    validate_optional_non_negative("durationSeconds", sample.duration_seconds)?;
    validate_optional_non_negative("totalEnergyKcal", sample.total_energy_kcal)?;
    validate_optional_non_negative("totalDistanceMeters", sample.total_distance_meters)?;
    normalize_metadata(sample.metadata.as_ref())?;

    let expected_kind = expected_sample_kind(type_identifier);
    if sample.sample_kind.trim() != expected_kind {
        return Err(format!(
            "sampleKind for {type_identifier} must be {expected_kind}"
        ));
    }
    match expected_kind {
        "quantity" => {
            if sample.numeric_value.is_none() {
                return Err("numericValue is required for quantity samples".into());
            }
            if sample.unit.trim().is_empty() {
                return Err("unit is required for quantity samples".into());
            }
        }
        "category" => {
            if sample.category_value.is_none() {
                return Err("categoryValue is required for category samples".into());
            }
        }
        "workout" => {
            if sample.workout_activity_type.is_none() {
                return Err("workoutActivityType is required for workout samples".into());
            }
            if sample.duration_seconds.is_none() {
                return Err("durationSeconds is required for workout samples".into());
            }
        }
        _ => unreachable!(),
    }
    Ok(())
}

fn validate_type_identifier(value: &str) -> Result<(), String> {
    if SUPPORTED_TYPE_IDENTIFIERS.contains(&value.trim()) {
        Ok(())
    } else {
        Err(format!(
            "Unsupported Apple Health type identifier: {}",
            value.trim()
        ))
    }
}

fn expected_sample_kind(type_identifier: &str) -> &'static str {
    match type_identifier.trim() {
        "HKCategoryTypeIdentifierSleepAnalysis" => "category",
        "HKWorkoutTypeIdentifier" => "workout",
        _ => "quantity",
    }
}

fn validate_text(name: &str, value: &str, max_bytes: usize, allow_empty: bool) -> Result<(), String> {
    let value = value.trim();
    if !allow_empty && value.is_empty() {
        return Err(format!("{name} is required"));
    }
    if value.len() > max_bytes {
        return Err(format!("{name} must be {max_bytes} bytes or fewer"));
    }
    if value.chars().any(char::is_control) {
        return Err(format!("{name} contains unsupported control characters"));
    }
    Ok(())
}

fn validate_uuid(name: &str, value: &str) -> Result<(), String> {
    let value = value.trim().as_bytes();
    if value.len() != 36 {
        return Err(format!("{name} must be a UUID"));
    }
    for (index, byte) in value.iter().enumerate() {
        let valid = if matches!(index, 8 | 13 | 18 | 23) {
            *byte == b'-'
        } else {
            byte.is_ascii_hexdigit()
        };
        if !valid {
            return Err(format!("{name} must be a UUID"));
        }
    }
    Ok(())
}

fn validate_rfc3339(name: &str, value: &str) -> Result<(), String> {
    let value = value.trim();
    if value.len() < 20 || value.len() > 40 || !value.is_ascii() {
        return Err(format!("{name} must be an RFC 3339 timestamp"));
    }
    validate_iso_date(name, &value[..10])?;
    let bytes = value.as_bytes();
    if bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || !bytes[11..13].iter().all(u8::is_ascii_digit)
        || !bytes[14..16].iter().all(u8::is_ascii_digit)
        || !bytes[17..19].iter().all(u8::is_ascii_digit)
    {
        return Err(format!("{name} must be an RFC 3339 timestamp"));
    }
    let hour = value[11..13].parse::<u8>().unwrap_or(24);
    let minute = value[14..16].parse::<u8>().unwrap_or(60);
    let second = value[17..19].parse::<u8>().unwrap_or(60);
    if hour > 23 || minute > 59 || second > 59 {
        return Err(format!("{name} must be an RFC 3339 timestamp"));
    }

    let suffix = &value[19..];
    let zone_index = suffix
        .char_indices()
        .find(|(_, character)| matches!(character, 'Z' | '+' | '-'))
        .map(|(index, _)| index)
        .ok_or_else(|| format!("{name} must include a timezone"))?;
    let fraction = &suffix[..zone_index];
    if !fraction.is_empty()
        && (!fraction.starts_with('.')
            || fraction.len() == 1
            || !fraction[1..].chars().all(|character| character.is_ascii_digit()))
    {
        return Err(format!("{name} has an invalid fractional second"));
    }
    let zone = &suffix[zone_index..];
    if zone == "Z" {
        return Ok(());
    }
    let zone_bytes = zone.as_bytes();
    if zone_bytes.len() != 6
        || !matches!(zone_bytes[0], b'+' | b'-')
        || zone_bytes[3] != b':'
        || !zone_bytes[1..3].iter().all(u8::is_ascii_digit)
        || !zone_bytes[4..6].iter().all(u8::is_ascii_digit)
    {
        return Err(format!("{name} has an invalid timezone"));
    }
    let zone_hour = zone[1..3].parse::<u8>().unwrap_or(24);
    let zone_minute = zone[4..6].parse::<u8>().unwrap_or(60);
    if zone_hour > 23 || zone_minute > 59 {
        return Err(format!("{name} has an invalid timezone"));
    }
    Ok(())
}

fn validate_optional_finite(name: &str, value: Option<f64>) -> Result<(), String> {
    if value.is_some_and(|value| !value.is_finite()) {
        Err(format!("{name} must be finite"))
    } else {
        Ok(())
    }
}

fn validate_optional_non_negative(name: &str, value: Option<f64>) -> Result<(), String> {
    validate_optional_finite(name, value)?;
    if value.is_some_and(|value| value < 0.0) {
        Err(format!("{name} must be zero or greater"))
    } else {
        Ok(())
    }
}

fn normalize_metadata(value: Option<&Value>) -> Result<String, String> {
    let value = value.cloned().unwrap_or_else(|| Value::Object(Default::default()));
    if !value.is_object() {
        return Err("metadata must be a JSON object".into());
    }
    let encoded = serde_json::to_string(&value).map_err(|error| error.to_string())?;
    if encoded.len() > MAX_METADATA_BYTES {
        return Err(format!(
            "metadata must be {MAX_METADATA_BYTES} bytes or fewer"
        ));
    }
    Ok(encoded)
}

#[cfg(test)]
mod tests {
    use super::*;
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
        conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| row.get(0))
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
}
