use crate::database::{self, AppState};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
};
#[path = "ai_runtime.rs"]
mod ai_runtime;
pub(crate) mod document_analysis;
#[path = "llm_http.rs"]
mod llm_http;
#[path = "llm_mode.rs"]
mod llm_mode;
mod process;
#[cfg(test)]
use ai_runtime::is_loopback_base_url;
use ai_runtime::load_ai_runtime_settings;
use llm_http::{run_http_provider, AiRuntimeSettings};
#[cfg(test)]
use llm_mode::MAX_RESEARCH_OUTPUT_CHARS;
use llm_mode::{LlmMode, LlmRequestOptions, MAX_OUTPUT_CHARS};
use process::{codex_bin, run_command_with_timeout, CodexWorkspace};
const MAX_PROMPT_CHARS: usize = 240_000;
const CODEX_TIMEOUT: Duration = Duration::from_secs(300);
const CODEX_MODEL_CATALOG_TIMEOUT: Duration = Duration::from_secs(20);
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AskLlmInput {
    prompt: String,
    model_id: Option<String>,
    reasoning_effort: Option<String>,
    db_path: String,
    #[serde(default)]
    mode: LlmMode,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexOptions {
    models: Vec<CodexModelOption>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexModelOption {
    id: String,
    label: String,
    default_reasoning_effort: String,
    reasoning_efforts: Vec<CodexReasoningEffortOption>,
}
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CodexReasoningEffortOption {
    id: String,
    label: String,
    description: String,
}
#[derive(Default)]
struct CodexRunOptions {
    model_id: Option<String>,
    reasoning_effort: Option<String>,
    image_paths: Vec<PathBuf>,
    output_schema_path: Option<PathBuf>,
    output_limit: usize,
    mode: LlmMode,
}
impl CodexRunOptions {
    fn from_parts(model_id: Option<String>, reasoning_effort: Option<String>) -> Self {
        Self {
            model_id: clean_model_id(model_id),
            reasoning_effort: clean_reasoning_effort(reasoning_effort),
            image_paths: Vec::new(),
            output_schema_path: None,
            output_limit: MAX_OUTPUT_CHARS,
            mode: LlmMode::Chat,
        }
    }
}
#[tauri::command]
pub async fn ask_llm(
    input: AskLlmInput,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let settings = load_ai_runtime_settings(
        &state,
        input.model_id.as_deref(),
        Some(input.db_path.as_str()),
    )?;
    let mode = input.mode;
    tauri::async_runtime::spawn_blocking(move || {
        run_llm(input.prompt, &app, settings, input.reasoning_effort, mode)
    })
    .await
    .map_err(|error| error.to_string())?
}
fn run_llm(
    prompt: String,
    app: &tauri::AppHandle,
    settings: AiRuntimeSettings,
    reasoning_effort: Option<String>,
    mode: LlmMode,
) -> Result<String, String> {
    let request_options = mode.request_options();
    if settings.provider_id == "codex" {
        let mut options = CodexRunOptions::from_parts(Some(settings.model_id), reasoning_effort);
        options.output_limit = request_options.output_limit;
        options.mode = mode;
        return run_codex(prompt, app, options);
    }
    let prompt = normalize_prompt(&prompt, mode)?;
    run_http_provider(&settings, &prompt, request_options)
}

#[tauri::command]
pub async fn get_codex_options() -> Result<CodexOptions, String> {
    tauri::async_runtime::spawn_blocking(load_codex_options)
        .await
        .map_err(|error| error.to_string())?
}
fn run_codex(
    prompt: String,
    app: &tauri::AppHandle,
    options: CodexRunOptions,
) -> Result<String, String> {
    let workspace = CodexWorkspace::create(app)?;
    run_codex_in_workspace(prompt, workspace.path(), options)
}
fn run_codex_in_workspace(
    prompt: String,
    workspace: &Path,
    options: CodexRunOptions,
) -> Result<String, String> {
    let prompt = normalize_prompt(&prompt, options.mode)?;
    let output = run_command_with_timeout(
        codex_exec_command(workspace, &options),
        CODEX_TIMEOUT,
        Some(prompt.as_bytes()),
    )
    .map_err(|error| format!("Could not run Codex CLI: {error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    if output.status.success() {
        return Ok(truncate(stdout.trim(), options.output_limit));
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(truncate(
        format!("Codex CLI failed. {}", stderr.trim()).trim(),
        options.output_limit,
    ))
}
fn codex_exec_command(workspace: &Path, options: &CodexRunOptions) -> Command {
    let mut command = Command::new(codex_bin());
    command
        .arg("exec")
        .arg("--ephemeral")
        .arg("--sandbox")
        .arg("read-only")
        .arg("--ignore-user-config")
        .arg("--skip-git-repo-check")
        .arg("--cd")
        .arg(workspace);
    if let Some(model_id) = &options.model_id {
        command.arg("--model").arg(model_id);
    }
    if let Some(reasoning_effort) = &options.reasoning_effort {
        command
            .arg("-c")
            .arg(format!("model_reasoning_effort=\"{reasoning_effort}\""));
    }
    for image_path in &options.image_paths {
        command.arg("--image").arg(image_path);
    }
    if let Some(schema_path) = &options.output_schema_path {
        command.arg("--output-schema").arg(schema_path);
    }
    command.arg("-").env("NO_COLOR", "1");
    command
}
fn load_codex_options() -> Result<CodexOptions, String> {
    run_codex_models(false).or_else(|_| run_codex_models(true))
}
fn run_codex_models(bundled: bool) -> Result<CodexOptions, String> {
    let mut command = Command::new(codex_bin());
    command.arg("debug").arg("models");
    if bundled {
        command.arg("--bundled");
    }
    command.env("NO_COLOR", "1");
    let output = run_command_with_timeout(command, CODEX_MODEL_CATALOG_TIMEOUT, None)
        .map_err(|error| format!("Could not read Codex model catalog: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(truncate(
            format!("Codex model catalog failed. {}", stderr.trim()).trim(),
            MAX_OUTPUT_CHARS,
        ));
    }
    parse_codex_models(&String::from_utf8_lossy(&output.stdout))
}
#[derive(Deserialize)]
struct CodexCatalog {
    models: Vec<CodexCatalogModel>,
}
#[derive(Deserialize)]
struct CodexCatalogModel {
    slug: String,
    display_name: Option<String>,
    default_reasoning_level: Option<String>,
    supported_reasoning_levels: Option<Vec<CodexCatalogReasoningLevel>>,
    visibility: Option<String>,
}
#[derive(Deserialize)]
struct CodexCatalogReasoningLevel {
    effort: String,
    description: Option<String>,
}
fn parse_codex_models(raw: &str) -> Result<CodexOptions, String> {
    let catalog = serde_json::from_str::<CodexCatalog>(raw)
        .map_err(|error| format!("Codex model catalog is not valid JSON: {error}"))?;
    let models = catalog
        .models
        .into_iter()
        .filter(|model| !model.slug.trim().is_empty())
        .filter(|model| model.visibility.as_deref().unwrap_or("list") == "list")
        .map(|model| {
            let reasoning_efforts = model
                .supported_reasoning_levels
                .unwrap_or_default()
                .into_iter()
                .filter_map(|level| {
                    let effort = clean_reasoning_effort(Some(level.effort))?;
                    Some(CodexReasoningEffortOption {
                        label: reasoning_effort_label(&effort),
                        description: level
                            .description
                            .filter(|description| !description.trim().is_empty())
                            .unwrap_or_else(|| reasoning_effort_description(&effort)),
                        id: effort,
                    })
                })
                .collect::<Vec<_>>();
            let default_reasoning_effort = clean_reasoning_effort(model.default_reasoning_level)
                .or_else(|| reasoning_efforts.first().map(|effort| effort.id.clone()))
                .unwrap_or_else(|| "medium".to_string());
            CodexModelOption {
                id: model.slug.clone(),
                label: model
                    .display_name
                    .filter(|name| !name.trim().is_empty())
                    .unwrap_or(model.slug),
                default_reasoning_effort,
                reasoning_efforts: if reasoning_efforts.is_empty() {
                    fallback_reasoning_efforts()
                } else {
                    reasoning_efforts
                },
            }
        })
        .collect::<Vec<_>>();
    if models.is_empty() {
        return Err("Codex model catalog did not include selectable models.".into());
    }
    Ok(CodexOptions { models })
}
fn fallback_reasoning_efforts() -> Vec<CodexReasoningEffortOption> {
    ["low", "medium", "high", "xhigh"]
        .into_iter()
        .map(|effort| CodexReasoningEffortOption {
            id: effort.to_string(),
            label: reasoning_effort_label(effort),
            description: reasoning_effort_description(effort),
        })
        .collect()
}
fn reasoning_effort_label(effort: &str) -> String {
    match effort {
        "minimal" => "Minimal",
        "low" => "Low",
        "medium" => "Medium",
        "high" => "High",
        "xhigh" => "Extra high",
        _ => effort,
    }
    .to_string()
}
fn reasoning_effort_description(effort: &str) -> String {
    match effort {
        "minimal" => "Shortest thinking time",
        "low" => "Fast responses with lighter reasoning",
        "medium" => "Balanced speed and reasoning depth",
        "high" => "Greater reasoning depth for complex problems",
        "xhigh" => "Extra high reasoning depth for complex problems",
        _ => "Model-specific reasoning effort",
    }
    .to_string()
}
fn clean_model_id(value: Option<String>) -> Option<String> {
    let value = value?.trim().to_string();
    if value.is_empty() || value == "codex-cli" {
        None
    } else {
        Some(value)
    }
}
fn clean_reasoning_effort(value: Option<String>) -> Option<String> {
    let value = value?.trim().to_ascii_lowercase();
    match value.as_str() {
        "minimal" | "low" | "medium" | "high" | "xhigh" => Some(value),
        _ => None,
    }
}
fn normalize_prompt(prompt: &str, mode: LlmMode) -> Result<String, String> {
    let prompt = prompt.trim();
    if prompt.is_empty() {
        return Err("Prompt is required".into());
    }
    if prompt.chars().count() > MAX_PROMPT_CHARS {
        return Err(format!(
            "Prompt must be {MAX_PROMPT_CHARS} characters or fewer"
        ));
    }
    let instruction = if mode == LlmMode::Research {
        "You are conducting a thorough analysis for a personal health dashboard. Produce a detailed, structured report grounded in the supplied dated records. Keep it advisory and non-diagnostic, distinguish evidence from hypotheses, and state uncertainty clearly."
    } else {
        "You are helping with a personal health dashboard. Keep the answer advisory, non-diagnostic, and concise."
    };
    Ok(format!("{instruction}\n\n{prompt}"))
}

fn ensure_remote_ai_allowed(state: &AppState, requested_model: Option<&str>) -> Result<(), String> {
    database::with_connection(state, |conn| {
        let settings = conn
            .query_row("SELECT settings FROM ai_settings WHERE id = 1", [], |row| {
                row.get::<_, String>(0)
            })
            .optional()
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "Remote AI is not configured.".to_string())?;
        let settings: serde_json::Value = serde_json::from_str(&settings)
            .map_err(|_| "Stored AI settings are invalid.".to_string())?;
        let provider = settings.get("providerId").and_then(|value| value.as_str());
        let allowed = settings
            .get("allowRemoteHealthContext")
            .and_then(|value| value.as_bool())
            .unwrap_or(false);
        let configured_model = settings
            .get("modelId")
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .trim();
        if provider != Some("codex") || !allowed || configured_model.is_empty() {
            return Err("Remote health context is disabled in AI settings.".into());
        }
        if requested_model
            .map(str::trim)
            .filter(|model| !model.is_empty())
            != Some(configured_model)
        {
            return Err("The requested model does not match the saved AI settings.".into());
        }
        Ok(())
    })
}

fn truncate(value: impl AsRef<str>, limit: usize) -> String {
    let value = value.as_ref();
    if value.chars().count() <= limit {
        return value.to_string();
    }
    let mut truncated = value.chars().take(limit).collect::<String>();
    truncated.push_str("...");
    truncated
}

#[cfg(test)]
#[path = "codex_cli_tests.rs"]
mod tests;
