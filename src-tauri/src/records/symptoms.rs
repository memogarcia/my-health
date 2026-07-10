use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

use crate::database::{self, AppState};

use super::{
    ensure_organ,
    parse::{validate_iso_date, validate_required},
    soft_delete_row,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SymptomEntry {
    id: i64,
    organ_key: String,
    name: String,
    severity: i64,
    observed_at: String,
    notes: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddSymptomInput {
    organ_key: String,
    name: String,
    severity: i64,
    observed_at: String,
    notes: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSymptomInput {
    id: i64,
    organ_key: String,
    name: String,
    severity: i64,
    observed_at: String,
    notes: String,
}

#[tauri::command]
pub fn add_symptom(
    input: AddSymptomInput,
    state: tauri::State<'_, AppState>,
) -> Result<SymptomEntry, String> {
    validate_symptom_input(
        &input.organ_key,
        &input.name,
        input.severity,
        &input.observed_at,
    )?;

    database::with_connection(&state, |conn| {
        insert_symptom(
            conn,
            &input.organ_key,
            &input.name,
            input.severity,
            &input.observed_at,
            &input.notes,
        )?;
        get_symptom(conn, conn.last_insert_rowid()).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn update_symptom(
    input: UpdateSymptomInput,
    state: tauri::State<'_, AppState>,
) -> Result<SymptomEntry, String> {
    if input.id <= 0 {
        return Err("id is required".into());
    }
    validate_symptom_input(
        &input.organ_key,
        &input.name,
        input.severity,
        &input.observed_at,
    )?;

    database::with_connection(&state, |conn| update_symptom_in_conn(conn, &input))
}

#[tauri::command]
pub fn delete_symptom(id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    database::with_connection(&state, |conn| {
        soft_delete_row(conn, "symptoms", id, "Symptom")
    })
}

pub fn list_recent_symptoms(conn: &Connection) -> rusqlite::Result<Vec<SymptomEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, organ_key, name, severity, observed_at, notes
         FROM symptoms
         WHERE deleted_at = ''
         ORDER BY observed_at DESC, id DESC",
    )?;
    let rows = stmt.query_map([], map_symptom)?;
    rows.collect()
}

fn validate_symptom_input(
    organ_key: &str,
    name: &str,
    severity: i64,
    observed_at: &str,
) -> Result<(), String> {
    if organ_key.trim().is_empty() {
        return Err("organKey is required".into());
    }
    validate_required("symptom", name)?;
    validate_required("observedAt", observed_at)?;
    validate_iso_date("observedAt", observed_at)?;
    if !(1..=5).contains(&severity) {
        return Err("severity must be between 1 and 5".into());
    }
    Ok(())
}

pub(super) fn insert_symptom(
    conn: &Connection,
    organ_key: &str,
    name: &str,
    severity: i64,
    observed_at: &str,
    notes: &str,
) -> Result<i64, String> {
    ensure_organ(conn, organ_key)?;
    conn.execute(
        "INSERT INTO symptoms (organ_key, name, severity, observed_at, notes)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            organ_key.trim(),
            name.trim(),
            severity,
            observed_at.trim(),
            notes.trim()
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.last_insert_rowid())
}

fn update_symptom_in_conn(
    conn: &Connection,
    input: &UpdateSymptomInput,
) -> Result<SymptomEntry, String> {
    ensure_organ(conn, &input.organ_key)?;
    let changed = conn
        .execute(
            "UPDATE symptoms
             SET organ_key = ?1,
                 name = ?2,
                 severity = ?3,
                 observed_at = ?4,
                 notes = ?5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?6 AND deleted_at = ''",
            params![
                input.organ_key.trim(),
                input.name.trim(),
                input.severity,
                input.observed_at.trim(),
                input.notes.trim(),
                input.id
            ],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Symptom not found".into());
    }
    get_symptom(conn, input.id).map_err(|error| error.to_string())
}

fn get_symptom(conn: &Connection, id: i64) -> rusqlite::Result<SymptomEntry> {
    conn.query_row(
        "SELECT id, organ_key, name, severity, observed_at, notes
         FROM symptoms
         WHERE id = ?1 AND deleted_at = ''",
        params![id],
        map_symptom,
    )
}

fn map_symptom(row: &Row<'_>) -> rusqlite::Result<SymptomEntry> {
    Ok(SymptomEntry {
        id: row.get(0)?,
        organ_key: row.get(1)?,
        name: row.get(2)?,
        severity: row.get(3)?,
        observed_at: row.get(4)?,
        notes: row.get(5)?,
    })
}
