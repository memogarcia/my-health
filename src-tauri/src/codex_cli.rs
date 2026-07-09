use crate::document_files::unique_document_file_name;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::Manager;

const MAX_PROMPT_CHARS: usize = 32_000;
const MAX_OUTPUT_CHARS: usize = 8_000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeDocumentInput {
    file_name: String,
    file_bytes: Vec<u8>,
    model_id: Option<String>,
    reasoning_effort: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AskLlmInput {
    prompt: String,
    model_id: Option<String>,
    reasoning_effort: Option<String>,
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
}

impl CodexRunOptions {
    fn from_parts(model_id: Option<String>, reasoning_effort: Option<String>) -> Self {
        Self {
            model_id: clean_model_id(model_id),
            reasoning_effort: clean_reasoning_effort(reasoning_effort),
        }
    }
}

/// Writes a dropped result file into the Codex workspace, asks Codex to extract
/// every measurement as JSON, then removes the file so health data is not left
/// in the cache. The raw Codex output is parsed by the renderer.
#[tauri::command]
pub async fn analyze_document(
    input: AnalyzeDocumentInput,
    app: tauri::AppHandle,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run_document_analysis(input, &app))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn ask_llm(input: AskLlmInput, app: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_codex(
            input.prompt,
            &app,
            CodexRunOptions::from_parts(input.model_id, input.reasoning_effort),
        )
    })
    .await
    .map_err(|error| error.to_string())?
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
    let prompt = normalize_prompt(&prompt)?;
    let workspace = codex_workspace(app)?;
    let output = codex_exec_command(&workspace, prompt, &options)
        .output()
        .map_err(|error| format!("Could not run Codex CLI: {error}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if output.status.success() {
        return Ok(truncate(stdout.trim(), MAX_OUTPUT_CHARS));
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(truncate(
        format!("Codex CLI failed. {}", stderr.trim()).trim(),
        MAX_OUTPUT_CHARS,
    ))
}

fn run_document_analysis(
    input: AnalyzeDocumentInput,
    app: &tauri::AppHandle,
) -> Result<String, String> {
    let AnalyzeDocumentInput {
        file_name,
        file_bytes,
        model_id,
        reasoning_effort,
    } = input;
    let workspace = codex_workspace(app)?;
    let safe_name = unique_document_file_name(&file_name);
    let file_path = workspace.join(&safe_name);
    fs::write(&file_path, &file_bytes)
        .map_err(|error| format!("Could not save uploaded file: {error}"))?;

    let prompt = format!(
        "Read the file `{safe_name}` in this workspace. It is a medical lab result or health report. \
Extract every discrete measurement as a JSON array. Each element must be an object with these string fields: \
organKey (one of: brain,thyroid,lungs,heart,liver,spleen,stomach,pancreas,kidneys,intestines,bladder,blood,bones,skin,reproductive), \
marker, value, unit, referenceRange, status (normal, monitor, or attention), measuredAt (YYYY-MM-DD), notes. \
Use 'blood' for general bloodwork when the organ is unclear. Set status to 'normal' when the value is inside the reference range, \
'monitor' when slightly off, and 'attention' when clearly abnormal. Use the report or collection date for measuredAt. \
Return ONLY the JSON array. No prose, no markdown fences."
    );

    let result = run_codex(
        prompt,
        app,
        CodexRunOptions::from_parts(model_id, reasoning_effort),
    );
    // Always remove the uploaded file so sensitive health data is not left on disk.
    let _ = fs::remove_file(&file_path);
    result
}

fn codex_exec_command(workspace: &Path, prompt: String, options: &CodexRunOptions) -> Command {
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
    command.arg(prompt).env("NO_COLOR", "1");
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
    let output = command
        .env("NO_COLOR", "1")
        .output()
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

fn normalize_prompt(prompt: &str) -> Result<String, String> {
    let prompt = prompt.trim();
    if prompt.is_empty() {
        return Err("Prompt is required".into());
    }
    if prompt.chars().count() > MAX_PROMPT_CHARS {
        return Err(format!(
            "Prompt must be {MAX_PROMPT_CHARS} characters or fewer"
        ));
    }
    Ok(format!(
        "You are helping with a personal health dashboard. Keep the answer advisory, non-diagnostic, and concise.\n\n{prompt}"
    ))
}

fn codex_workspace(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("codex-workspace");
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path)
}

fn codex_bin() -> PathBuf {
    if let Ok(path) = std::env::var("CODEX_CLI_PATH") {
        if !path.trim().is_empty() {
            return PathBuf::from(path);
        }
    }
    for path in ["/opt/homebrew/bin/codex", "/usr/local/bin/codex"] {
        if Path::new(path).exists() {
            return PathBuf::from(path);
        }
    }
    PathBuf::from("codex")
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
mod tests {
    use super::{
        codex_exec_command, normalize_prompt, parse_codex_models, truncate, CodexRunOptions,
        MAX_OUTPUT_CHARS, MAX_PROMPT_CHARS,
    };
    use std::path::Path;

    #[test]
    fn rejects_empty_prompt() {
        assert!(normalize_prompt("  ").is_err());
    }

    #[test]
    fn rejects_long_prompt() {
        assert!(normalize_prompt(&"x".repeat(MAX_PROMPT_CHARS + 1)).is_err());
    }

    #[test]
    fn accepts_deep_research_sized_prompt() {
        assert!(normalize_prompt(&"x".repeat(5_000)).is_ok());
    }

    #[test]
    fn truncates_output() {
        let output = truncate("x".repeat(MAX_OUTPUT_CHARS + 2), MAX_OUTPUT_CHARS);
        assert_eq!(output.chars().count(), MAX_OUTPUT_CHARS + 3);
    }

    #[test]
    fn parses_codex_model_catalog() {
        let options = parse_codex_models(
            r#"{"models":[{
                "slug":"gpt-5.5",
                "display_name":"GPT-5.5",
                "default_reasoning_level":"medium",
                "visibility":"list",
                "supported_reasoning_levels":[
                    {"effort":"low","description":"Fast"},
                    {"effort":"xhigh","description":"Deep"}
                ]
            }]}"#,
        )
        .unwrap();

        assert_eq!(options.models[0].id, "gpt-5.5");
        assert_eq!(options.models[0].default_reasoning_effort, "medium");
        assert_eq!(options.models[0].reasoning_efforts[1].id, "xhigh");
    }

    #[test]
    fn adds_selected_model_and_effort_to_codex_exec() {
        let options = CodexRunOptions::from_parts(Some("gpt-5.5".into()), Some("xhigh".into()));
        let command = codex_exec_command(Path::new("/tmp/work"), "hello".into(), &options);
        let args = command
            .get_args()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect::<Vec<_>>();

        assert!(args
            .windows(2)
            .any(|pair| pair[0] == "--model" && pair[1] == "gpt-5.5"));
        assert!(args.contains(&"model_reasoning_effort=\"xhigh\"".to_string()));
    }
}
