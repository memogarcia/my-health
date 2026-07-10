use crate::database::{self, AppState};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;

mod validation;
#[cfg(test)]
mod tests;

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
    database::with_connection_at_path(&state, &db_path, |conn| {
        import_batch_in_conn(conn, &input)
    })
}

fn status_in_conn(conn: &Connection) -> Result<AppleHealthSyncStatus, String> {
    let (active_sample_count, deleted_sample_count) = conn
        .query_row(
            "SELECT
               SUM(CASE WHEN deleted_at = '' THEN 1 ELSE 0 END),
               SUM(CASE WHEN deleted_at <> '' THEN 1 ELSE 0 END)
             FROM health_samples",
            [],
            |row| {
                Ok((
                    row.get::<_, Option<i64>>(0)?,
                    row.get::<_, Option<i64>>(1)?,
                ))
            },
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
    validation::validate_batch(input)?;
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
        let metadata_json = validation::normalize_metadata(sample.metadata.as_ref())?;
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
