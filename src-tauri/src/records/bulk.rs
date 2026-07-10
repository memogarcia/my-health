use rusqlite::{params, Connection};
use serde::Deserialize;

use super::{
    ensure_organ,
    parse::{validate_iso_date, validate_status},
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUpdateLabResultsInput {
    pub ids: Vec<i64>,
    pub organ_key: Option<String>,
    pub status: Option<String>,
    pub measured_at: Option<String>,
}

pub fn validate(input: &BulkUpdateLabResultsInput) -> Result<(), String> {
    if input.ids.is_empty() || input.ids.iter().any(|id| *id <= 0) {
        return Err("At least one lab result is required".into());
    }
    if input
        .organ_key
        .as_deref()
        .is_none_or(|value| value.trim().is_empty())
        && input
            .status
            .as_deref()
            .is_none_or(|value| value.trim().is_empty())
        && input
            .measured_at
            .as_deref()
            .is_none_or(|value| value.trim().is_empty())
    {
        return Err("Choose at least one field to update".into());
    }
    if let Some(status) = &input.status {
        validate_status(status)?;
    }
    if let Some(measured_at) = &input.measured_at {
        validate_iso_date("measuredAt", measured_at)?;
    }
    Ok(())
}

pub fn update_in_conn(conn: &Connection, input: &BulkUpdateLabResultsInput) -> Result<(), String> {
    if let Some(organ_key) = &input.organ_key {
        ensure_organ(conn, organ_key)?;
    }
    let transaction = conn
        .unchecked_transaction()
        .map_err(|error| error.to_string())?;
    for id in &input.ids {
        let changed = transaction.execute("UPDATE lab_results SET organ_key = COALESCE(?1, organ_key), status = COALESCE(?2, status), measured_at = COALESCE(?3, measured_at), updated_at = CURRENT_TIMESTAMP WHERE id = ?4 AND deleted_at = ''", params![input.organ_key.as_deref(), input.status.as_deref(), input.measured_at.as_deref(), id]).map_err(|error| error.to_string())?;
        if changed == 0 {
            return Err("Lab result not found".into());
        }
    }
    transaction.commit().map_err(|error| error.to_string())
}
