use rusqlite::{params, Connection};
use serde::Serialize;
use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
mod seed;
use seed::seed_organs;
const SCHEMA: &str = r#"
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS organs (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  system TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'monitor', 'attention')),
  notes TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lab_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT '',
  size_label TEXT NOT NULL DEFAULT '',
  local_copy_path TEXT NOT NULL DEFAULT '',
  test_date TEXT NOT NULL DEFAULT '',
  report_date TEXT NOT NULL DEFAULT '',
  lab_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS lab_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER REFERENCES lab_reports(id) ON DELETE SET NULL,
  organ_key TEXT NOT NULL REFERENCES organs(key) ON DELETE CASCADE,
  marker TEXT NOT NULL,
  value TEXT NOT NULL,
  value_number REAL,
  unit TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('normal', 'monitor', 'attention')),
  flag TEXT NOT NULL DEFAULT 'unknown' CHECK (flag IN ('low', 'normal', 'high', 'unknown')),
  measured_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  reference_range TEXT NOT NULL DEFAULT '',
  reference_low REAL,
  reference_high REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS symptoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organ_key TEXT NOT NULL REFERENCES organs(key) ON DELETE CASCADE,
  name TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  observed_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS conditions (
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
CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- ponytail: one JSON row is enough for early profile, daily log, and import summaries; split tables when querying them matters.
CREATE TABLE IF NOT EXISTS user_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS regimen_items (
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
);
"#;
#[cfg(any(debug_assertions, test))]
const DEV_MOCK_DATABASE_NAME: &str = "mock-health-dashboard.sqlite3";
pub struct AppState {
    inner: Mutex<DatabaseSession>,
}
struct DatabaseSession {
    conn: Option<Connection>,
    db_path: PathBuf,
    requires_encryption: bool,
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
    #[cfg_attr(debug_assertions, allow(dead_code))]
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            inner: Mutex::new(DatabaseSession {
                conn: None,
                db_path,
                requires_encryption: true,
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
        let document_dir = app.path().document_dir().unwrap_or(app_data_dir);
        fs::create_dir_all(&document_dir)?;
        Ok(AppState::new(document_dir.join("health-dashboard.sqlite3")))
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
    Ok(AppState::new(app_data_dir.join("health-dashboard-dev.sqlite3")))
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
    if is_plaintext_sqlite(&inner.db_path) {
        migrate_plaintext_database(&inner.db_path, passphrase)?;
    }
    let conn = open_encrypted_database(&inner.db_path, passphrase).map_err(|_| {
        "Could not unlock the database. Check the passphrase and try again.".to_string()
    })?;
    install_schema(&conn).map_err(|error| error.to_string())?;
    inner.conn = Some(conn);
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
    migrate_schema(conn)?;
    seed_organs(conn)
}

fn migrate_schema(conn: &Connection) -> rusqlite::Result<()> {
    for (table, name, sql) in [
        ("organs", "display_order", "ALTER TABLE organs ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0"),
        ("lab_reports", "source_name", "ALTER TABLE lab_reports ADD COLUMN source_name TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "file_type", "ALTER TABLE lab_reports ADD COLUMN file_type TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "size_label", "ALTER TABLE lab_reports ADD COLUMN size_label TEXT NOT NULL DEFAULT ''"),
        ("lab_reports", "local_copy_path", "ALTER TABLE lab_reports ADD COLUMN local_copy_path TEXT NOT NULL DEFAULT ''"),
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

fn is_plaintext_sqlite(path: &Path) -> bool {
    let mut header = [0; 16];
    File::open(path)
        .and_then(|mut file| file.read_exact(&mut header))
        .map(|_| header == *b"SQLite format 3\0")
        .unwrap_or(false)
}

fn migration_paths(path: &Path) -> (PathBuf, PathBuf) {
    (
        path.with_extension("sqlite3.encrypted-tmp"),
        path.with_extension("sqlite3.plaintext-backup"),
    )
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

fn unix_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests;
