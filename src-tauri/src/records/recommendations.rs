use rusqlite::Connection;
use serde::Serialize;

#[derive(Serialize)]
pub struct Recommendation {
    pub title: String,
    pub body: String,
    pub priority: String,
}

pub fn build_recommendations(conn: &Connection) -> rusqlite::Result<Vec<Recommendation>> {
    let lab_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM lab_results WHERE deleted_at = ''",
        [],
        |row| row.get(0),
    )?;
    let attention_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM lab_results WHERE status = 'attention' AND deleted_at = ''",
        [],
        |row| row.get(0),
    )?;
    let symptom_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM symptoms WHERE deleted_at = ''",
        [],
        |row| row.get(0),
    )?;

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
        body: "Store sensitive health details in this local database and use encrypted exports for backups."
            .into(),
        priority: "normal".into(),
    });
    Ok(items)
}
