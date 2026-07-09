use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

use crate::database::{self, AppState};
pub(crate) mod parse;
use parse::{
    derive_flag, parse_lab_number, parse_reference_range, validate_iso_date, validate_required,
    validate_status,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabResult {
    id: i64,
    report_id: Option<i64>,
    report_source_name: Option<String>,
    report_local_copy_path: Option<String>,
    organ_key: String,
    marker: String,
    value: String,
    value_number: Option<f64>,
    unit: String,
    status: String,
    flag: String,
    measured_at: String,
    notes: String,
    reference_range: String,
    reference_low: Option<f64>,
    reference_high: Option<f64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LabReportInput {
    source_name: String,
    file_type: String,
    size_label: String,
    local_copy_path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLabResultInput {
    organ_key: String,
    marker: String,
    value: String,
    unit: String,
    status: String,
    measured_at: String,
    notes: String,
    reference_range: String,
    report: Option<LabReportInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LabResultSeed {
    organ_key: String,
    marker: String,
    value: String,
    unit: String,
    status: String,
    measured_at: String,
    notes: String,
    reference_range: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLabResultsBatchInput {
    results: Vec<LabResultSeed>,
    report: Option<LabReportInput>,
}

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

#[derive(Serialize)]
pub struct Recommendation {
    pub title: String,
    pub body: String,
    pub priority: String,
}

#[tauri::command]
pub fn add_lab_result(
    input: AddLabResultInput,
    state: tauri::State<'_, AppState>,
) -> Result<LabResult, String> {
    validate_required("marker", &input.marker)?;
    validate_required("value", &input.value)?;
    validate_required("measuredAt", &input.measured_at)?;
    validate_iso_date("measuredAt", &input.measured_at)?;
    validate_status(&input.status)?;

    database::with_connection(&state, |conn| {
        ensure_organ(conn, &input.organ_key)?;
        let report_id = insert_lab_report(conn, input.report.as_ref())?;
        let id = insert_lab_result(
            conn,
            report_id,
            &input.organ_key,
            &input.marker,
            &input.value,
            &input.unit,
            &input.status,
            &input.measured_at,
            &input.notes,
            &input.reference_range,
        )?;
        get_lab_result(conn, id).map_err(|error| error.to_string())
    })
}

/// Accepts several results extracted from one document, creates a single shared
/// `lab_reports` row, and inserts every result linked to it inside one
/// transaction so a partial failure rolls back the whole batch.
#[tauri::command]
pub fn add_lab_results(
    input: AddLabResultsBatchInput,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<LabResult>, String> {
    if input.results.is_empty() {
        return Err("No results to save".into());
    }
    for (index, seed) in input.results.iter().enumerate() {
        let label = format!("Result {}", index + 1);
        validate_required("marker", &seed.marker).map_err(|m| format!("{label}: {m}"))?;
        validate_required("value", &seed.value).map_err(|m| format!("{label}: {m}"))?;
        validate_required("measuredAt", &seed.measured_at).map_err(|m| format!("{label}: {m}"))?;
        validate_iso_date("measuredAt", &seed.measured_at).map_err(|m| format!("{label}: {m}"))?;
        validate_status(&seed.status).map_err(|m| format!("{label}: {m}"))?;
    }

    database::with_connection(&state, |conn| {
        conn.execute("BEGIN", []).map_err(|error| error.to_string())?;
        let outcome = (|| -> Result<Vec<LabResult>, String> {
            let report_id = insert_lab_report(conn, input.report.as_ref())?;
            let mut saved = Vec::with_capacity(input.results.len());
            for seed in &input.results {
                ensure_organ(conn, &seed.organ_key)?;
                let id = insert_lab_result(
                    conn,
                    report_id,
                    &seed.organ_key,
                    &seed.marker,
                    &seed.value,
                    &seed.unit,
                    &seed.status,
                    &seed.measured_at,
                    &seed.notes,
                    &seed.reference_range,
                )?;
                saved.push(get_lab_result(conn, id).map_err(|error| error.to_string())?);
            }
            Ok(saved)
        })();
        match outcome {
            Ok(saved) => {
                conn.execute("COMMIT", []).map_err(|error| error.to_string())?;
                Ok(saved)
            }
            Err(error) => {
                let _ = conn.execute("ROLLBACK", []);
                Err(error)
            }
        }
    })
}

#[tauri::command]
pub fn add_symptom(
    input: AddSymptomInput,
    state: tauri::State<'_, AppState>,
) -> Result<SymptomEntry, String> {
    validate_required("symptom", &input.name)?;
    validate_required("observedAt", &input.observed_at)?;
    validate_iso_date("observedAt", &input.observed_at)?;
    if !(1..=5).contains(&input.severity) {
        return Err("severity must be between 1 and 5".into());
    }

    database::with_connection(&state, |conn| {
        conn.execute(
            "INSERT INTO symptoms (organ_key, name, severity, observed_at, notes)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                input.organ_key.trim(),
                input.name.trim(),
                input.severity,
                input.observed_at.trim(),
                input.notes.trim()
            ],
        )
        .map_err(|error| error.to_string())?;
        get_symptom(conn, conn.last_insert_rowid()).map_err(|error| error.to_string())
    })
}

pub fn list_latest_lab_results(conn: &Connection) -> rusqlite::Result<Vec<LabResult>> {
    let mut stmt = conn.prepare(
        "SELECT
           l.id, l.report_id, r.source_name, r.local_copy_path, l.organ_key, l.marker, l.value,
           l.value_number, l.unit, l.status, l.flag, l.measured_at, l.notes,
           l.reference_range, l.reference_low, l.reference_high
         FROM lab_results l
         LEFT JOIN lab_reports r ON r.id = l.report_id
         ORDER BY l.measured_at DESC, l.id DESC",
    )?;
    let rows = stmt.query_map([], map_lab_result)?;
    rows.collect()
}

pub fn list_recent_symptoms(conn: &Connection) -> rusqlite::Result<Vec<SymptomEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, organ_key, name, severity, observed_at, notes
         FROM symptoms
         ORDER BY observed_at DESC, id DESC",
    )?;
    let rows = stmt.query_map([], map_symptom)?;
    rows.collect()
}

pub fn build_recommendations(conn: &Connection) -> rusqlite::Result<Vec<Recommendation>> {
    let lab_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM lab_results", [], |row| row.get(0))?;
    let attention_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM lab_results WHERE status = 'attention'",
        [],
        |row| row.get(0),
    )?;
    let symptom_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM symptoms", [], |row| row.get(0))?;

    let mut items = Vec::new();
    if attention_count > 0 {
        items.push(Recommendation {
            title: "Review attention items".into(),
            body: "Bring flagged lab results to a qualified clinician before changing treatment."
                .into(),
            priority: "attention".into(),
        });
    }
    if symptom_count > 0 {
        items.push(Recommendation {
            title: "Track symptom patterns".into(),
            body: "Add date, severity, and context so trends are visible over time.".into(),
            priority: "monitor".into(),
        });
    }
    if lab_count == 0 {
        items.push(Recommendation {
            title: "Add baseline labs".into(),
            body: "Start with recent blood work so organ panels have history to compare.".into(),
            priority: "normal".into(),
        });
    }
    items.push(Recommendation {
        title: "Keep data local".into(),
        body: "Store sensitive health details in this local database unless you explicitly enable sync.".into(),
        priority: "normal".into(),
    });
    Ok(items)
}

fn insert_lab_report(conn: &Connection, report: Option<&LabReportInput>) -> Result<Option<i64>, String> {
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

#[allow(clippy::too_many_arguments)]
fn insert_lab_result(
    conn: &Connection,
    report_id: Option<i64>,
    organ_key: &str,
    marker: &str,
    value: &str,
    unit: &str,
    status: &str,
    measured_at: &str,
    notes: &str,
    reference_range: &str,
) -> Result<i64, String> {
    let value_number = parse_lab_number(value);
    let (reference_low, reference_high) = parse_reference_range(reference_range);
    let flag = derive_flag(value_number, reference_low, reference_high);
    conn.execute(
        "INSERT INTO lab_results (
           report_id, organ_key, marker, value, value_number, unit, status, flag,
           measured_at, notes, reference_range, reference_low, reference_high
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            report_id,
            organ_key.trim(),
            marker.trim(),
            value.trim(),
            value_number,
            unit.trim(),
            status.trim(),
            flag,
            measured_at.trim(),
            notes.trim(),
            reference_range.trim(),
            reference_low,
            reference_high
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub(crate) fn ensure_organ(conn: &Connection, organ_key: &str) -> Result<(), String> {
    let found: Option<i64> = conn
        .query_row(
            "SELECT 1 FROM organs WHERE key = ?1",
            params![organ_key.trim()],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    found.map(|_| ()).ok_or_else(|| "organKey is not valid".into())
}

fn get_lab_result(conn: &Connection, id: i64) -> rusqlite::Result<LabResult> {
    conn.query_row(
        "SELECT
           l.id, l.report_id, r.source_name, r.local_copy_path, l.organ_key, l.marker, l.value,
           l.value_number, l.unit, l.status, l.flag, l.measured_at, l.notes,
           l.reference_range, l.reference_low, l.reference_high
         FROM lab_results l
         LEFT JOIN lab_reports r ON r.id = l.report_id
         WHERE l.id = ?1",
        params![id],
        map_lab_result,
    )
}

fn get_symptom(conn: &Connection, id: i64) -> rusqlite::Result<SymptomEntry> {
    conn.query_row(
        "SELECT id, organ_key, name, severity, observed_at, notes
         FROM symptoms
         WHERE id = ?1",
        params![id],
        map_symptom,
    )
}

fn map_lab_result(row: &Row<'_>) -> rusqlite::Result<LabResult> {
    Ok(LabResult {
        id: row.get(0)?,
        report_id: row.get(1)?,
        report_source_name: row.get(2)?,
        report_local_copy_path: row.get(3)?,
        organ_key: row.get(4)?,
        marker: row.get(5)?,
        value: row.get(6)?,
        value_number: row.get(7)?,
        unit: row.get(8)?,
        status: row.get(9)?,
        flag: row.get(10)?,
        measured_at: row.get(11)?,
        notes: row.get(12)?,
        reference_range: row.get(13)?,
        reference_low: row.get(14)?,
        reference_high: row.get(15)?,
    })
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_all_lab_results_for_research_context() {
        let conn = test_connection();
        for index in 0..13 {
            conn.execute(
                "INSERT INTO lab_results (
                   organ_key, marker, value, value_number, unit, status, flag,
                   measured_at, notes, reference_range, reference_low, reference_high
                 )
                 VALUES ('heart', ?1, '1', 1.0, 'mg/dL', 'normal', 'unknown', '2026-07-01', '', '', NULL, NULL)",
                params![format!("Marker {index}")],
            )
            .unwrap();
        }

        let results = list_latest_lab_results(&conn).unwrap();

        assert_eq!(results.len(), 13);
    }

    #[test]
    fn lists_all_symptoms_for_research_context() {
        let conn = test_connection();
        for index in 0..13 {
            conn.execute(
                "INSERT INTO symptoms (organ_key, name, severity, observed_at, notes)
                 VALUES ('heart', ?1, 2, '2026-07-01', '')",
                params![format!("Symptom {index}")],
            )
            .unwrap();
        }

        let symptoms = list_recent_symptoms(&conn).unwrap();

        assert_eq!(symptoms.len(), 13);
    }

    fn test_connection() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE lab_reports (
               id INTEGER PRIMARY KEY,
               source_name TEXT NOT NULL DEFAULT '',
               local_copy_path TEXT NOT NULL DEFAULT ''
             );
             CREATE TABLE lab_results (
               id INTEGER PRIMARY KEY,
               report_id INTEGER,
               organ_key TEXT NOT NULL,
               marker TEXT NOT NULL,
               value TEXT NOT NULL,
               value_number REAL,
               unit TEXT NOT NULL DEFAULT '',
               status TEXT NOT NULL,
               flag TEXT NOT NULL DEFAULT 'unknown',
               measured_at TEXT NOT NULL,
               notes TEXT NOT NULL DEFAULT '',
               reference_range TEXT NOT NULL DEFAULT '',
               reference_low REAL,
               reference_high REAL
             );
             CREATE TABLE symptoms (
               id INTEGER PRIMARY KEY,
               organ_key TEXT NOT NULL,
               name TEXT NOT NULL,
               severity INTEGER NOT NULL,
               observed_at TEXT NOT NULL,
               notes TEXT NOT NULL DEFAULT ''
             );",
        )
        .unwrap();
        conn
    }
}

#[cfg(test)]
mod storage_tests;
