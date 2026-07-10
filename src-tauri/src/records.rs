use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

use crate::{
    database::{self, AppState},
    document_files,
};
pub(crate) mod bulk;
pub(crate) mod parse;
mod recommendations;
pub(crate) mod reports;
pub(crate) mod symptoms;
use bulk::BulkUpdateLabResultsInput;
use parse::{
    derive_flag_from_reference, parse_lab_number, parse_reference_range, validate_iso_date,
    validate_reference_range, validate_required, validate_status,
};
pub use recommendations::{build_recommendations, Recommendation};
use reports::{insert_lab_report, LabReportInput};
pub use reports::{list_lab_reports_for_snapshot, LabReportEntry};
pub use symptoms::{list_recent_symptoms, SymptomEntry};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabResult {
    id: i64,
    report_id: Option<i64>,
    report_source_name: Option<String>,
    report_local_copy_path: Option<String>,
    organ_key: String,
    marker: String,
    value: String,
    value_number: Option<f64>,
    unit: String,
    status: String,
    flag: String,
    measured_at: String,
    notes: String,
    reference_range: String,
    reference_low: Option<f64>,
    reference_high: Option<f64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLabResultInput {
    organ_key: String,
    marker: String,
    value: String,
    unit: String,
    status: String,
    measured_at: String,
    notes: String,
    reference_range: String,
    report: Option<LabReportInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLabResultInput {
    id: i64,
    organ_key: String,
    marker: String,
    value: String,
    unit: String,
    status: String,
    measured_at: String,
    notes: String,
    reference_range: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LabResultSeed {
    organ_key: String,
    marker: String,
    value: String,
    unit: String,
    status: String,
    measured_at: String,
    notes: String,
    reference_range: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLabResultsBatchInput {
    results: Vec<LabResultSeed>,
    report: Option<LabReportInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportLabResultsDocumentInput {
    results: Vec<LabResultSeed>,
    report: LabReportInput,
    file_name: String,
    file_bytes: Vec<u8>,
    db_path: String,
}

#[tauri::command]
pub fn add_lab_result(
    input: AddLabResultInput,
    state: tauri::State<'_, AppState>,
) -> Result<LabResult, String> {
    validate_lab_input(
        &input.organ_key,
        &input.marker,
        &input.value,
        &input.status,
        &input.measured_at,
        &input.reference_range,
    )?;

    database::with_connection(&state, |conn| {
        let transaction = conn
            .unchecked_transaction()
            .map_err(|error| error.to_string())?;
        ensure_organ(&transaction, &input.organ_key)?;
        let report_id = insert_lab_report(&transaction, input.report.as_ref())?;
        let id = insert_lab_result(
            &transaction,
            report_id,
            &input.organ_key,
            &input.marker,
            &input.value,
            &input.unit,
            &input.status,
            &input.measured_at,
            &input.notes,
            &input.reference_range,
        )?;
        let saved = get_lab_result(&transaction, id).map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(saved)
    })
}

/// Accepts several results extracted from one document, creates a single shared
/// `lab_reports` row, and inserts every result linked to it inside one
/// transaction so a partial failure rolls back the whole batch.
#[tauri::command]
pub fn add_lab_results(
    input: AddLabResultsBatchInput,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LabResult>, String> {
    if input.results.is_empty() {
        return Err("No results to save".into());
    }
    for (index, seed) in input.results.iter().enumerate() {
        let label = format!("Result {}", index + 1);
        validate_lab_input(
            &seed.organ_key,
            &seed.marker,
            &seed.value,
            &seed.status,
            &seed.measured_at,
            &seed.reference_range,
        )
        .map_err(|message| format!("{label}: {message}"))?;
    }

    database::with_connection(&state, |conn| {
        save_lab_results(conn, &input.results, input.report.as_ref(), None)
    })
}

#[tauri::command]
pub fn import_lab_results_document(
    input: ImportLabResultsDocumentInput,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LabResult>, String> {
    validate_lab_results(&input.results)?;
    let validated = document_files::validate_document_upload(&input.file_name, &input.file_bytes)?;
    let mut report = input.report;
    report.source_name = validated.safe_file_name;
    report.local_copy_path = None;
    database::with_connection_at_path(&state, &input.db_path, |conn| {
        save_lab_results(conn, &input.results, Some(&report), Some(&input.file_bytes))
    })
}

fn validate_lab_results(results: &[LabResultSeed]) -> Result<(), String> {
    if results.is_empty() {
        return Err("No results to save".into());
    }
    for (index, seed) in results.iter().enumerate() {
        validate_lab_input(
            &seed.organ_key,
            &seed.marker,
            &seed.value,
            &seed.status,
            &seed.measured_at,
            &seed.reference_range,
        )
        .map_err(|message| format!("Result {}: {message}", index + 1))?;
    }
    Ok(())
}

fn save_lab_results(
    conn: &Connection,
    results: &[LabResultSeed],
    report: Option<&LabReportInput>,
    document_bytes: Option<&[u8]>,
) -> Result<Vec<LabResult>, String> {
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    for seed in results {
        ensure_organ(&transaction, &seed.organ_key)?;
    }
    let report_id = insert_lab_report(&transaction, report)?;
    if let (Some(report_id), Some(bytes)) = (report_id, document_bytes) {
        transaction
            .execute(
                "UPDATE lab_reports SET document_bytes = ?1 WHERE id = ?2",
                params![bytes, report_id],
            )
            .map_err(|error| error.to_string())?;
    }
    let mut saved = Vec::with_capacity(results.len());
    for seed in results {
        let id = insert_lab_result(
            &transaction,
            report_id,
            &seed.organ_key,
            &seed.marker,
            &seed.value,
            &seed.unit,
            &seed.status,
            &seed.measured_at,
            &seed.notes,
            &seed.reference_range,
        )?;
        saved.push(get_lab_result(&transaction, id).map_err(|error| error.to_string())?);
    }
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(saved)
}

#[tauri::command]
pub fn update_lab_result(
    input: UpdateLabResultInput,
    state: tauri::State<'_, AppState>,
) -> Result<LabResult, String> {
    if input.id <= 0 {
        return Err("id is required".into());
    }
    validate_lab_input(
        &input.organ_key,
        &input.marker,
        &input.value,
        &input.status,
        &input.measured_at,
        &input.reference_range,
    )?;

    database::with_connection(&state, |conn| update_lab_result_in_conn(conn, &input))
}

#[tauri::command]
pub fn update_lab_results(
    input: BulkUpdateLabResultsInput,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    bulk::validate(&input)?;
    database::with_connection(&state, |conn| bulk::update_in_conn(conn, &input))
}

#[tauri::command]
pub fn delete_lab_result(id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    database::with_connection(&state, |conn| {
        soft_delete_row(conn, "lab_results", id, "Lab result")
    })
}

pub fn list_latest_lab_results(conn: &Connection) -> rusqlite::Result<Vec<LabResult>> {
    let mut stmt = conn.prepare(
        "SELECT
           l.id, l.report_id, r.source_name, r.local_copy_path, l.organ_key, l.marker, l.value,
           l.value_number, l.unit, l.status, l.flag, l.measured_at, l.notes,
           l.reference_range, l.reference_low, l.reference_high
         FROM lab_results l
         LEFT JOIN lab_reports r ON r.id = l.report_id AND r.deleted_at = ''
         WHERE l.deleted_at = ''
         ORDER BY l.measured_at DESC, l.id DESC",
    )?;
    let rows = stmt.query_map([], map_lab_result)?;
    rows.collect()
}

fn validate_lab_input(
    _organ_key: &str,
    marker: &str,
    value: &str,
    status: &str,
    measured_at: &str,
    reference_range: &str,
) -> Result<(), String> {
    validate_required("marker", marker)?;
    validate_required("value", value)?;
    validate_required("measuredAt", measured_at)?;
    validate_iso_date("measuredAt", measured_at)?;
    validate_status(status)?;
    validate_reference_range(reference_range)?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn insert_lab_result(
    conn: &Connection,
    report_id: Option<i64>,
    organ_key: &str,
    marker: &str,
    value: &str,
    unit: &str,
    status: &str,
    measured_at: &str,
    notes: &str,
    reference_range: &str,
) -> Result<i64, String> {
    ensure_organ(conn, organ_key)?;
    let value_number = parse_lab_number(value);
    let (reference_low, reference_high) = parse_reference_range(reference_range);
    let flag = derive_flag_from_reference(value_number, reference_range);
    conn.execute(
        "INSERT INTO lab_results (
           report_id, organ_key, marker, value, value_number, unit, status, flag,
           measured_at, notes, reference_range, reference_low, reference_high
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            report_id,
            organ_key.trim(),
            marker.trim(),
            value.trim(),
            value_number,
            unit.trim(),
            status.trim(),
            flag,
            measured_at.trim(),
            notes.trim(),
            reference_range.trim(),
            reference_low,
            reference_high
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.last_insert_rowid())
}

fn update_lab_result_in_conn(
    conn: &Connection,
    input: &UpdateLabResultInput,
) -> Result<LabResult, String> {
    ensure_organ(conn, &input.organ_key)?;
    let value_number = parse_lab_number(&input.value);
    let (reference_low, reference_high) = parse_reference_range(&input.reference_range);
    let flag = derive_flag_from_reference(value_number, &input.reference_range);

    let changed = conn
        .execute(
            "UPDATE lab_results
             SET organ_key = ?1,
                 marker = ?2,
                 value = ?3,
                 value_number = ?4,
                 unit = ?5,
                 status = ?6,
                 flag = ?7,
                 measured_at = ?8,
                 notes = ?9,
                 reference_range = ?10,
                 reference_low = ?11,
                 reference_high = ?12,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?13 AND deleted_at = ''",
            params![
                input.organ_key.trim(),
                input.marker.trim(),
                input.value.trim(),
                value_number,
                input.unit.trim(),
                input.status.trim(),
                flag,
                input.measured_at.trim(),
                input.notes.trim(),
                input.reference_range.trim(),
                reference_low,
                reference_high,
                input.id
            ],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Lab result not found".into());
    }
    get_lab_result(conn, input.id).map_err(|error| error.to_string())
}

pub(crate) fn ensure_organ(conn: &Connection, organ_key: &str) -> Result<(), String> {
    ensure_organ_name_hint(organ_key)?;
    let found: Option<i64> = conn
        .query_row(
            "SELECT 1 FROM organs WHERE key = ?1",
            params![organ_key.trim()],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    found
        .map(|_| ())
        .ok_or_else(|| "organKey is not valid".into())
}

fn ensure_organ_name_hint(organ_key: &str) -> Result<(), String> {
    if organ_key.trim().is_empty() {
        Err("organKey is required".into())
    } else {
        Ok(())
    }
}

pub(crate) fn soft_delete_row(
    conn: &Connection,
    table: &str,
    id: i64,
    label: &str,
) -> Result<(), String> {
    if id <= 0 {
        return Err("id is required".into());
    }
    let sql = format!(
        "UPDATE {table} SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND deleted_at = ''"
    );
    let changed = conn
        .execute(&sql, params![id])
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err(format!("{label} not found"));
    }
    Ok(())
}

fn get_lab_result(conn: &Connection, id: i64) -> rusqlite::Result<LabResult> {
    conn.query_row(
        "SELECT
           l.id, l.report_id, r.source_name, r.local_copy_path, l.organ_key, l.marker, l.value,
           l.value_number, l.unit, l.status, l.flag, l.measured_at, l.notes,
           l.reference_range, l.reference_low, l.reference_high
         FROM lab_results l
         LEFT JOIN lab_reports r ON r.id = l.report_id AND r.deleted_at = ''
         WHERE l.id = ?1 AND l.deleted_at = ''",
        params![id],
        map_lab_result,
    )
}

fn map_lab_result(row: &Row<'_>) -> rusqlite::Result<LabResult> {
    Ok(LabResult {
        id: row.get(0)?,
        report_id: row.get(1)?,
        report_source_name: row.get(2)?,
        report_local_copy_path: row.get(3)?,
        organ_key: row.get(4)?,
        marker: row.get(5)?,
        value: row.get(6)?,
        value_number: row.get(7)?,
        unit: row.get(8)?,
        status: row.get(9)?,
        flag: row.get(10)?,
        measured_at: row.get(11)?,
        notes: row.get(12)?,
        reference_range: row.get(13)?,
        reference_low: row.get(14)?,
        reference_high: row.get(15)?,
    })
}

#[cfg(test)]
mod tests;

#[cfg(test)]
mod storage_tests;
