use super::llm_http::AiRuntimeSettings;
use crate::database::{self, AppState};
use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;
use std::net::IpAddr;

pub(super) fn load_ai_runtime_settings(
    state: &AppState,
    requested_model: Option<&str>,
    expected_db_path: Option<&str>,
) -> Result<AiRuntimeSettings, String> {
    if let Some(db_path) = expected_db_path {
        return database::with_connection_at_path(state, db_path, |conn| {
            read_ai_runtime_settings(conn, requested_model)
        });
    }
    database::with_connection(state, |conn| {
        read_ai_runtime_settings(conn, requested_model)
    })
}

fn read_ai_runtime_settings(
    conn: &Connection,
    requested_model: Option<&str>,
) -> Result<AiRuntimeSettings, String> {
    let raw = conn
        .query_row("SELECT settings FROM ai_settings WHERE id = 1", [], |row| {
            row.get::<_, String>(0)
        })
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "LLM is not configured.".to_string())?;
    let value: Value =
        serde_json::from_str(&raw).map_err(|_| "Stored AI settings are invalid.".to_string())?;
    let provider_id = value
        .get("providerId")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_string();
    if !matches!(
        provider_id.as_str(),
        "codex" | "anthropic" | "openai" | "gemini" | "lmstudio" | "ollama" | "custom"
    ) {
        return Err("Choose an LLM provider before sending.".into());
    }
    let model_id = value
        .get("modelId")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_string();
    if model_id.is_empty() {
        return Err("Choose an LLM model before sending.".into());
    }
    if requested_model
        .map(str::trim)
        .filter(|model| !model.is_empty())
        != Some(model_id.as_str())
    {
        return Err("The requested model does not match the saved AI settings.".into());
    }
    let base_url = value
        .get("baseUrl")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_string();
    let allow_remote_health_context = value
        .get("allowRemoteHealthContext")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let stays_on_device = matches!(provider_id.as_str(), "lmstudio" | "ollama" | "custom")
        && is_loopback_base_url(&base_url);
    if !stays_on_device && !allow_remote_health_context {
        return Err("Remote health context is disabled in AI settings.".into());
    }
    let api_key_env_var = value
        .get("apiKeyEnvVar")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
        .to_string();
    let api_token = if provider_id == "lmstudio" {
        value
            .get("apiToken")
            .and_then(Value::as_str)
            .unwrap_or("")
            .trim()
            .to_string()
    } else {
        String::new()
    };
    if matches!(provider_id.as_str(), "lmstudio" | "ollama" | "custom") && base_url.is_empty() {
        return Err("An OpenAI-compatible base URL is required for this LLM.".into());
    }
    if matches!(provider_id.as_str(), "anthropic" | "openai" | "gemini")
        && api_key_env_var.is_empty()
    {
        return Err("This LLM requires an API key environment variable in Settings.".into());
    }
    Ok(AiRuntimeSettings {
        provider_id,
        model_id,
        base_url,
        api_key_env_var,
        api_token,
    })
}

pub(super) fn is_loopback_base_url(value: &str) -> bool {
    let Ok(url) = reqwest::Url::parse(value.trim()) else {
        return false;
    };
    if !matches!(url.scheme(), "http" | "https") {
        return false;
    }
    if !url.username().is_empty() || url.password().is_some() {
        return false;
    }
    let Some(host) = url.host_str() else {
        return false;
    };
    let host = host.trim_start_matches('[').trim_end_matches(']');
    host.eq_ignore_ascii_case("localhost")
        || host
            .parse::<IpAddr>()
            .map(|address| address.is_loopback())
            .unwrap_or(false)
}
