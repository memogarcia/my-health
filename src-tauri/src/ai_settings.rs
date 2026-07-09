pub fn validate_ai_settings(value: &serde_json::Value) -> Result<(), String> {
    if contains_api_key_field(value) {
        return Err(
            "AI settings must store API key environment variable names, not raw API keys".into(),
        );
    }
    validate_api_key_env_var_fields(value)
}

fn contains_api_key_field(value: &serde_json::Value) -> bool {
    match value {
        serde_json::Value::Object(map) => map
            .iter()
            .any(|(key, value)| key == "apiKey" || contains_api_key_field(value)),
        serde_json::Value::Array(values) => values.iter().any(contains_api_key_field),
        _ => false,
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
        assert!(error.contains("not raw API keys"));
    }

    #[test]
    fn rejects_raw_api_key_value() {
        let settings = serde_json::json!({ "apiKeyEnvVar": "sk-proj-secret" });

        let error = validate_ai_settings(&settings).unwrap_err();
        assert!(error.contains("environment variable name"));
    }
}
