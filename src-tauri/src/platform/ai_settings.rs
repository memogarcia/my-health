pub fn validate_ai_settings(value: &serde_json::Value) -> Result<(), String> {
    let provider_id = value
        .get("providerId")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    if contains_secret_field(value, provider_id == "lmstudio") {
        return Err("AI settings must store raw API tokens only for local LM Studio.".into());
    }
    validate_api_key_env_var_fields(value)?;
    validate_api_token_fields(value, provider_id)?;
    validate_base_url_fields(value)
}

fn contains_secret_field(value: &serde_json::Value, allow_lmstudio_api_token: bool) -> bool {
    match value {
        serde_json::Value::Object(map) => map.iter().any(|(key, value)| {
            let normalized = key.to_ascii_lowercase().replace(['_', '-'], "");
            let allowed_token = allow_lmstudio_api_token && normalized == "apitoken";
            let secret_key = matches!(
                normalized.as_str(),
                "apikey"
                    | "token"
                    | "accesstoken"
                    | "refreshtoken"
                    | "secret"
                    | "password"
                    | "authorization"
            );
            (secret_key && !allowed_token) || contains_secret_field(value, allow_lmstudio_api_token)
        }),
        serde_json::Value::Array(values) => values
            .iter()
            .any(|value| contains_secret_field(value, allow_lmstudio_api_token)),
        _ => false,
    }
}

fn validate_base_url_fields(value: &serde_json::Value) -> Result<(), String> {
    match value {
        serde_json::Value::Object(map) => {
            for (key, value) in map {
                if key == "baseUrl" {
                    let Some(url) = value.as_str() else {
                        return Err("AI base URL must be a string.".into());
                    };
                    if url.split_once("://").is_some_and(|(_, tail)| {
                        tail.split('/')
                            .next()
                            .is_some_and(|authority| authority.contains('@'))
                    }) {
                        return Err("AI base URL must not contain embedded credentials.".into());
                    }
                }
                validate_base_url_fields(value)?;
            }
            Ok(())
        }
        serde_json::Value::Array(values) => {
            for value in values {
                validate_base_url_fields(value)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn validate_api_key_env_var_fields(value: &serde_json::Value) -> Result<(), String> {
    match value {
        serde_json::Value::Object(map) => {
            for (key, value) in map {
                if key == "apiKeyEnvVar" {
                    validate_api_key_env_var(value)?;
                }
                validate_api_key_env_var_fields(value)?;
            }
            Ok(())
        }
        serde_json::Value::Array(values) => {
            for value in values {
                validate_api_key_env_var_fields(value)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn validate_api_key_env_var(value: &serde_json::Value) -> Result<(), String> {
    let serde_json::Value::String(name) = value else {
        return Err("API key env var must be a string environment variable name.".into());
    };
    let name = name.trim();
    if name.is_empty() || is_env_var_name(name) {
        Ok(())
    } else {
        Err("API key env var must be an environment variable name like OPENAI_API_KEY.".into())
    }
}

fn validate_api_token_fields(value: &serde_json::Value, provider_id: &str) -> Result<(), String> {
    match value {
        serde_json::Value::Object(map) => {
            for (key, value) in map {
                if key == "apiToken" {
                    validate_api_token(value, provider_id)?;
                }
                validate_api_token_fields(value, provider_id)?;
            }
            Ok(())
        }
        serde_json::Value::Array(values) => {
            for value in values {
                validate_api_token_fields(value, provider_id)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

fn validate_api_token(value: &serde_json::Value, provider_id: &str) -> Result<(), String> {
    let serde_json::Value::String(token) = value else {
        return Err("LM Studio API token must be a string.".into());
    };
    if provider_id == "lmstudio" || token.trim().is_empty() {
        Ok(())
    } else {
        Err("Raw API tokens can only be saved for local LM Studio.".into())
    }
}

fn is_env_var_name(name: &str) -> bool {
    let mut bytes = name.bytes();
    let Some(first) = bytes.next() else {
        return false;
    };
    matches!(first, b'A'..=b'Z' | b'_')
        && bytes.all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit() || byte == b'_')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_env_var_names() {
        let settings = serde_json::json!({
            "providerId": "openai",
            "apiKeyEnvVar": "OPENAI_API_KEY"
        });

        assert!(validate_ai_settings(&settings).is_ok());
    }

    #[test]
    fn accepts_local_provider_without_key() {
        let settings = serde_json::json!({
            "providerId": "ollama",
            "apiKeyEnvVar": ""
        });

        assert!(validate_ai_settings(&settings).is_ok());
    }

    #[test]
    fn rejects_raw_api_key_field() {
        let settings = serde_json::json!({ "apiKey": "sk-test" });

        let error = validate_ai_settings(&settings).unwrap_err();
        assert!(error.contains("LM Studio"));
    }

    #[test]
    fn rejects_secret_aliases_and_url_credentials() {
        assert!(validate_ai_settings(&serde_json::json!({ "access_token": "secret" })).is_err());
        assert!(validate_ai_settings(
            &serde_json::json!({ "baseUrl": "https://user:pass@example.com" })
        )
        .is_err());
    }

    #[test]
    fn rejects_raw_api_key_value() {
        let settings = serde_json::json!({ "apiKeyEnvVar": "sk-proj-secret" });

        let error = validate_ai_settings(&settings).unwrap_err();
        assert!(error.contains("environment variable name"));
    }

    #[test]
    fn accepts_lmstudio_api_token() {
        let settings = serde_json::json!({
            "providerId": "lmstudio",
            "apiToken": "lm-secret"
        });

        assert!(validate_ai_settings(&settings).is_ok());
    }

    #[test]
    fn rejects_remote_provider_api_token() {
        let settings = serde_json::json!({
            "providerId": "openai",
            "apiToken": "sk-test"
        });

        let error = validate_ai_settings(&settings).unwrap_err();
        assert!(error.contains("LM Studio"));
    }
}
