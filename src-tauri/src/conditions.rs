use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

use crate::{
    database::{self, AppState},
    records::{
        ensure_organ,
        parse::{validate_optional_iso_date, validate_required},
        soft_delete_row,
    },
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConditionEntry {
    id: i64,
    organ_key: String,
    name: String,
    status: String,
    diagnosed_at: String,
    notes: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddConditionInput {
    organ_key: String,
    name: String,
    status: String,
    diagnosed_at: String,
    notes: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConditionInput {
    id: i64,
    organ_key: String,
    name: String,
    status: String,
    diagnosed_at: String,
    notes: String,
}

#[tauri::command]
pub fn add_condition(
    input: AddConditionInput,
    state: tauri::State<'_, AppState>,
) -> Result<ConditionEntry, String> {
    validate_condition_input(
        &input.organ_key,
        &input.name,
        &input.status,
        &input.diagnosed_at,
    )?;

    database::with_connection(&state, |conn| {
        let id = insert_condition(
            conn,
            &input.organ_key,
            &input.name,
            &input.status,
            &input.diagnosed_at,
            &input.notes,
        )?;
        get_condition(conn, id).map_err(|error| error.to_string())
    })
}

#[tauri::command]
pub fn update_condition(
    input: UpdateConditionInput,
    state: tauri::State<'_, AppState>,
) -> Result<ConditionEntry, String> {
    if input.id <= 0 {
        return Err("id is required".into());
    }
    validate_condition_input(
        &input.organ_key,
        &input.name,
        &input.status,
        &input.diagnosed_at,
    )?;
    database::with_connection(&state, |conn| update_condition_in_conn(conn, &input))
}

#[tauri::command]
pub fn delete_condition(id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
    database::with_connection(&state, |conn| {
        soft_delete_row(conn, "conditions", id, "Condition")
    })
}

pub fn list_conditions(conn: &Connection) -> rusqlite::Result<Vec<ConditionEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, organ_key, name, status, diagnosed_at, notes
         FROM conditions
         WHERE deleted_at = ''
         ORDER BY created_at DESC, id DESC",
    )?;
    let rows = stmt.query_map([], map_condition)?;
    rows.collect()
}

fn validate_condition_input(
    organ_key: &str,
    name: &str,
    status: &str,
    diagnosed_at: &str,
) -> Result<(), String> {
    if organ_key.trim().is_empty() {
        return Err("organKey is required".into());
    }
    validate_required("condition", name)?;
    validate_status(status)?;
    validate_optional_iso_date("diagnosedAt", diagnosed_at)?;
    Ok(())
}

fn insert_condition(
    conn: &Connection,
    organ_key: &str,
    name: &str,
    status: &str,
    diagnosed_at: &str,
    notes: &str,
) -> Result<i64, String> {
    ensure_organ(conn, organ_key)?;
    conn.execute(
        "INSERT INTO conditions (organ_key, name, status, diagnosed_at, notes)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            organ_key.trim(),
            name.trim(),
            status.trim(),
            diagnosed_at.trim(),
            notes.trim()
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.last_insert_rowid())
}

fn update_condition_in_conn(
    conn: &Connection,
    input: &UpdateConditionInput,
) -> Result<ConditionEntry, String> {
    ensure_organ(conn, &input.organ_key)?;
    let changed = conn
        .execute(
            "UPDATE conditions
             SET organ_key = ?1,
                 name = ?2,
                 status = ?3,
                 diagnosed_at = ?4,
                 notes = ?5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?6 AND deleted_at = ''",
            params![
                input.organ_key.trim(),
                input.name.trim(),
                input.status.trim(),
                input.diagnosed_at.trim(),
                input.notes.trim(),
                input.id
            ],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Condition not found".into());
    }
    get_condition(conn, input.id).map_err(|error| error.to_string())
}

fn validate_status(status: &str) -> Result<(), String> {
    match status {
        "current" | "managed" | "past" => Ok(()),
        _ => Err("condition status must be current, managed, or past".into()),
    }
}

fn get_condition(conn: &Connection, id: i64) -> rusqlite::Result<ConditionEntry> {
    conn.query_row(
        "SELECT id, organ_key, name, status, diagnosed_at, notes
         FROM conditions
         WHERE id = ?1 AND deleted_at = ''",
        params![id],
        map_condition,
    )
}

fn map_condition(row: &Row<'_>) -> rusqlite::Result<ConditionEntry> {
    Ok(ConditionEntry {
        id: row.get(0)?,
        organ_key: row.get(1)?,
        name: row.get(2)?,
        status: row.get(3)?,
        diagnosed_at: row.get(4)?,
        notes: row.get(5)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saves_and_lists_conditions_by_latest_first() {
        let conn = test_connection();

        insert_condition(
            &conn,
            "thyroid",
            "Hypothyroidism",
            "managed",
            "2026-07-09",
            "synthetic",
        )
        .unwrap();
        insert_condition(&conn, "heart", "High cholesterol", "current", "", "").unwrap();

        let conditions = list_conditions(&conn).unwrap();

        assert_eq!(conditions.len(), 2);
        assert_eq!(conditions[0].name, "High cholesterol");
        assert_eq!(conditions[1].organ_key, "thyroid");
    }

    #[test]
    fn rejects_unknown_organs_and_invalid_statuses() {
        let conn = test_connection();

        assert!(insert_condition(&conn, "missing", "Condition", "current", "", "").is_err());
        assert!(validate_status("diagnosed").is_err());
    }

    #[test]
    fn updates_condition_and_rejects_invalid_status() {
        let conn = test_connection();
        let id = insert_condition(&conn, "heart", "High cholesterol", "current", "", "").unwrap();

        let updated = update_condition_in_conn(
            &conn,
            &UpdateConditionInput {
                id,
                organ_key: "thyroid".into(),
                name: "Hypothyroidism".into(),
                status: "managed".into(),
                diagnosed_at: "2026-07-09".into(),
                notes: "synthetic".into(),
            },
        )
        .unwrap();

        assert_eq!(updated.organ_key, "thyroid");
        assert_eq!(updated.status, "managed");
        assert!(validate_condition_input("heart", "Condition", "diagnosed", "").is_err());
    }

    #[test]
    fn delete_condition_excludes_it_from_lists() {
        let conn = test_connection();
        let id = insert_condition(&conn, "heart", "High cholesterol", "current", "", "").unwrap();

        soft_delete_row(&conn, "conditions", id, "Condition").unwrap();

        assert!(list_conditions(&conn).unwrap().is_empty());
    }

    fn test_connection() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE organs (
               key TEXT PRIMARY KEY,
               name TEXT NOT NULL,
               system TEXT NOT NULL,
               status TEXT NOT NULL DEFAULT 'normal',
               notes TEXT NOT NULL DEFAULT '',
               display_order INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE conditions (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               organ_key TEXT NOT NULL REFERENCES organs(key) ON DELETE CASCADE,
               name TEXT NOT NULL,
               status TEXT NOT NULL CHECK (status IN ('current', 'managed', 'past')),
               diagnosed_at TEXT NOT NULL DEFAULT '',
               notes TEXT NOT NULL DEFAULT '',
               created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
               updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
               deleted_at TEXT NOT NULL DEFAULT ''
             );
             INSERT INTO organs (key, name, system) VALUES ('thyroid', 'Thyroid', 'Endocrine');
             INSERT INTO organs (key, name, system) VALUES ('heart', 'Heart', 'Cardiovascular');",
        )
        .unwrap();
        conn
    }
}
