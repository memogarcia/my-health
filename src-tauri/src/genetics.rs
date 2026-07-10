use std::collections::HashSet;

use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};

use crate::{
    database::{self, AppState},
    records::{
        parse::{validate_iso_date, validate_required},
        soft_delete_row,
    },
};

const MAX_REPORT_NAME_CHARS: usize = 200;
const MAX_PROVIDER_CHARS: usize = 200;
const MAX_NOTES_CHARS: usize = 16_000;
const SYSTEM_KEYS: [&str; 11] = [
    "lungs",
    "metabolic",
    "musculoskeletal",
    "blood",
    "liver",
    "inflammation",
    "kidneys",
    "heart",
    "hormone",
    "immune",
    "brain",
];

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BiologicalAgeSystemScoreInput {
    system_key: String,
    age: f64,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BiologicalAgeReportInput {
    report_name: String,
    provider: String,
    collected_at: String,
    chronological_age: f64,
    overall_age: f64,
    percentile: Option<f64>,
    notes: String,
    system_scores: Vec<BiologicalAgeSystemScoreInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBiologicalAgeReportInput {
    id: i64,
    #[serde(flatten)]
    report: BiologicalAgeReportInput,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BiologicalAgeSystemScore {
    system_key: String,
    age: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BiologicalAgeReport {
    id: i64,
    report_name: String,
    provider: String,
    collected_at: String,
    chronological_age: f64,
    overall_age: f64,
    percentile: Option<f64>,
    notes: String,
    system_scores: Vec<BiologicalAgeSystemScore>,
    created_at: String,
    updated_at: String,
}

#[tauri::command]
pub fn add_biological_age_report(
    input: BiologicalAgeReportInput,
    state: tauri::State<'_, AppState>,
) -> Result<BiologicalAgeReport, String> {
    database::with_connection(&state, |conn| insert_report(conn, &input))
}

#[tauri::command]
pub fn update_biological_age_report(
    input: UpdateBiologicalAgeReportInput,
    state: tauri::State<'_, AppState>,
) -> Result<BiologicalAgeReport, String> {
    if input.id <= 0 {
        return Err("id is required".into());
    }
    database::with_connection(&state, |conn| update_report(conn, input.id, &input.report))
}

#[tauri::command]
pub fn delete_biological_age_report(
    id: i64,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    database::with_connection(&state, |conn| delete_report(conn, id))
}

pub fn list_biological_age_reports(conn: &Connection) -> rusqlite::Result<Vec<BiologicalAgeReport>> {
    let mut statement = conn.prepare(
        "SELECT id, report_name, provider, collected_at, chronological_age, overall_age,
                percentile, notes, created_at, updated_at
         FROM biological_age_reports
         WHERE deleted_at = ''
         ORDER BY collected_at DESC, id DESC",
    )?;
    let mut reports = statement
        .query_map([], map_report_without_scores)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);
    for report in &mut reports {
        report.system_scores = list_scores(conn, report.id)?;
    }
    Ok(reports)
}

fn insert_report(conn: &Connection, input: &BiologicalAgeReportInput) -> Result<BiologicalAgeReport, String> {
    validate_input(input)?;
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "INSERT INTO biological_age_reports (
               report_name, provider, collected_at, chronological_age, overall_age, percentile, notes
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                input.report_name.trim(),
                input.provider.trim(),
                input.collected_at.trim(),
                input.chronological_age,
                input.overall_age,
                input.percentile,
                input.notes.trim(),
            ],
        )
        .map_err(|error| error.to_string())?;
    let id = transaction.last_insert_rowid();
    insert_scores(&transaction, id, &input.system_scores)?;
    let saved = get_report(&transaction, id)?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(saved)
}

fn update_report(
    conn: &Connection,
    id: i64,
    input: &BiologicalAgeReportInput,
) -> Result<BiologicalAgeReport, String> {
    validate_input(input)?;
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    let changed = transaction
        .execute(
            "UPDATE biological_age_reports
             SET report_name = ?1,
                 provider = ?2,
                 collected_at = ?3,
                 chronological_age = ?4,
                 overall_age = ?5,
                 percentile = ?6,
                 notes = ?7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?8 AND deleted_at = ''",
            params![
                input.report_name.trim(),
                input.provider.trim(),
                input.collected_at.trim(),
                input.chronological_age,
                input.overall_age,
                input.percentile,
                input.notes.trim(),
                id,
            ],
        )
        .map_err(|error| error.to_string())?;
    if changed == 0 {
        return Err("Biological-age report not found".into());
    }
    transaction
        .execute("DELETE FROM biological_age_scores WHERE report_id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    insert_scores(&transaction, id, &input.system_scores)?;
    let saved = get_report(&transaction, id)?;
    transaction.commit().map_err(|error| error.to_string())?;
    Ok(saved)
}

fn delete_report(conn: &Connection, id: i64) -> Result<(), String> {
    soft_delete_row(conn, "biological_age_reports", id, "Biological-age report")
}

fn get_report(conn: &Connection, id: i64) -> Result<BiologicalAgeReport, String> {
    let mut report = conn
        .query_row(
            "SELECT id, report_name, provider, collected_at, chronological_age, overall_age,
                    percentile, notes, created_at, updated_at
             FROM biological_age_reports
             WHERE id = ?1 AND deleted_at = ''",
            params![id],
            map_report_without_scores,
        )
        .map_err(|error| error.to_string())?;
    report.system_scores = list_scores(conn, id).map_err(|error| error.to_string())?;
    Ok(report)
}

fn map_report_without_scores(row: &Row<'_>) -> rusqlite::Result<BiologicalAgeReport> {
    Ok(BiologicalAgeReport {
        id: row.get(0)?,
        report_name: row.get(1)?,
        provider: row.get(2)?,
        collected_at: row.get(3)?,
        chronological_age: row.get(4)?,
        overall_age: row.get(5)?,
        percentile: row.get(6)?,
        notes: row.get(7)?,
        system_scores: Vec::new(),
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn insert_scores(
    conn: &Connection,
    report_id: i64,
    scores: &[BiologicalAgeSystemScoreInput],
) -> Result<(), String> {
    for score in scores {
        conn.execute(
            "INSERT INTO biological_age_scores (report_id, system_key, age) VALUES (?1, ?2, ?3)",
            params![report_id, score.system_key.trim(), score.age],
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn list_scores(conn: &Connection, report_id: i64) -> rusqlite::Result<Vec<BiologicalAgeSystemScore>> {
    let mut statement = conn.prepare(
        "SELECT system_key, age FROM biological_age_scores WHERE report_id = ?1",
    )?;
    let mut scores = statement
        .query_map(params![report_id], |row| {
            Ok(BiologicalAgeSystemScore {
                system_key: row.get(0)?,
                age: row.get(1)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    scores.sort_by_key(|score| system_order(&score.system_key));
    Ok(scores)
}

fn validate_input(input: &BiologicalAgeReportInput) -> Result<(), String> {
    validate_required("reportName", &input.report_name)?;
    validate_required("collectedAt", &input.collected_at)?;
    validate_iso_date("collectedAt", &input.collected_at)?;
    validate_text_length("reportName", &input.report_name, MAX_REPORT_NAME_CHARS)?;
    validate_text_length("provider", &input.provider, MAX_PROVIDER_CHARS)?;
    validate_text_length("notes", &input.notes, MAX_NOTES_CHARS)?;
    validate_age("chronologicalAge", input.chronological_age)?;
    validate_age("overallAge", input.overall_age)?;
    if let Some(percentile) = input.percentile {
        if !percentile.is_finite() || !(0.0..=100.0).contains(&percentile) {
            return Err("percentile must be between 0 and 100".into());
        }
    }
    if input.system_scores.is_empty() {
        return Err("At least one system score is required".into());
    }
    let mut seen = HashSet::new();
    for score in &input.system_scores {
        let key = score.system_key.trim();
        if !SYSTEM_KEYS.contains(&key) {
            return Err(format!("systemKey is not valid: {key}"));
        }
        if !seen.insert(key) {
            return Err(format!("systemKey must be unique: {key}"));
        }
        validate_age("system age", score.age)?;
    }
    Ok(())
}

fn validate_age(name: &str, value: f64) -> Result<(), String> {
    if value.is_finite() && (0.0..=150.0).contains(&value) {
        Ok(())
    } else {
        Err(format!("{name} must be between 0 and 150"))
    }
}

fn validate_text_length(name: &str, value: &str, max: usize) -> Result<(), String> {
    if value.chars().count() <= max {
        Ok(())
    } else {
        Err(format!("{name} must be {max} characters or fewer"))
    }
}

fn system_order(key: &str) -> usize {
    SYSTEM_KEYS
        .iter()
        .position(|candidate| *candidate == key)
        .unwrap_or(SYSTEM_KEYS.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saves_updates_lists_and_deletes_reports() {
        let conn = test_connection();
        let input = sample_input();
        let saved = insert_report(&conn, &input).unwrap();
        assert_eq!(saved.system_scores.len(), 2);
        assert_eq!(list_biological_age_reports(&conn).unwrap().len(), 1);

        let mut updated = sample_input();
        updated.overall_age = 36.5;
        updated.system_scores = vec![score("brain", 35.0)];
        let saved = update_report(&conn, saved.id, &updated).unwrap();
        assert_eq!(saved.overall_age, 36.5);
        assert_eq!(saved.system_scores.len(), 1);

        delete_report(&conn, saved.id).unwrap();
        assert!(list_biological_age_reports(&conn).unwrap().is_empty());
    }

    #[test]
    fn rejects_invalid_or_duplicate_system_scores() {
        let mut input = sample_input();
        input.system_scores = vec![score("heart", 38.0), score("heart", 39.0)];
        assert!(validate_input(&input).unwrap_err().contains("unique"));

        input.system_scores = vec![score("unknown", 38.0)];
        assert!(validate_input(&input).unwrap_err().contains("not valid"));
    }

    #[test]
    fn rejects_out_of_range_values() {
        let mut input = sample_input();
        input.overall_age = 151.0;
        assert!(validate_input(&input).unwrap_err().contains("overallAge"));

        input = sample_input();
        input.percentile = Some(100.1);
        assert!(validate_input(&input).unwrap_err().contains("percentile"));
    }

    fn sample_input() -> BiologicalAgeReportInput {
        BiologicalAgeReportInput {
            report_name: "Synthetic epigenetic report".into(),
            provider: "Example lab".into(),
            collected_at: "2026-07-10".into(),
            chronological_age: 34.0,
            overall_age: 38.0,
            percentile: Some(82.0),
            notes: "Synthetic test data".into(),
            system_scores: vec![score("lungs", 36.0), score("brain", 38.0)],
        }
    }

    fn score(system_key: &str, age: f64) -> BiologicalAgeSystemScoreInput {
        BiologicalAgeSystemScoreInput {
            system_key: system_key.into(),
            age,
        }
    }

    fn test_connection() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE biological_age_reports (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               report_name TEXT NOT NULL,
               provider TEXT NOT NULL DEFAULT '',
               collected_at TEXT NOT NULL,
               chronological_age REAL NOT NULL,
               overall_age REAL NOT NULL,
               percentile REAL,
               notes TEXT NOT NULL DEFAULT '',
               created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
               updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
               deleted_at TEXT NOT NULL DEFAULT ''
             );
             CREATE TABLE biological_age_scores (
               report_id INTEGER NOT NULL REFERENCES biological_age_reports(id) ON DELETE CASCADE,
               system_key TEXT NOT NULL,
               age REAL NOT NULL,
               PRIMARY KEY (report_id, system_key)
             );",
        )
        .unwrap();
        conn
    }
}
