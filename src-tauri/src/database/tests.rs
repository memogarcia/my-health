use super::*;
use std::time::{SystemTime, UNIX_EPOCH};

#[test]
fn encrypted_database_is_not_plaintext_and_rejects_wrong_passphrase() {
    let path = temp_db_path("encrypted");
    let conn = open_encrypted_database(&path, "correct horse battery staple").unwrap();
    install_schema(&conn).unwrap();
    drop(conn);

    assert!(!is_plaintext_sqlite(&path));
    assert!(open_encrypted_database(&path, "wrong horse battery staple").is_err());
    let _ = fs::remove_file(path);
}

#[test]
fn plaintext_database_migrates_to_encrypted_file() {
    let path = temp_db_path("migration");
    let conn = Connection::open(&path).unwrap();
    install_schema(&conn).unwrap();
    conn.execute(
        "INSERT INTO lab_results (organ_key, marker, value, unit, status, measured_at, notes)
             VALUES ('heart', 'LDL', '120', 'mg/dL', 'monitor', '2026-07-08', 'synthetic')",
        [],
    )
    .unwrap();
    drop(conn);
    assert!(is_plaintext_sqlite(&path));

    migrate_plaintext_database(&path, "correct horse battery staple").unwrap();
    assert!(!is_plaintext_sqlite(&path));
    let encrypted = open_encrypted_database(&path, "correct horse battery staple").unwrap();
    let count: i64 = encrypted
        .query_row(
            "SELECT COUNT(*) FROM lab_results WHERE marker = 'LDL'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
    let _ = fs::remove_file(path);
}

#[test]
fn status_recovers_plaintext_backup_when_main_file_is_missing() {
    let path = temp_db_path("migration-recover-missing");
    let (_, backup) = migration_paths(&path);
    let conn = Connection::open(&backup).unwrap();
    install_schema(&conn).unwrap();
    drop(conn);

    let state = AppState::new(path.clone());

    assert_eq!(state.status().state, "legacyPlaintext");
    assert!(path.exists());
    assert!(!backup.exists());
    let _ = fs::remove_file(path);
}

#[test]
fn status_removes_plaintext_backup_after_encrypted_main_exists() {
    let path = temp_db_path("migration-recover-backup");
    let (_, backup) = migration_paths(&path);
    let encrypted = open_encrypted_database(&path, "correct horse battery staple").unwrap();
    install_schema(&encrypted).unwrap();
    drop(encrypted);
    let plaintext = Connection::open(&backup).unwrap();
    install_schema(&plaintext).unwrap();
    drop(plaintext);

    let state = AppState::new(path.clone());

    assert_eq!(state.status().state, "locked");
    assert!(!backup.exists());
    let _ = fs::remove_file(path);
}

#[test]
fn unlock_database_creates_encrypted_state() {
    let path = temp_db_path("state");
    let state = AppState::new(path.clone());

    assert_eq!(state.status().state, "needsSetup");
    let status = unlock_database(&state, "correct horse battery staple").unwrap();
    assert_eq!(status.state, "unlocked");
    assert!(status.configured);
    assert!(status.unlocked);
    assert!(!is_plaintext_sqlite(&path));
    with_connection(&state, |conn| {
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM organs", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;
        assert!(count > 0);
        Ok(())
    })
    .unwrap();
    let _ = fs::remove_file(path);
}

#[test]
fn dev_database_state_opens_plaintext_mock_database() {
    let dir = temp_dir_path("dev-mock");
    fs::create_dir_all(&dir).unwrap();

    let state = init_dev_database_state(&dir).unwrap();
    let status = state.status();

    assert_eq!(status.state, "unlocked");
    assert!(status.configured);
    assert!(!status.has_legacy_plaintext);
    assert!(is_plaintext_sqlite(&PathBuf::from(&status.db_path)));
    with_connection(&state, |conn| {
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM lab_results", [], |row| row.get(0))
            .map_err(|error| error.to_string())?;
        assert!(count > 0);
        Ok(())
    })
    .unwrap();
    let _ = fs::remove_dir_all(dir);
}

#[test]
fn export_database_writes_encrypted_copy() {
    let path = temp_db_path("export-source");
    let state = AppState::new(path.clone());
    unlock_database(&state, "correct horse battery staple").unwrap();
    with_connection(&state, |conn| {
        conn.execute(
            "INSERT INTO lab_results (organ_key, marker, value, unit, status, measured_at, notes)
                 VALUES ('heart', 'HDL', '55', 'mg/dL', 'normal', '2026-07-08', 'synthetic')",
            [],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    })
    .unwrap();

    let exported = export_encrypted_database(&state, "export horse battery staple").unwrap();
    let exported_path = PathBuf::from(&exported);
    assert!(!is_plaintext_sqlite(&exported_path));
    assert!(open_encrypted_database(&exported_path, "wrong horse battery staple").is_err());
    let encrypted = open_encrypted_database(&exported_path, "export horse battery staple").unwrap();
    let count: i64 = encrypted
        .query_row(
            "SELECT COUNT(*) FROM lab_results WHERE marker = 'HDL'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
    let _ = fs::remove_file(path);
    let _ = fs::remove_file(exported_path);
}

#[test]
fn export_database_uses_unique_paths() {
    let path = temp_db_path("export-collision");
    let state = AppState::new(path.clone());
    unlock_database(&state, "correct horse battery staple").unwrap();

    let first = export_encrypted_database(&state, "export horse battery staple").unwrap();
    let second = export_encrypted_database(&state, "export horse battery staple").unwrap();

    assert_ne!(first, second);
    let _ = fs::remove_file(path);
    let _ = fs::remove_file(first);
    let _ = fs::remove_file(second);
}

#[test]
fn migrate_schema_adds_reference_range_to_legacy_tables() {
    let path = temp_db_path("migrate-ref-range");
    let conn = Connection::open(&path).unwrap();
    // A database created before reference_range existed: the column is
    // absent and existing rows must keep their data when it is added.
    conn.execute_batch(
        "CREATE TABLE lab_reports (id INTEGER PRIMARY KEY);
         INSERT INTO lab_reports DEFAULT VALUES;
         CREATE TABLE lab_results (
               id INTEGER PRIMARY KEY,
               organ_key TEXT, marker TEXT, value TEXT, unit TEXT,
               status TEXT, measured_at TEXT, notes TEXT, created_at TEXT
             );
             INSERT INTO lab_results (organ_key, marker, value, unit, status, measured_at, notes)
             VALUES ('heart', 'LDL', '120', 'mg/dL', 'monitor', '2026-07-08', 'synthetic');",
    )
    .unwrap();

    migrate_schema(&conn).unwrap();

    let range: String = conn
        .query_row(
            "SELECT reference_range FROM lab_results WHERE marker = 'LDL'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(range, "");
    let flag: String = conn
        .query_row("SELECT flag FROM lab_results WHERE marker = 'LDL'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(flag, "unknown");
    let copy_path: String = conn
        .query_row("SELECT local_copy_path FROM lab_reports LIMIT 1", [], |row| row.get(0))
        .unwrap();
    assert_eq!(copy_path, "");

    // Idempotent: a second run is a no-op and does not error.
    migrate_schema(&conn).unwrap();

    let _ = fs::remove_file(path);
}

#[test]
fn select_database_relocks_and_changes_path() {
    let first = temp_db_path("select-first");
    let second = temp_db_path("select-second");
    let state = AppState::new(first.clone());
    unlock_database(&state, "correct horse battery staple").unwrap();

    let status = select_database_path(&state, second.to_str().unwrap()).unwrap();

    assert_eq!(status.state, "needsSetup");
    assert_eq!(status.db_path, second.display().to_string());
    assert!(with_connection(&state, |_| Ok(())).is_err());
    let _ = fs::remove_file(first);
    let _ = fs::remove_file(second);
}

fn temp_db_path(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!("me-{label}-{nanos}.sqlite3"))
}

fn temp_dir_path(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!("me-{label}-{nanos}"))
}
