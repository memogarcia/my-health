use reqwest::{
    blocking::{Client, RequestBuilder},
    header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE},
};
use serde_json::{json, Value};
use std::env;

use super::{truncate, LlmRequestOptions, MAX_OUTPUT_CHARS};

const LLM_HTTP_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(300);

#[derive(Clone)]
pub(super) struct AiRuntimeSettings {
    pub(super) provider_id: String,
    pub(super) model_id: String,
    pub(super) base_url: String,
    pub(super) api_key_env_var: String,
    pub(super) api_token: String,
}

pub(super) fn run_http_provider(
    settings: &AiRuntimeSettings,
    prompt: &str,
    options: LlmRequestOptions,
) -> Result<String, String> {
    let client = Client::builder()
        .timeout(LLM_HTTP_TIMEOUT)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| format!("Could not create LLM client: {error}"))?;
    match settings.provider_id.as_str() {
        "anthropic" => run_anthropic(&client, settings, prompt, options),
        "gemini" => run_gemini(&client, settings, prompt, options),
        "openai" | "lmstudio" | "ollama" | "custom" => {
            run_openai_compatible(&client, settings, prompt, options)
        }
        provider => Err(format!("Unsupported LLM provider: {provider}")),
    }
}

fn run_anthropic(
    client: &Client,
    settings: &AiRuntimeSettings,
    prompt: &str,
    options: LlmRequestOptions,
) -> Result<String, String> {
    let api_key = required_api_key(settings)?;
    let mut headers = json_headers();
    headers.insert(
        "x-api-key",
        HeaderValue::from_str(&api_key)
            .map_err(|_| "Anthropic API key is not valid for an HTTP header.".to_string())?,
    );
    headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
    let body = json!({
        "model": &settings.model_id,
        "max_tokens": options.max_tokens,
        "messages": [{ "role": "user", "content": prompt }]
    });
    let response = send_json(
        client
            .post("https://api.anthropic.com/v1/messages")
            .headers(headers)
            .json(&body),
    )?;
    extract_anthropic_text_with_limit(&response, options.output_limit)
}

fn run_gemini(
    client: &Client,
    settings: &AiRuntimeSettings,
    prompt: &str,
    options: LlmRequestOptions,
) -> Result<String, String> {
    let api_key = required_api_key(settings)?;
    let mut url = reqwest::Url::parse(&format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        settings.model_id
    ))
    .map_err(|error| format!("Gemini endpoint is invalid: {error}"))?;
    url.query_pairs_mut().append_pair("key", &api_key);
    let body = json!({
        "contents": [{ "role": "user", "parts": [{ "text": prompt }] }],
        "generationConfig": { "maxOutputTokens": options.max_tokens }
    });
    let response = send_json(client.post(url).json(&body))?;
    extract_gemini_text_with_limit(&response, options.output_limit)
}

fn run_openai_compatible(
    client: &Client,
    settings: &AiRuntimeSettings,
    prompt: &str,
    options: LlmRequestOptions,
) -> Result<String, String> {
    let endpoint = if settings.provider_id == "openai" {
        "https://api.openai.com/v1/chat/completions".to_string()
    } else {
        chat_completions_endpoint(&settings.base_url)?
    };
    let mut body = json!({
        "model": &settings.model_id,
        "messages": [{ "role": "user", "content": prompt }]
    });
    let token_field = if settings.provider_id == "openai" {
        "max_completion_tokens"
    } else {
        "max_tokens"
    };
    body[token_field] = json!(options.max_tokens);
    let mut request = client.post(endpoint).json(&body);
    if let Some(api_key) = configured_api_key(settings)? {
        let mut headers = json_headers();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {api_key}"))
                .map_err(|_| "LLM API key is not valid for an HTTP header.".to_string())?,
        );
        request = request.headers(headers);
    }
    let response = send_json(request)?;
    extract_openai_text_with_limit(&response, options.output_limit)
}

fn json_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers
}

fn required_api_key(settings: &AiRuntimeSettings) -> Result<String, String> {
    if let Some(api_key) = configured_api_key(settings)? {
        return Ok(api_key);
    }
    Err("This LLM requires an API key environment variable in Settings.".into())
}

fn configured_api_key(settings: &AiRuntimeSettings) -> Result<Option<String>, String> {
    let token = settings.api_token.trim();
    if !token.is_empty() {
        return Ok(Some(token.to_string()));
    }
    let name = settings.api_key_env_var.trim();
    if name.is_empty() {
        return Ok(None);
    }
    env::var(name)
        .map(Some)
        .map_err(|_| format!("The configured API key environment variable {name} is not set."))
}

pub(super) fn chat_completions_endpoint(base_url: &str) -> Result<String, String> {
    let base_url = base_url.trim().trim_end_matches('/');
    if base_url.is_empty() {
        return Err("An OpenAI-compatible base URL is required for this LLM.".into());
    }
    if base_url.ends_with("/chat/completions") {
        Ok(base_url.to_string())
    } else {
        Ok(format!("{base_url}/chat/completions"))
    }
}

fn send_json(request: RequestBuilder) -> Result<Value, String> {
    let response = request
        .send()
        .map_err(|error| format!("LLM request failed: {error}"))?;
    let status = response.status();
    let body = response
        .text()
        .map_err(|error| format!("Could not read LLM response: {error}"))?;
    let value = serde_json::from_str::<Value>(&body).unwrap_or_else(|_| json!({ "text": body }));
    if !status.is_success() {
        return Err(truncate(
            format!("LLM provider returned {status}. {}", provider_error(&value)),
            MAX_OUTPUT_CHARS,
        ));
    }
    Ok(value)
}

fn provider_error(value: &Value) -> String {
    value
        .pointer("/error/message")
        .and_then(Value::as_str)
        .or_else(|| value.pointer("/error").and_then(Value::as_str))
        .or_else(|| value.get("text").and_then(Value::as_str))
        .unwrap_or("The provider returned an error without details.")
        .trim()
        .to_string()
}

#[cfg(test)]
pub(super) fn extract_openai_text(value: &Value) -> Result<String, String> {
    extract_openai_text_with_limit(value, MAX_OUTPUT_CHARS)
}

fn extract_openai_text_with_limit(value: &Value, output_limit: usize) -> Result<String, String> {
    let content = value.pointer("/choices/0/message/content");
    let text = content
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| {
            content.and_then(Value::as_array).map(|parts| {
                parts
                    .iter()
                    .filter_map(|part| part.get("text").and_then(Value::as_str))
                    .collect::<Vec<_>>()
                    .join("")
            })
        })
        .or_else(|| {
            value
                .pointer("/choices/0/text")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .filter(|text| !text.trim().is_empty());
    text.map(|text| truncate(text.trim(), output_limit))
        .ok_or_else(|| "The LLM response did not contain any text.".into())
}

#[cfg(test)]
pub(super) fn extract_anthropic_text(value: &Value) -> Result<String, String> {
    extract_anthropic_text_with_limit(value, MAX_OUTPUT_CHARS)
}

fn extract_anthropic_text_with_limit(value: &Value, output_limit: usize) -> Result<String, String> {
    let text = value
        .get("content")
        .and_then(Value::as_array)
        .map(|parts| {
            parts
                .iter()
                .filter_map(|part| part.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("")
        })
        .filter(|text| !text.trim().is_empty());
    text.map(|text| truncate(text.trim(), output_limit))
        .ok_or_else(|| "The LLM response did not contain any text.".into())
}

#[cfg(test)]
pub(super) fn extract_gemini_text(value: &Value) -> Result<String, String> {
    extract_gemini_text_with_limit(value, MAX_OUTPUT_CHARS)
}

fn extract_gemini_text_with_limit(value: &Value, output_limit: usize) -> Result<String, String> {
    let text = value
        .pointer("/candidates/0/content/parts")
        .and_then(Value::as_array)
        .map(|parts| {
            parts
                .iter()
                .filter_map(|part| part.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("")
        })
        .filter(|text| !text.trim().is_empty());
    text.map(|text| truncate(text.trim(), output_limit))
        .ok_or_else(|| "The LLM response did not contain any text.".into())
}
