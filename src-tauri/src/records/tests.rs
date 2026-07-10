use super::reports::{
    delete_lab_report_in_conn, insert_lab_report, list_lab_reports_for_conn, LabReportInput,
};
use super::symptoms::insert_symptom;
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

#[test]
fn update_lab_recalculates_derived_fields() {
    let conn = test_connection();
    let id = insert_lab_result(
        &conn,
        None,
        "heart",
        "LDL",
        "120",
        "mg/dL",
        "monitor",
        "2026-07-01",
        "",
        "<100",
    )
    .unwrap();

    let updated = update_lab_result_in_conn(
        &conn,
        &UpdateLabResultInput {
            id,
            organ_key: "blood".into(),
            marker: "LDL".into(),
            value: "80".into(),
            unit: "mg/dL".into(),
            status: "normal".into(),
            measured_at: "2026-07-02".into(),
            notes: "corrected".into(),
            reference_range: "50-100".into(),
        },
    )
    .unwrap();

    assert_eq!(updated.organ_key, "blood");
    assert_eq!(updated.value_number, Some(80.0));
    assert_eq!(updated.reference_low, Some(50.0));
    assert_eq!(updated.reference_high, Some(100.0));
    assert_eq!(updated.flag, "normal");
}

#[test]
fn update_lab_rejects_invalid_organ() {
    let conn = test_connection();
    let id = insert_lab_result(
        &conn,
        None,
        "heart",
        "LDL",
        "120",
        "mg/dL",
        "monitor",
        "2026-07-01",
        "",
        "",
    )
    .unwrap();

    let result = update_lab_result_in_conn(
        &conn,
        &UpdateLabResultInput {
            id,
            organ_key: "missing".into(),
            marker: "LDL".into(),
            value: "80".into(),
            unit: "mg/dL".into(),
            status: "normal".into(),
            measured_at: "2026-07-02".into(),
            notes: "".into(),
            reference_range: "".into(),
        },
    );

    assert!(result.is_err());
}

#[test]
fn soft_deletes_lab_results_and_symptoms_from_lists() {
    let conn = test_connection();
    let lab_id = insert_lab_result(
        &conn,
        None,
        "heart",
        "LDL",
        "120",
        "mg/dL",
        "monitor",
        "2026-07-01",
        "",
        "",
    )
    .unwrap();
    let symptom_id =
        insert_symptom(&conn, "heart", "Chest tightness", 3, "2026-07-01", "").unwrap();

    soft_delete_row(&conn, "lab_results", lab_id, "Lab result").unwrap();
    soft_delete_row(&conn, "symptoms", symptom_id, "Symptom").unwrap();

    assert!(list_latest_lab_results(&conn).unwrap().is_empty());
    assert!(list_recent_symptoms(&conn).unwrap().is_empty());
}

#[test]
fn delete_report_can_unlink_or_delete_linked_results() {
    let conn = test_connection();
    let report_id = insert_lab_report(
        &conn,
        Some(&LabReportInput {
            source_name: "report.pdf".into(),
            file_type: "PDF".into(),
            size_label: "1 KB".into(),
            local_copy_path: None,
        }),
    )
    .unwrap()
    .unwrap();
    insert_lab_result(
        &conn,
        Some(report_id),
        "heart",
        "LDL",
        "120",
        "mg/dL",
        "monitor",
        "2026-07-01",
        "",
        "",
    )
    .unwrap();

    delete_lab_report_in_conn(&conn, report_id, false).unwrap();
    assert_eq!(list_latest_lab_results(&conn).unwrap().len(), 1);
    assert!(list_lab_reports_for_conn(&conn).unwrap().is_empty());

    let second_report = insert_lab_report(
        &conn,
        Some(&LabReportInput {
            source_name: "report-2.pdf".into(),
            file_type: "PDF".into(),
            size_label: "1 KB".into(),
            local_copy_path: None,
        }),
    )
    .unwrap()
    .unwrap();
    insert_lab_result(
        &conn,
        Some(second_report),
        "heart",
        "HDL",
        "50",
        "mg/dL",
        "normal",
        "2026-07-01",
        "",
        "",
    )
    .unwrap();

    delete_lab_report_in_conn(&conn, second_report, true).unwrap();
    assert_eq!(list_latest_lab_results(&conn).unwrap().len(), 1);
}

#[test]
fn document_bytes_are_saved_inside_the_report_transaction() {
    let conn = test_connection();
    let report = LabReportInput {
        source_name: "report.pdf".into(),
        file_type: "PDF".into(),
        size_label: "1 KB".into(),
        local_copy_path: None,
    };
    let result = LabResultSeed {
        organ_key: "heart".into(),
        marker: "LDL".into(),
        value: "120".into(),
        unit: "mg/dL".into(),
        status: "monitor".into(),
        measured_at: "2026-07-01".into(),
        notes: "".into(),
        reference_range: "50-100".into(),
    };

    save_lab_results(&conn, &[result], Some(&report), Some(b"%PDF-1.7\n")).unwrap();

    let stored: Vec<u8> = conn
        .query_row(
            "SELECT document_bytes FROM lab_reports LIMIT 1",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(stored, b"%PDF-1.7\n");
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
         CREATE TABLE lab_reports (
           id INTEGER PRIMARY KEY,
           source_name TEXT NOT NULL DEFAULT '',
           file_type TEXT NOT NULL DEFAULT '',
           size_label TEXT NOT NULL DEFAULT '',
           local_copy_path TEXT NOT NULL DEFAULT '',
           document_bytes BLOB NOT NULL DEFAULT X'',
           created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           deleted_at TEXT NOT NULL DEFAULT ''
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
           reference_high REAL,
           created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           deleted_at TEXT NOT NULL DEFAULT ''
         );
         CREATE TABLE symptoms (
           id INTEGER PRIMARY KEY,
           organ_key TEXT NOT NULL,
           name TEXT NOT NULL,
           severity INTEGER NOT NULL,
           observed_at TEXT NOT NULL,
           notes TEXT NOT NULL DEFAULT '',
           created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           deleted_at TEXT NOT NULL DEFAULT ''
         );
         INSERT INTO organs (key, name, system) VALUES ('heart', 'Heart', 'Cardiovascular');
         INSERT INTO organs (key, name, system) VALUES ('blood', 'Blood', 'Circulatory');",
    )
    .unwrap();
    conn
}
