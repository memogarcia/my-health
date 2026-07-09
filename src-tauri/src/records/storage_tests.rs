use super::*;

#[test]
fn stores_report_local_copy_path() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch(
        "CREATE TABLE lab_reports (
           id INTEGER PRIMARY KEY,
           source_name TEXT NOT NULL DEFAULT '',
           file_type TEXT NOT NULL DEFAULT '',
           size_label TEXT NOT NULL DEFAULT '',
           local_copy_path TEXT NOT NULL DEFAULT ''
         );",
    )
    .unwrap();
    let report = LabReportInput {
        source_name: "ldl.png".into(),
        file_type: "PNG".into(),
        size_label: "20 KB".into(),
        local_copy_path: Some("/tmp/result-documents/ldl.png".into()),
    };

    let report_id = insert_lab_report(&conn, Some(&report)).unwrap().unwrap();

    let copy_path: String = conn
        .query_row("SELECT local_copy_path FROM lab_reports WHERE id = ?1", [report_id], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(copy_path, "/tmp/result-documents/ldl.png");
}
