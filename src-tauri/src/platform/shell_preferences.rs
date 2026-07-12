use std::{fs, path::PathBuf};
use tauri::Manager;

const THEME_FILE: &str = "shell-theme";

pub struct ShellPreferencesState {
    theme_path: PathBuf,
}

impl ShellPreferencesState {
    #[cfg(test)]
    fn new(theme_path: PathBuf) -> Self {
        Self { theme_path }
    }
}

pub fn init_shell_preferences(
    app: &tauri::App,
) -> Result<ShellPreferencesState, Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&app_data_dir)?;
    Ok(ShellPreferencesState {
        theme_path: app_data_dir.join(THEME_FILE),
    })
}

#[tauri::command]
pub fn get_shell_theme(state: tauri::State<'_, ShellPreferencesState>) -> String {
    read_theme(&state.theme_path)
}

#[tauri::command]
pub fn set_shell_theme(
    theme: String,
    state: tauri::State<'_, ShellPreferencesState>,
) -> Result<(), String> {
    write_theme(&state.theme_path, &theme)
}

fn read_theme(path: &PathBuf) -> String {
    fs::read_to_string(path)
        .ok()
        .and_then(|value| normalize_theme(&value).ok())
        .unwrap_or_else(|| "system".into())
}

fn write_theme(path: &PathBuf, theme: &str) -> Result<(), String> {
    let theme = normalize_theme(theme)?;
    fs::write(path, theme).map_err(|error| error.to_string())
}

fn normalize_theme(value: &str) -> Result<String, String> {
    match value.trim() {
        "system" | "light" | "dark" => Ok(value.trim().to_string()),
        _ => Err("Theme must be system, light, or dark.".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shell_theme_round_trips_without_health_database_access() {
        let path = std::env::temp_dir().join(format!(
            "me-shell-theme-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let state = ShellPreferencesState::new(path.clone());

        assert_eq!(read_theme(&state.theme_path), "system");
        write_theme(&state.theme_path, "dark").unwrap();
        assert_eq!(read_theme(&state.theme_path), "dark");
        assert!(write_theme(&state.theme_path, "midnight").is_err());
        assert_eq!(read_theme(&state.theme_path), "dark");

        let _ = fs::remove_file(path);
    }
}
