pub(crate) const MAX_DOCUMENT_BYTES: usize = 4 * 1024 * 1024;

pub(crate) struct ValidDocumentUpload {
    pub(crate) safe_file_name: String,
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
    if !content_matches_extension(&safe_file_name, file_bytes) {
        return Err("Document contents do not match the file type.".into());
    }
    Ok(ValidDocumentUpload { safe_file_name })
}

fn is_supported_document_extension(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]
        .iter()
        .any(|extension| lower.ends_with(extension))
}

fn content_matches_extension(name: &str, bytes: &[u8]) -> bool {
    let lower = name.to_ascii_lowercase();
    (lower.ends_with(".pdf") && bytes.starts_with(b"%PDF-"))
        || (lower.ends_with(".png")
            && bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a]))
        || ((lower.ends_with(".jpg") || lower.ends_with(".jpeg"))
            && bytes.starts_with(&[0xff, 0xd8, 0xff]))
        || (lower.ends_with(".gif")
            && (bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a")))
        || (lower.ends_with(".webp")
            && bytes.len() >= 12
            && bytes.starts_with(b"RIFF")
            && &bytes[8..12] == b"WEBP")
        || (lower.ends_with(".bmp") && bytes.starts_with(b"BM"))
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

#[cfg(test)]
mod tests {
    use super::{sanitize_file_name, validate_document_upload, MAX_DOCUMENT_BYTES};

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
        assert!(validate_document_upload("report.pdf", b"fake pdf").is_err());
    }

    #[test]
    fn accepts_pdf_and_images() {
        assert!(validate_document_upload("report.pdf", b"%PDF-1.7\n").is_ok());
        assert!(validate_document_upload("report.png", b"\x89PNG\r\n\x1a\n").is_ok());
        assert!(validate_document_upload("report.JPG", b"\xff\xd8\xff\xe0").is_ok());
    }
}
