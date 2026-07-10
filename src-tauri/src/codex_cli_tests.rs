use super::llm_http::{
    chat_completions_endpoint, extract_anthropic_text, extract_gemini_text, extract_openai_text,
};
use super::process::run_command_with_timeout;
use super::{
    codex_exec_command, ensure_remote_ai_allowed, load_ai_runtime_settings, normalize_prompt,
    parse_codex_models, truncate, CodexRunOptions, MAX_OUTPUT_CHARS, MAX_PROMPT_CHARS,
};
use crate::database::{self, AppState};
use std::{path::Path, process::Command, time::Duration};

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
    let mut options = CodexRunOptions::from_parts(Some("gpt-5.5".into()), Some("xhigh".into()));
    options.image_paths = vec![
        Path::new("/tmp/work/page-1.png").to_path_buf(),
        Path::new("/tmp/work/page-2.png").to_path_buf(),
    ];
    options.output_schema_path = Some(Path::new("/tmp/work/schema.json").to_path_buf());
    let command = codex_exec_command(Path::new("/tmp/work"), &options);
    let args = command
        .get_args()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect::<Vec<_>>();

    assert!(args
        .windows(2)
        .any(|pair| pair[0] == "--model" && pair[1] == "gpt-5.5"));
    assert!(args.contains(&"model_reasoning_effort=\"xhigh\"".to_string()));
    assert!(args
        .windows(2)
        .any(|pair| pair[0] == "--image" && pair[1] == "/tmp/work/page-1.png"));
    assert!(args
        .windows(2)
        .any(|pair| pair[0] == "--image" && pair[1] == "/tmp/work/page-2.png"));
    assert!(args
        .windows(2)
        .any(|pair| pair[0] == "--output-schema" && pair[1] == "/tmp/work/schema.json"));
    assert_eq!(args.last().map(String::as_str), Some("-"));
}

#[test]
fn run_command_with_timeout_succeeds_for_short_command() {
    let mut command = Command::new("sh");
    command.arg("-c").arg("printf ok");
    let output = run_command_with_timeout(command, Duration::from_secs(2), None).unwrap();
    assert!(output.status.success());
    assert_eq!(String::from_utf8_lossy(&output.stdout), "ok");
}

#[test]
fn run_command_with_timeout_fails_for_long_command() {
    let mut command = Command::new("sh");
    command.arg("-c").arg("echo still-working >&2; sleep 2");
    let error = run_command_with_timeout(command, Duration::from_millis(100), None).unwrap_err();
    assert!(error.contains("Timed out"));
    assert!(error.contains("still-working"));
}

#[test]
fn run_command_with_timeout_writes_stdin_and_drains_large_output() {
    let mut command = Command::new("sh");
    command.arg("-c").arg("cat; yes x | head -c 300000");
    let output = run_command_with_timeout(command, Duration::from_secs(2), Some(b"ok\n")).unwrap();
    assert!(output.status.success());
    assert!(output.stdout.starts_with(b"ok\n"));
    assert!(output.stdout.len() > 250_000);
}

#[test]
fn remote_ai_requires_saved_consent_and_matching_model() {
    let path = std::env::temp_dir().join(format!(
        "me-codex-consent-{}-{}.sqlite3",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let state = AppState::new(path.clone());
    database::unlock_database(&state, "correct horse battery staple").unwrap();
    database::with_connection(&state, |conn| {
        conn.execute(
            "INSERT INTO ai_settings (id, settings) VALUES (1, ?1)",
            [r#"{"providerId":"codex","modelId":"gpt-test","allowRemoteHealthContext":true}"#],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    })
    .unwrap();

    assert!(ensure_remote_ai_allowed(&state, Some("gpt-test")).is_ok());
    assert!(ensure_remote_ai_allowed(&state, Some("other-model")).is_err());
    drop(state);
    let _ = std::fs::remove_file(path);
}

#[test]
fn local_openai_compatible_chat_does_not_require_remote_consent() {
    let path = std::env::temp_dir().join(format!(
        "me-local-llm-{}-{}.sqlite3",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let state = AppState::new(path.clone());
    database::unlock_database(&state, "correct horse battery staple").unwrap();
    database::with_connection(&state, |conn| {
        conn.execute(
            "INSERT INTO ai_settings (id, settings) VALUES (1, ?1)",
            [r#"{"providerId":"ollama","modelId":"llama3.2","baseUrl":"http://localhost:11434/v1","allowRemoteHealthContext":false}"#],
        )
        .map_err(|error| error.to_string())?;
        Ok(())
    })
    .unwrap();

    let settings = load_ai_runtime_settings(&state, Some("llama3.2")).unwrap();
    assert_eq!(settings.provider_id, "ollama");
    assert_eq!(settings.base_url, "http://localhost:11434/v1");
    drop(state);
    let _ = std::fs::remove_file(path);
}

#[test]
fn provider_response_extractors_read_supported_shapes() {
    assert_eq!(
        extract_openai_text(&serde_json::json!({"choices":[{"message":{"content":"hello"}}]}))
            .unwrap(),
        "hello"
    );
    assert_eq!(
        extract_anthropic_text(&serde_json::json!({"content":[{"type":"text","text":"hello"}]}))
            .unwrap(),
        "hello"
    );
    assert_eq!(
        extract_gemini_text(
            &serde_json::json!({"candidates":[{"content":{"parts":[{"text":"hello"}]}}]})
        )
        .unwrap(),
        "hello"
    );
}

#[test]
fn openai_compatible_endpoint_appends_chat_path_once() {
    assert_eq!(
        chat_completions_endpoint("http://localhost:1234/v1").unwrap(),
        "http://localhost:1234/v1/chat/completions"
    );
    assert_eq!(
        chat_completions_endpoint("http://localhost:1234/v1/chat/completions").unwrap(),
        "http://localhost:1234/v1/chat/completions"
    );
}
