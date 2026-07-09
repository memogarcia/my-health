use serde::Deserialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use tauri::Manager;

pub(crate) const MAX_DOCUMENT_BYTES: usize = 4 * 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDocumentCopyInput {
    file_name: String,
    file_bytes: Vec<u8>,
}

pub(crate) struct ValidDocumentUpload {
    safe_file_name: String,
}

#[tauri::command]
pub async fn save_document_copy(
    input: SaveDocumentCopyInput,
    app: tauri::AppHandle,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?
            .join("result-documents");
        save_document_copy_to_dir(&dir, &input.file_name, &input.file_bytes)
            .map(|path| path.display().to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

fn save_document_copy_to_dir(
    dir: &Path,
    file_name: &str,
    file_bytes: &[u8],
) -> Result<PathBuf, String> {
    let validation = validate_document_upload(file_name, file_bytes)?;
    fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    let path = dir.join(unique_document_file_name_from_safe(&validation.safe_file_name));
    fs::write(&path, file_bytes).map_err(|error| format!("Could not save document copy: {error}"))?;
    #[cfg(unix)]
    fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
        .map_err(|error| error.to_string())?;
    Ok(path)
}

pub(crate) fn validate_document_upload(
    name: &str,
    file_bytes: &[u8],
) -> Result<ValidDocumentUpload, String> {
    if file_bytes.is_empty() {
        return Err("Document file is empty.".into());
    }
    if file_bytes.len() > MAX_DOCUMENT_BYTES {
        return Err("Document is too large to save.".into());
    }
    let safe_file_name = sanitize_file_name(name);
    if !is_supported_document_extension(&safe_file_name) {
        return Err("Document must be a PDF or image.".into());
    }
    Ok(ValidDocumentUpload { safe_file_name })
}

pub(crate) fn unique_document_file_name(name: &str) -> String {
    unique_document_file_name_from_safe(&sanitize_file_name(name))
}

fn unique_document_file_name_from_safe(safe_name: &str) -> String {
    format!("{}-{}", unix_nanos(), safe_name)
}

fn is_supported_document_extension(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]
        .iter()
        .any(|extension| lower.ends_with(extension))
}

fn sanitize_file_name(name: &str) -> String {
    let trimmed = name.trim();
    let base = trimmed
        .rsplit('/')
        .next()
        .unwrap_or(trimmed)
        .rsplit('\\')
        .next()
        .unwrap_or(trimmed);
    let cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if cleaned.is_empty() || cleaned == "." {
        "document.pdf".to_string()
    } else {
        cleaned
    }
}

fn unix_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::{sanitize_file_name, save_document_copy_to_dir, validate_document_upload, MAX_DOCUMENT_BYTES};

    #[test]
    fn sanitizes_file_names() {
        assert_eq!(sanitize_file_name("lab.pdf"), "lab.pdf");
        assert_eq!(sanitize_file_name("reports/july-2026.pdf"), "july-2026.pdf");
        assert_eq!(sanitize_file_name("..\\july-2026.png"), "july-2026.png");
        assert_eq!(sanitize_file_name("  "), "document.pdf");
        assert_eq!(sanitize_file_name("HDL & LDL.json"), "HDL___LDL.json");
    }

    #[test]
    fn rejects_empty_oversized_and_unsupported_files() {
        assert!(validate_document_upload("report.pdf", b"").is_err());
        assert!(validate_document_upload("report.pdf", &vec![1; MAX_DOCUMENT_BYTES + 1]).is_err());
        assert!(validate_document_upload("report.txt", b"hello").is_err());
    }

    #[test]
    fn accepts_pdf_and_images() {
        assert!(validate_document_upload("report.pdf", b"fake pdf").is_ok());
        assert!(validate_document_upload("report.png", b"fake image").is_ok());
        assert!(validate_document_upload("report.JPG", b"fake image").is_ok());
    }

    #[test]
    fn saves_document_copy_to_directory() {
        let dir = std::env::temp_dir().join(format!("me-doc-copy-{}", super::unix_nanos()));
        let path = save_document_copy_to_dir(&dir, "reports/ldl.png", b"fake image").unwrap();
        assert!(path.to_string_lossy().ends_with("-ldl.png"));
        assert_eq!(std::fs::read(&path).unwrap(), b"fake image");
        let _ = std::fs::remove_dir_all(dir);
    }
}
