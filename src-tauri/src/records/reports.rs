use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::database::{self, AppState};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabReportEntry {
    id: i64,
    source_name: String,
    file_type: String,
    size_label: String,
    local_copy_path: String,
    result_count: i64,
    created_at: String,
    updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct LabReportInput {
    pub(super) source_name: String,
    pub(super) file_type: String,
    pub(super) size_label: String,
    pub(super) local_copy_path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteLabReportInput {
    id: i64,
    delete_results: bool,
}

#[tauri::command]
pub fn list_lab_reports(state: tauri::State<'_, AppState>) -> Result<Vec<LabReportEntry>, String> {
    database::with_connection(&state, |conn| {
        list_lab_reports_for_snapshot(conn).map_err(|error| error.to_string())
    })
}

pub fn list_lab_reports_for_snapshot(conn: &Connection) -> rusqlite::Result<Vec<LabReportEntry>> {
    list_lab_reports_for_conn(conn)
}

#[tauri::command]
pub fn unlink_lab_report(id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    if id <= 0 {
        return Err("id is required".into());
    }
    database::with_connection(&state, |conn| unlink_lab_report_in_conn(conn, id))
}

#[tauri::command]
pub fn delete_lab_report(
    input: DeleteLabReportInput,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    if input.id <= 0 {
        return Err("id is required".into());
    }
    database::with_connection(&state, |conn| {
        delete_lab_report_in_conn(conn, input.id, input.delete_results)
    })
}

pub(super) fn insert_lab_report(
    conn: &Connection,
    report: Option<&LabReportInput>,
) -> Result<Option<i64>, String> {
    let Some(report) = report else {
        return Ok(None);
    };
    if report.source_name.trim().is_empty() {
        return Ok(None);
    }
    conn.execute(
        "INSERT INTO lab_reports (source_name, file_type, size_label, local_copy_path)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            report.source_name.trim(),
            report.file_type.trim(),
            report.size_label.trim(),
            report.local_copy_path.as_deref().unwrap_or("").trim()
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(Some(conn.last_insert_rowid()))
}

fn unlink_lab_report_in_conn(conn: &Connection, id: i64) -> Result<(), String> {
    if !active_report_exists(conn, id)? {
        return Err("Lab report not found".into());
    }
    conn.execute(
        "UPDATE lab_results SET report_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE report_id = ?1 AND deleted_at = ''",
        params![id],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn active_report_exists(conn: &Connection, id: i64) -> Result<bool, String> {
    conn.query_row(
        "SELECT 1 FROM lab_reports WHERE id = ?1 AND deleted_at = ''",
        params![id],
        |_| Ok(true),
    )
    .optional()
    .map(|value| value.unwrap_or(false))
    .map_err(|error| error.to_string())
}

pub(super) fn delete_lab_report_in_conn(
    conn: &Connection,
    id: i64,
    delete_results: bool,
) -> Result<(), String> {
    if !active_report_exists(conn, id)? {
        return Err("Lab report not found".into());
    }
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    if delete_results {
        transaction
            .execute(
                "UPDATE lab_results
                 SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 WHERE report_id = ?1 AND deleted_at = ''",
                params![id],
            )
            .map_err(|error| error.to_string())?;
    } else {
        transaction
            .execute(
                "UPDATE lab_results SET report_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE report_id = ?1 AND deleted_at = ''",
                params![id],
            )
            .map_err(|error| error.to_string())?;
    }
    transaction
        .execute(
            "UPDATE lab_reports
             SET deleted_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP,
                 document_bytes = X'',
                 local_copy_path = ''
             WHERE id = ?1 AND deleted_at = ''",
            params![id],
        )
        .map_err(|error| error.to_string())?;
    transaction.commit().map_err(|error| error.to_string())
}

pub(super) fn list_lab_reports_for_conn(
    conn: &Connection,
) -> rusqlite::Result<Vec<LabReportEntry>> {
    let mut stmt = conn.prepare(
        "SELECT
           r.id,
           r.source_name,
           r.file_type,
           r.size_label,
           r.local_copy_path,
           (SELECT COUNT(*) FROM lab_results l WHERE l.report_id = r.id AND l.deleted_at = '') AS result_count,
           r.created_at,
           r.updated_at
         FROM lab_reports r
         WHERE r.deleted_at = ''
         ORDER BY r.created_at DESC, r.id DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(LabReportEntry {
            id: row.get(0)?,
            source_name: row.get(1)?,
            file_type: row.get(2)?,
            size_label: row.get(3)?,
            local_copy_path: row.get(4)?,
            result_count: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect()
}
