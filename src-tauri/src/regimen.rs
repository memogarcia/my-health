use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

use crate::{
    database::{self, AppState},
    records::parse::{validate_kind, validate_optional_iso_date, validate_required},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegimenItem {
    id: i64,
    kind: String,
    name: String,
    dose: String,
    unit: String,
    frequency: String,
    start_date: String,
    stop_date: String,
    reason: String,
    notes: String,
    active: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddRegimenItemInput {
    kind: String,
    name: String,
    dose: String,
    unit: String,
    frequency: String,
    start_date: String,
    stop_date: String,
    reason: String,
    notes: String,
    active: bool,
}

#[tauri::command]
pub fn add_regimen_item(
    input: AddRegimenItemInput,
    state: tauri::State<'_, AppState>,
) -> Result<RegimenItem, String> {
    validate_kind(&input.kind)?;
    validate_required("name", &input.name)?;
    validate_optional_iso_date("startDate", &input.start_date)?;
    validate_optional_iso_date("stopDate", &input.stop_date)?;

    database::with_connection(&state, |conn| {
        conn.execute(
            "INSERT INTO regimen_items (kind, name, dose, unit, frequency, start_date, stop_date, reason, notes, active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                input.kind.trim(),
                input.name.trim(),
                input.dose.trim(),
                input.unit.trim(),
                input.frequency.trim(),
                input.start_date.trim(),
                input.stop_date.trim(),
                input.reason.trim(),
                input.notes.trim(),
                if input.active { 1 } else { 0 }
            ],
        )
        .map_err(|error| error.to_string())?;
        get_regimen_item(conn, conn.last_insert_rowid()).map_err(|error| error.to_string())
    })
}

pub fn list_regimen_items(conn: &Connection) -> rusqlite::Result<Vec<RegimenItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, kind, name, dose, unit, frequency, start_date, stop_date, reason, notes, active
         FROM regimen_items
         ORDER BY active DESC, name COLLATE NOCASE ASC, id DESC",
    )?;
    let rows = stmt.query_map([], map_regimen_item)?;
    rows.collect()
}

fn get_regimen_item(conn: &Connection, id: i64) -> rusqlite::Result<RegimenItem> {
    conn.query_row(
        "SELECT id, kind, name, dose, unit, frequency, start_date, stop_date, reason, notes, active
         FROM regimen_items
         WHERE id = ?1",
        params![id],
        map_regimen_item,
    )
}

fn map_regimen_item(row: &Row<'_>) -> rusqlite::Result<RegimenItem> {
    Ok(RegimenItem {
        id: row.get(0)?,
        kind: row.get(1)?,
        name: row.get(2)?,
        dose: row.get(3)?,
        unit: row.get(4)?,
        frequency: row.get(5)?,
        start_date: row.get(6)?,
        stop_date: row.get(7)?,
        reason: row.get(8)?,
        notes: row.get(9)?,
        active: row.get::<_, i64>(10)? == 1,
    })
}
