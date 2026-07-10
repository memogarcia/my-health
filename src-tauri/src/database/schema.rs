use crate::document_files::{validate_document_upload, MAX_DOCUMENT_BYTES};
use crate::records::parse::{derive_flag_from_reference, parse_lab_number, parse_reference_range};
use rusqlite::{params, Connection};
use std::{fs::File, io::Read, path::Path};

pub(super) const SCHEMA: &str = r#"
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS app_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  app_id TEXT NOT NULL
);
INSERT OR IGNORE INTO app_metadata (id, app_id) VALUES (1, 'me-health-dashboard');
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
  document_bytes BLOB NOT NULL DEFAULT X'',
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

pub(super) fn migrate_legacy_document_copies(conn: &Connection) -> rusqlite::Result<()> {
    let mut statement = conn.prepare(
        "SELECT id, source_name, local_copy_path
         FROM lab_reports
         WHERE local_copy_path <> '' AND length(document_bytes) = 0",
    )?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);

    for (id, source_name, copy_path) in rows {
        let path = Path::new(&copy_path);
        let Ok(mut file) = File::open(path) else {
            continue;
        };
        let mut bytes = Vec::new();
        if file
            .by_ref()
            .take((MAX_DOCUMENT_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .is_err()
            || validate_document_upload(&source_name, &bytes).is_err()
        {
            continue;
        }
        conn.execute(
            "UPDATE lab_reports
             SET document_bytes = ?1, local_copy_path = '', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2",
            params![bytes, id],
        )?;
    }
    Ok(())
}

pub(super) fn backfill_lab_result_derivatives(conn: &Connection) -> rusqlite::Result<()> {
    let mut statement = conn.prepare(
        "SELECT id, value, reference_range
         FROM lab_results
         WHERE value_number IS NULL
            OR (reference_range <> '' AND flag = 'unknown')
            OR (reference_range <> '' AND reference_low IS NULL AND reference_high IS NULL)",
    )?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);

    for (id, value, reference_range) in rows {
        let value_number = parse_lab_number(&value);
        let (reference_low, reference_high) = parse_reference_range(&reference_range);
        let flag = derive_flag_from_reference(value_number, &reference_range);
        conn.execute(
            "UPDATE lab_results
             SET value_number = ?1,
                 reference_low = ?2,
                 reference_high = ?3,
                 flag = ?4
             WHERE id = ?5",
            params![value_number, reference_low, reference_high, flag, id],
        )?;
    }
    Ok(())
}
