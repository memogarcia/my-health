use rusqlite::{params, Connection};
use serde::Serialize;
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;
mod paths;
mod schema;
mod seed;
use paths::{is_plaintext_sqlite, migration_paths, unix_nanos};
use schema::{backfill_lab_result_derivatives, migrate_legacy_document_copies, SCHEMA};
use seed::seed_organs;
const APPLICATION_ID: i64 = 0x4D45_4844;
const APPLICATION_NAME: &str = "me-health-dashboard";
const ACTIVE_DATABASE_FILE: &str = "active-database-path";
#[cfg(any(debug_assertions, test))]
const DEV_MOCK_DATABASE_NAME: &str = "mock-health-dashboard.sqlite3";
pub struct AppState {
    inner: Mutex<DatabaseSession>,
}
struct DatabaseSession {
    conn: Option<Connection>,
    db_path: PathBuf,
    requires_encryption: bool,
    active_path_file: Option<PathBuf>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStatus {
    db_path: String,
    state: String,
    configured: bool,
    unlocked: bool,
    has_legacy_plaintext: bool,
}
impl AppState {
    #[cfg(any(debug_assertions, test))]
    #[cfg_attr(debug_assertions, allow(dead_code))]
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            inner: Mutex::new(DatabaseSession {
                conn: None,
                db_path,
                requires_encryption: true,
                active_path_file: None,
            }),
        }
    }
    #[cfg(any(debug_assertions, test))]
    fn unlocked_plaintext(db_path: PathBuf, conn: Connection) -> Self {
        Self {
            inner: Mutex::new(DatabaseSession {
                conn: Some(conn),
                db_path,
                requires_encryption: false,
                active_path_file: None,
            }),
        }
    }
    fn persistent(db_path: PathBuf, active_path_file: PathBuf) -> Self {
        Self {
            inner: Mutex::new(DatabaseSession {
                conn: None,
                db_path,
                requires_encryption: true,
                active_path_file: Some(active_path_file),
            }),
        }
    }
    pub fn db_path_display(&self) -> String {
        self.inner
            .lock()
            .map(|inner| inner.db_path.display().to_string())
            .unwrap_or_else(|_| "database unavailable".into())
    }
    pub fn status(&self) -> DatabaseStatus {
        let Ok(inner) = self.inner.lock() else {
            return DatabaseStatus {
                db_path: "database unavailable".into(),
                state: "locked".into(),
                configured: false,
                unlocked: false,
                has_legacy_plaintext: false,
            };
        };
        database_status(
            &inner.db_path,
            inner.conn.is_some(),
            inner.requires_encryption,
        )
    }
}
fn database_status(db_path: &Path, unlocked: bool, requires_encryption: bool) -> DatabaseStatus {
    if requires_encryption {
        let _ = recover_plaintext_migration(db_path);
    }
    let has_db = db_path.exists();
    let has_legacy_plaintext = requires_encryption
        && (is_plaintext_sqlite(db_path) || is_plaintext_sqlite(&migration_paths(db_path).1));
    let state = if unlocked {
        "unlocked"
    } else if has_legacy_plaintext {
        "legacyPlaintext"
    } else if has_db {
        "locked"
    } else {
        "needsSetup"
    };
    DatabaseStatus {
        db_path: db_path.display().to_string(),
        state: state.into(),
        configured: has_db && (!requires_encryption || !has_legacy_plaintext),
        unlocked,
        has_legacy_plaintext,
    }
}
pub fn init_database_state(app: &mut tauri::App) -> Result<AppState, Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;
    #[cfg(debug_assertions)]
    {
        init_dev_database_state(&app_data_dir)
    }
    #[cfg(not(debug_assertions))]
    {
        let document_dir = app
            .path()
            .document_dir()
            .unwrap_or_else(|_| app_data_dir.clone());
        fs::create_dir_all(&document_dir)?;
        Ok(persistent_database_state(
            &app_data_dir,
            document_dir.join("health-dashboard.sqlite3"),
        ))
    }
}
#[cfg(any(debug_assertions, test))]
fn init_dev_database_state(app_data_dir: &Path) -> Result<AppState, Box<dyn std::error::Error>> {
    if std::env::var("ME_HEALTH_USE_MOCK_DB").ok().as_deref() == Some("1") {
        let db_path = app_data_dir.join(DEV_MOCK_DATABASE_NAME);
        if !db_path.exists() {
            // ponytail: copy once; delete the app-data mock DB when the fixture needs a clean refresh.
            fs::copy(dev_mock_database_path(), &db_path)?;
        }
        let conn = open_plaintext_database(&db_path)?;
        install_schema(&conn)?;
        return Ok(AppState::unlocked_plaintext(db_path, conn));
    }
    Ok(persistent_database_state(
        app_data_dir,
        app_data_dir.join("health-dashboard-dev.sqlite3"),
    ))
}
fn persistent_database_state(app_data_dir: &Path, default_path: PathBuf) -> AppState {
    let active_path_file = app_data_dir.join(ACTIVE_DATABASE_FILE);
    let db_path = fs::read_to_string(&active_path_file)
        .ok()
        .map(|value| PathBuf::from(value.trim()))
        .filter(|path| !path.as_os_str().is_empty())
        .unwrap_or(default_path);
    AppState::persistent(db_path, active_path_file)
}
#[cfg(any(debug_assertions, test))]
fn dev_mock_database_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("dev")
        .join(DEV_MOCK_DATABASE_NAME)
}
fn normalize_database_path(path: &str) -> Result<PathBuf, String> {
    let path = path.trim();
    if path.is_empty() {
        return Err("Choose a database file first.".into());
    }
    let path = PathBuf::from(path);
    if path.exists() && path.is_dir() {
        return Err("Choose a database file, not a folder.".into());
    }
    if let Some(parent) = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    Ok(path)
}
#[tauri::command]
pub fn select_database(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<DatabaseStatus, String> {
    select_database_path(&state, &path)
}
pub fn select_database_path(state: &AppState, path: &str) -> Result<DatabaseStatus, String> {
    let path = normalize_database_path(path)?;
    let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
    if let Some(active_path_file) = &inner.active_path_file {
        persist_active_database_path(active_path_file, &path)?;
    }
    inner.conn = None;
    inner.db_path = path;
    inner.requires_encryption = true;
    drop(inner);
    Ok(state.status())
}
pub fn unlock_database(state: &AppState, passphrase: &str) -> Result<DatabaseStatus, String> {
    let passphrase = validate_passphrase(passphrase)?;
    let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
    if inner.conn.is_some() {
        drop(inner);
        return Ok(state.status());
    }
    recover_plaintext_migration(&inner.db_path)?;
    let had_content = inner
        .db_path
        .metadata()
        .map(|metadata| metadata.len() > 0)
        .unwrap_or(false);
    if is_plaintext_sqlite(&inner.db_path) {
        migrate_plaintext_database(&inner.db_path, passphrase)?;
    }
    let conn = open_encrypted_database(&inner.db_path, passphrase).map_err(|_| {
        "Could not unlock the database. Check the passphrase and try again.".to_string()
    })?;
    if had_content {
        validate_app_database(&conn, true)?;
    }
    install_schema(&conn).map_err(|error| error.to_string())?;
    inner.conn = Some(conn);
    drop(inner);
    Ok(state.status())
}
pub fn lock_database(state: &AppState) -> Result<DatabaseStatus, String> {
    let mut inner = state.inner.lock().map_err(|error| error.to_string())?;
    inner.conn = None;
    drop(inner);
    Ok(state.status())
}
pub fn with_connection<T>(
    state: &AppState,
    action: impl FnOnce(&Connection) -> Result<T, String>,
) -> Result<T, String> {
    let inner = state.inner.lock().map_err(|error| error.to_string())?;
    let conn = inner
        .conn
        .as_ref()
        .ok_or_else(|| "Database locked. Unlock it first.".to_string())?;
    action(conn)
}

pub fn with_connection_at_path<T>(
    state: &AppState,
    expected_path: &str,
    action: impl FnOnce(&Connection) -> Result<T, String>,
) -> Result<T, String> {
    let inner = state.inner.lock().map_err(|error| error.to_string())?;
    if inner.db_path.as_path() != Path::new(expected_path) {
        return Err("The active database changed before this operation completed.".into());
    }
    let conn = inner
        .conn
        .as_ref()
        .ok_or_else(|| "Database locked. Unlock it first.".to_string())?;
    action(conn)
}
pub fn export_encrypted_database(state: &AppState, passphrase: &str) -> Result<String, String> {
    let passphrase = validate_passphrase(passphrase)?;
    let inner = state.inner.lock().map_err(|error| error.to_string())?;
    let conn = inner
        .conn
        .as_ref()
        .ok_or_else(|| "Database locked. Unlock it before exporting.".to_string())?;
    let export_dir = inner
        .db_path
        .parent()
        .ok_or_else(|| "Database path has no parent directory.".to_string())?
        .join("exports");
    fs::create_dir_all(&export_dir).map_err(|error| error.to_string())?;
    let export_path = export_dir.join(format!("health-dashboard-export-{}.sqlite3", unix_nanos()));
    export_connection(conn, &export_path, passphrase)?;
    Ok(export_path.display().to_string())
}

fn migrate_plaintext_database(path: &Path, passphrase: &str) -> Result<(), String> {
    recover_plaintext_migration(path)?;
    let (encrypted_tmp, plaintext_backup) = migration_paths(path);
    let _ = fs::remove_file(&encrypted_tmp);
    let _ = fs::remove_file(&plaintext_backup);

    let source = Connection::open(path).map_err(|error| error.to_string())?;
    validate_app_database(&source, true)?;
    let encrypted_path = encrypted_tmp
        .to_str()
        .ok_or_else(|| "Database path is not valid UTF-8".to_string())?;
    source
        .execute(
            "ATTACH DATABASE ?1 AS encrypted KEY ?2",
            params![encrypted_path, passphrase],
        )
        .map_err(|error| error.to_string())?;
    source
        .query_row("SELECT sqlcipher_export('encrypted')", [], |_| Ok(()))
        .map_err(|error| error.to_string())?;
    source
        .execute_batch("DETACH DATABASE encrypted;")
        .map_err(|error| error.to_string())?;
    drop(source);

    let target =
        open_encrypted_database(&encrypted_tmp, passphrase).map_err(|error| error.to_string())?;
    install_schema(&target).map_err(|error| error.to_string())?;
    drop(target);
    open_encrypted_database(&encrypted_tmp, passphrase).map_err(|error| error.to_string())?;

    fs::rename(path, &plaintext_backup).map_err(|error| error.to_string())?;
    if let Err(error) = fs::rename(&encrypted_tmp, path) {
        let _ = fs::rename(&plaintext_backup, path);
        return Err(error.to_string());
    }
    fs::remove_file(&plaintext_backup).map_err(|error| error.to_string())?;
    Ok(())
}

fn export_connection(conn: &Connection, path: &Path, passphrase: &str) -> Result<(), String> {
    if path.exists() {
        return Err("Export path already exists.".into());
    }
    let export_path = path
        .to_str()
        .ok_or_else(|| "Export path is not valid UTF-8".to_string())?;
    conn.execute(
        "ATTACH DATABASE ?1 AS exported KEY ?2",
        params![export_path, passphrase],
    )
    .map_err(|error| error.to_string())?;
    let export_result = conn.query_row("SELECT sqlcipher_export('exported')", [], |_| Ok(()));
    conn.execute_batch("DETACH DATABASE exported;")
        .map_err(|error| error.to_string())?;
    export_result.map_err(|error| error.to_string())?;
    open_encrypted_database(path, passphrase).map_err(|error| error.to_string())?;
    if is_plaintext_sqlite(path) {
        return Err("Export was not encrypted.".into());
    }
    Ok(())
}

fn open_encrypted_database(path: &Path, passphrase: &str) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "key", passphrase)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))?;
    Ok(conn)
}

#[cfg(any(debug_assertions, test))]
fn open_plaintext_database(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    Ok(conn)
}

fn install_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(SCHEMA)?;
    conn.pragma_update(None, "application_id", APPLICATION_ID)?;
    migrate_schema(conn)?;
    seed_organs(conn)
}

fn validate_app_database(conn: &Connection, allow_legacy: bool) -> Result<(), String> {
    let application_id: i64 = conn
        .pragma_query_value(None, "application_id", |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if application_id == APPLICATION_ID {
        return Ok(());
    }
    let marker: Option<String> = conn
        .query_row("SELECT app_id FROM app_metadata WHERE id = 1", [], |row| {
            row.get(0)
        })
        .ok();
    if marker.as_deref() == Some(APPLICATION_NAME) {
        return Ok(());
    }
    if allow_legacy && has_legacy_app_schema(conn)? {
        return Ok(());
    }
    Err("This file is not a Me Health Dashboard database. It was not modified.".into())
}

fn has_legacy_app_schema(conn: &Connection) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'table' AND name IN ('organs', 'lab_results', 'symptoms')",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    Ok(count == 3)
}

fn persist_active_database_path(active_path_file: &Path, db_path: &Path) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(active_path_file)
        .map_err(|error| error.to_string())?;
    file.write_all(db_path.to_string_lossy().as_bytes())
        .map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(active_path_file, fs::Permissions::from_mode(0o600))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn migrate_schema(conn: &Connection) -> rusqlite::Result<()> {
    for (table, name, sql) in [
        ("organs", "display_order", "ALTER TABLE organs ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0"),
        ("lab_reports", "source_name", "ALTER TABLE lab_reports ADD COLUMN source_name TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "file_type", "ALTER TABLE lab_reports ADD COLUMN file_type TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "size_label", "ALTER TABLE lab_reports ADD COLUMN size_label TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "local_copy_path", "ALTER TABLE lab_reports ADD COLUMN local_copy_path TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "document_bytes", "ALTER TABLE lab_reports ADD COLUMN document_bytes BLOB NOT NULL DEFAULT X''"),
        ("lab_reports", "updated_at", "ALTER TABLE lab_reports ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "deleted_at", "ALTER TABLE lab_reports ADD COLUMN deleted_at TEXT NOT NULL DEFAULT ''"),
        ("lab_results", "report_id", "ALTER TABLE lab_results ADD COLUMN report_id INTEGER REFERENCES lab_reports(id) ON DELETE SET NULL"),
        ("lab_results", "value_number", "ALTER TABLE lab_results ADD COLUMN value_number REAL"),
        ("lab_results", "flag", "ALTER TABLE lab_results ADD COLUMN flag TEXT NOT NULL DEFAULT 'unknown' CHECK (flag IN ('low', 'normal', 'high', 'unknown'))"),
        ("lab_results", "reference_range", "ALTER TABLE lab_results ADD COLUMN reference_range TEXT NOT NULL DEFAULT ''"),
        ("lab_results", "reference_low", "ALTER TABLE lab_results ADD COLUMN reference_low REAL"),
        ("lab_results", "reference_high", "ALTER TABLE lab_results ADD COLUMN reference_high REAL"),
        ("lab_results", "updated_at", "ALTER TABLE lab_results ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"),
        ("lab_results", "deleted_at", "ALTER TABLE lab_results ADD COLUMN deleted_at TEXT NOT NULL DEFAULT ''"),
        ("symptoms", "updated_at", "ALTER TABLE symptoms ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"),
        ("symptoms", "deleted_at", "ALTER TABLE symptoms ADD COLUMN deleted_at TEXT NOT NULL DEFAULT ''"),
        ("conditions", "updated_at", "ALTER TABLE conditions ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"),
        ("conditions", "deleted_at", "ALTER TABLE conditions ADD COLUMN deleted_at TEXT NOT NULL DEFAULT ''"),
        ("regimen_items", "updated_at", "ALTER TABLE regimen_items ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"),
        ("regimen_items", "deleted_at", "ALTER TABLE regimen_items ADD COLUMN deleted_at TEXT NOT NULL DEFAULT ''"),
    ] {
        add_column_if_missing(conn, table, name, sql)?;
    }
    backfill_lab_result_derivatives(conn)?;
    migrate_legacy_document_copies(conn)?;
    Ok(())
}

fn add_column_if_missing(
    conn: &Connection,
    table: &str,
    column: &str,
    sql: &str,
) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(stmt);
    if columns.is_empty() {
        return Ok(());
    }
    if !columns.iter().any(|name| name.eq_ignore_ascii_case(column)) {
        conn.execute(sql, [])?;
    }
    Ok(())
}

fn validate_passphrase(passphrase: &str) -> Result<&str, String> {
    let passphrase = passphrase.trim();
    if passphrase.len() < 12 {
        Err("Database passphrase must be at least 12 characters.".into())
    } else {
        Ok(passphrase)
    }
}

fn recover_plaintext_migration(path: &Path) -> Result<(), String> {
    let (encrypted_tmp, plaintext_backup) = migration_paths(path);
    if !path.exists() && plaintext_backup.exists() {
        fs::rename(&plaintext_backup, path).map_err(|error| error.to_string())?;
    }
    if path.exists() && plaintext_backup.exists() && !is_plaintext_sqlite(path) {
        fs::remove_file(&plaintext_backup).map_err(|error| error.to_string())?;
    }
    if path.exists() && is_plaintext_sqlite(path) {
        let _ = fs::remove_file(&encrypted_tmp);
    }
    Ok(())
}

#[cfg(test)]
mod tests;
