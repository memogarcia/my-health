use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

use crate::{
    database::{self, AppState},
    records::{
        parse::{validate_kind, validate_optional_iso_date, validate_required},
        soft_delete_row,
    },
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRegimenItemInput {
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

#[tauri::command]
pub fn add_regimen_item(
    input: AddRegimenItemInput,
    state: tauri::State<'_, AppState>,
) -> Result<RegimenItem, String> {
    validate_regimen_input(&input.kind, &input.name, &input.start_date, &input.stop_date)?;

    database::with_connection(&state, |conn| {
        let id = insert_regimen_item(conn, &input)?;
        get_regimen_item(conn, id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn update_regimen_item(
    input: UpdateRegimenItemInput,
    state: tauri::State<'_, AppState>,
) -> Result<RegimenItem, String> {
    if input.id <= 0 {
        return Err("id is required".into());
    }
    validate_regimen_input(&input.kind, &input.name, &input.start_date, &input.stop_date)?;
    database::with_connection(&state, |conn| update_regimen_item_in_conn(conn, &input))
}

#[tauri::command]
pub fn delete_regimen_item(id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    database::with_connection(&state, |conn| soft_delete_row(conn, "regimen_items", id, "Regimen item"))
}

#[tauri::command]
pub fn stop_regimen_item(id: i64, state: tauri::State<'_, AppState>) -> Result<RegimenItem, String> {
    database::with_connection(&state, |conn| set_regimen_active(conn, id, false))
}

#[tauri::command]
pub fn reactivate_regimen_item(id: i64, state: tauri::State<'_, AppState>) -> Result<RegimenItem, String> {
    database::with_connection(&state, |conn| set_regimen_active(conn, id, true))
}

pub fn list_regimen_items(conn: &Connection) -> rusqlite::Result<Vec<RegimenItem>> {
    let sql = regimen_select_sql(
        "WHERE deleted_at = '' ORDER BY computed_active DESC, name COLLATE NOCASE ASC, id DESC",
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_regimen_item)?;
    rows.collect()
}

fn validate_regimen_input(kind: &str, name: &str, start_date: &str, stop_date: &str) -> Result<(), String> {
    validate_kind(kind)?;
    validate_required("name", name)?;
    validate_optional_iso_date("startDate", start_date)?;
    validate_optional_iso_date("stopDate", stop_date)?;
    Ok(())
}

fn insert_regimen_item(conn: &Connection, input: &AddRegimenItemInput) -> Result<i64, String> {
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
    Ok(conn.last_insert_rowid())
}

fn update_regimen_item_in_conn(conn: &Connection, input: &UpdateRegimenItemInput) -> Result<RegimenItem, String> {
    let changed = conn
        .execute(
            "UPDATE regimen_items
             SET kind = ?1,
                 name = ?2,
                 dose = ?3,
                 unit = ?4,
                 frequency = ?5,
                 start_date = ?6,
                 stop_date = ?7,
                 reason = ?8,
                 notes = ?9,
                 active = ?10,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?11 AND deleted_at = ''",
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
                if input.active { 1 } else { 0 },
                input.id
            ],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Regimen item not found".into());
    }
    get_regimen_item(conn, input.id).map_err(|error| error.to_string())
}

fn set_regimen_active(conn: &Connection, id: i64, active: bool) -> Result<RegimenItem, String> {
    if id <= 0 {
        return Err("id is required".into());
    }
    let changed = conn
        .execute(
            "UPDATE regimen_items
             SET active = ?1,
                 stop_date = CASE WHEN ?1 = 1 THEN '' ELSE date('now') END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2 AND deleted_at = ''",
            params![if active { 1 } else { 0 }, id],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Regimen item not found".into());
    }
    get_regimen_item(conn, id).map_err(|error| error.to_string())
}

fn get_regimen_item(conn: &Connection, id: i64) -> rusqlite::Result<RegimenItem> {
    let sql = regimen_select_sql("WHERE id = ?1 AND deleted_at = ''");
    conn.query_row(&sql, params![id], map_regimen_item)
}

fn regimen_select_sql(tail: &str) -> String {
    format!(
        "SELECT id, kind, name, dose, unit, frequency, start_date, stop_date, reason, notes,
                CASE WHEN active = 1 AND (stop_date = '' OR stop_date >= date('now')) THEN 1 ELSE 0 END AS computed_active
         FROM regimen_items {tail}"
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_semantics_respect_stop_dates() {
        let conn = test_connection();
        let today = today();
        for (name, stop_date, stored_active) in [
            ("No stop", "".to_string(), true),
            ("Today", today, true),
            ("Future", "2999-01-01".to_string(), true),
            ("Past", "2001-01-01".to_string(), true),
            ("Explicit", "".to_string(), false),
        ] {
            insert_regimen_item(
                &conn,
                &AddRegimenItemInput {
                    kind: "supplement".into(),
                    name: name.into(),
                    dose: "".into(),
                    unit: "".into(),
                    frequency: "".into(),
                    start_date: "".into(),
                    stop_date,
                    reason: "".into(),
                    notes: "".into(),
                    active: stored_active,
                },
            )
            .unwrap();
        }

        let items = list_regimen_items(&conn).unwrap();
        let active = |name: &str| items.iter().find(|item| item.name == name).unwrap().active;

        assert!(active("No stop"));
        assert!(active("Today"));
        assert!(active("Future"));
        assert!(!active("Past"));
        assert!(!active("Explicit"));
    }

    #[test]
    fn updates_stops_reactivates_and_deletes_regimen_items() {
        let conn = test_connection();
        let id = insert_regimen_item(
            &conn,
            &AddRegimenItemInput {
                kind: "supplement".into(),
                name: "Magnesium".into(),
                dose: "200".into(),
                unit: "mg".into(),
                frequency: "Daily".into(),
                start_date: "2026-07-01".into(),
                stop_date: "".into(),
                reason: "".into(),
                notes: "".into(),
                active: true,
            },
        )
        .unwrap();

        let updated = update_regimen_item_in_conn(
            &conn,
            &UpdateRegimenItemInput {
                id,
                kind: "medication".into(),
                name: "Magnesium glycinate".into(),
                dose: "100".into(),
                unit: "mg".into(),
                frequency: "Nightly".into(),
                start_date: "2026-07-01".into(),
                stop_date: "".into(),
                reason: "sleep".into(),
                notes: "synthetic".into(),
                active: true,
            },
        )
        .unwrap();
        assert_eq!(updated.name, "Magnesium glycinate");

        assert!(!set_regimen_active(&conn, id, false).unwrap().active);
        assert!(set_regimen_active(&conn, id, true).unwrap().active);
        soft_delete_row(&conn, "regimen_items", id, "Regimen item").unwrap();
        assert!(list_regimen_items(&conn).unwrap().is_empty());
    }

    #[test]
    fn rejects_invalid_kind() {
        assert!(validate_regimen_input("device", "Item", "", "").is_err());
    }

    fn test_connection() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE regimen_items (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               kind TEXT NOT NULL CHECK (kind IN ('medication', 'supplement')),
               name TEXT NOT NULL,
               dose TEXT NOT NULL DEFAULT '',
               unit TEXT NOT NULL DEFAULT '',
               frequency TEXT NOT NULL DEFAULT '',
               start_date TEXT NOT NULL DEFAULT '',
               stop_date TEXT NOT NULL DEFAULT '',
               reason TEXT NOT NULL DEFAULT '',
               notes TEXT NOT NULL DEFAULT '',
               active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
               created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
               updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
               deleted_at TEXT NOT NULL DEFAULT ''
             );",
        )
        .unwrap();
        conn
    }

    fn today() -> String {
        let conn = Connection::open_in_memory().unwrap();
        conn.query_row("SELECT date('now')", [], |row| row.get(0)).unwrap()
    }
}
