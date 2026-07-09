use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::Manager;

mod ai_settings;
mod codex_cli;
mod conditions;
mod database;
mod document_files;
mod records;
mod regimen;
use ai_settings::validate_ai_settings;
use conditions::ConditionEntry;
use database::{AppState, DatabaseStatus};
use records::{LabReportEntry, LabResult, Recommendation, SymptomEntry};
use regimen::RegimenItem;

const MAX_USER_STATE_BYTES: usize = 128 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DashboardSnapshot {
    db_path: String,
    organs: Vec<OrganSummary>,
    latest_lab_results: Vec<LabResult>,
    recent_symptoms: Vec<SymptomEntry>,
    conditions: Vec<ConditionEntry>,
    regimen_items: Vec<RegimenItem>,
    ai_recommendations: Vec<Recommendation>,
    lab_reports: Vec<LabReportEntry>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OrganSummary {
    key: String,
    name: String,
    system: String,
    status: String,
    lab_count: i64,
    symptom_count: i64,
}

#[tauri::command]
fn get_dashboard_snapshot(state: tauri::State<'_, AppState>) -> Result<DashboardSnapshot, String> {
    let db_path = state.db_path_display();
    with_db(&state, |conn| {
        Ok(DashboardSnapshot {
            db_path,
            organs: list_organs(conn).map_err(|error| error.to_string())?,
            latest_lab_results: records::list_latest_lab_results(conn)
                .map_err(|error| error.to_string())?,
            recent_symptoms: records::list_recent_symptoms(conn)
                .map_err(|error| error.to_string())?,
            conditions: conditions::list_conditions(conn).map_err(|error| error.to_string())?,
            regimen_items: regimen::list_regimen_items(conn).map_err(|error| error.to_string())?,
            ai_recommendations: records::build_recommendations(conn)
                .map_err(|error| error.to_string())?,
            lab_reports: records::list_lab_reports_for_snapshot(conn)
                .map_err(|error| error.to_string())?,
        })
    })
}

#[tauri::command]
fn get_database_status(state: tauri::State<'_, AppState>) -> DatabaseStatus {
    state.status()
}

#[tauri::command]
fn unlock_database(
    passphrase: String,
    state: tauri::State<'_, AppState>,
) -> Result<DatabaseStatus, String> {
    database::unlock_database(&state, &passphrase)
}

#[tauri::command]
fn export_database(
    passphrase: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    database::export_encrypted_database(&state, &passphrase)
}

/// Returns the stored AI settings JSON, or `{}` when nothing has been saved yet.
#[tauri::command]
fn get_ai_settings(state: tauri::State<'_, AppState>) -> Result<String, String> {
    with_db(&state, |conn| {
        let row: Option<String> = conn
            .query_row("SELECT settings FROM ai_settings WHERE id = 1", [], |row| {
                row.get(0)
            })
            .ok();
        Ok(row.unwrap_or_else(|| "{}".to_string()))
    })
}

/// Persists the AI settings JSON document after checking that secrets are still
/// referenced by environment-variable name rather than stored directly.
#[tauri::command]
fn save_ai_settings(settings: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let parsed = parse_json_object("AI settings", &settings)?;
    validate_ai_settings(&parsed)?;

    with_db(&state, |conn| {
        conn.execute(
            "INSERT INTO ai_settings (id, settings, updated_at)
             VALUES (1, ?1, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at",
            params![settings],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    })
}

#[tauri::command]
fn get_user_state(state: tauri::State<'_, AppState>) -> Result<String, String> {
    with_db(&state, |conn| {
        let row: Option<String> = conn
            .query_row("SELECT state FROM user_state WHERE id = 1", [], |row| {
                row.get(0)
            })
            .ok();
        Ok(row.unwrap_or_else(|| "{}".to_string()))
    })
}

#[tauri::command]
fn save_user_state(state: String, app_state: tauri::State<'_, AppState>) -> Result<(), String> {
    if state.len() > MAX_USER_STATE_BYTES {
        return Err(format!("User state must be {MAX_USER_STATE_BYTES} bytes or fewer"));
    }
    parse_json_object("User state", &state)?;
    with_db(&app_state, |conn| {
        conn.execute(
            "INSERT INTO user_state (id, state, updated_at)
             VALUES (1, ?1, CURRENT_TIMESTAMP)
             ON CONFLICT(id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at",
            params![state],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    })
}

fn with_db<T>(
    state: &tauri::State<'_, AppState>,
    action: impl FnOnce(&Connection) -> Result<T, String>,
) -> Result<T, String> {
    database::with_connection(state, action)
}

fn parse_json_object(label: &str, value: &str) -> Result<serde_json::Value, String> {
    let parsed = serde_json::from_str::<serde_json::Value>(value)
        .map_err(|error| format!("{label} is not valid JSON: {error}"))?;
    if parsed.is_object() {
        Ok(parsed)
    } else {
        Err(format!("{label} must be a JSON object"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let state = database::init_database_state(app)?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_database_status,
            database::select_database,
            unlock_database,
            export_database,
            get_dashboard_snapshot,
            records::add_lab_result,
            records::update_lab_result,
            records::delete_lab_result,
            records::symptoms::add_symptom,
            records::symptoms::update_symptom,
            records::symptoms::delete_symptom,
            conditions::add_condition,
            conditions::update_condition,
            conditions::delete_condition,
            regimen::add_regimen_item,
            regimen::update_regimen_item,
            regimen::delete_regimen_item,
            regimen::stop_regimen_item,
            regimen::reactivate_regimen_item,
            records::add_lab_results,
            records::reports::list_lab_reports,
            records::reports::unlink_lab_report,
            records::reports::delete_lab_report,
            document_files::save_document_copy,
            codex_cli::ask_llm,
            codex_cli::get_codex_options,
            codex_cli::analyze_document,
            get_ai_settings,
            save_ai_settings,
            get_user_state,
            save_user_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn list_organs(conn: &Connection) -> rusqlite::Result<Vec<OrganSummary>> {
    let mut stmt = conn.prepare(
        "SELECT
           o.key,
           o.name,
           o.system,
           CASE
             WHEN EXISTS (SELECT 1 FROM lab_results l WHERE l.organ_key = o.key AND l.deleted_at = '' AND l.status = 'attention')
               OR EXISTS (SELECT 1 FROM symptoms s WHERE s.organ_key = o.key AND s.deleted_at = '' AND s.severity >= 4)
             THEN 'attention'
             WHEN EXISTS (SELECT 1 FROM lab_results l WHERE l.organ_key = o.key AND l.deleted_at = '' AND l.status = 'monitor')
               OR EXISTS (SELECT 1 FROM symptoms s WHERE s.organ_key = o.key AND s.deleted_at = '' AND s.severity >= 2)
               OR EXISTS (SELECT 1 FROM conditions c WHERE c.organ_key = o.key AND c.deleted_at = '' AND c.status = 'current')
             THEN 'monitor'
             ELSE 'normal'
           END AS status,
           (SELECT COUNT(*) FROM lab_results l WHERE l.organ_key = o.key AND l.deleted_at = '') AS lab_count,
           (SELECT COUNT(*) FROM symptoms s WHERE s.organ_key = o.key AND s.deleted_at = '') AS symptom_count
         FROM organs o
         ORDER BY o.display_order ASC, o.name COLLATE NOCASE ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(OrganSummary {
            key: row.get(0)?,
            name: row.get(1)?,
            system: row.get(2)?,
            status: row.get(3)?,
            lab_count: row.get(4)?,
            symptom_count: row.get(5)?,
        })
    })?;
    rows.collect()
}
