pub(super) fn parse_lab_number(value: &str) -> Option<f64> {
    let value = value.trim().replace(',', "");
    let start = value
        .char_indices()
        .find(|(_, ch)| ch.is_ascii_digit() || *ch == '-' || *ch == '.')?
        .0;
    let tail = &value[start..];
    let end = tail
        .char_indices()
        .find(|(_, ch)| !(ch.is_ascii_digit() || *ch == '-' || *ch == '.'))
        .map(|(index, _)| index)
        .unwrap_or(tail.len());
    tail[..end].parse().ok()
}

pub(super) fn parse_reference_range(value: &str) -> (Option<f64>, Option<f64>) {
    let value = value.trim().replace(['–', '—'], "-");
    if value.contains('≤') || value.contains("<=") || value.starts_with('<') {
        return (None, parse_lab_number(&value));
    }
    if value.contains('≥') || value.contains(">=") || value.starts_with('>') {
        return (parse_lab_number(&value), None);
    }
    if let Some((low, high)) = value.split_once('-') {
        return (parse_lab_number(low), parse_lab_number(high));
    }
    (None, None)
}

pub(super) fn derive_flag(
    value: Option<f64>,
    low: Option<f64>,
    high: Option<f64>,
) -> &'static str {
    let Some(value) = value else {
        return "unknown";
    };
    if low.is_some_and(|low| value < low) {
        return "low";
    }
    if high.is_some_and(|high| value > high) {
        return "high";
    }
    if low.is_some() || high.is_some() {
        "normal"
    } else {
        "unknown"
    }
}

pub(crate) fn validate_required(name: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{name} is required"))
    } else {
        Ok(())
    }
}

pub(crate) fn validate_kind(kind: &str) -> Result<(), String> {
    match kind {
        "medication" | "supplement" => Ok(()),
        _ => Err("kind must be medication or supplement".into()),
    }
}

pub(crate) fn validate_status(status: &str) -> Result<(), String> {
    match status {
        "normal" | "monitor" | "attention" => Ok(()),
        _ => Err("status must be normal, monitor, or attention".into()),
    }
}

pub(crate) fn validate_optional_iso_date(name: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Ok(())
    } else {
        validate_iso_date(name, value)
    }
}

pub(crate) fn validate_iso_date(name: &str, value: &str) -> Result<(), String> {
    if is_iso_date(value.trim()) {
        Ok(())
    } else {
        Err(format!("{name} must use YYYY-MM-DD"))
    }
}

fn is_iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return false;
    }
    if !bytes
        .iter()
        .enumerate()
        .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
    {
        return false;
    }
    let year = value[0..4].parse::<u32>().unwrap_or(0);
    let month = value[5..7].parse::<u32>().unwrap_or(0);
    let day = value[8..10].parse::<u32>().unwrap_or(0);
    year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days_in_month(year, month)
}

fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        2 if year % 400 == 0 || (year % 4 == 0 && year % 100 != 0) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_lab_numbers_and_ranges() {
        assert_eq!(parse_lab_number("205"), Some(205.0));
        assert_eq!(parse_lab_number("≤0.4"), Some(0.4));
        assert_eq!(parse_reference_range("50-149"), (Some(50.0), Some(149.0)));
        assert_eq!(parse_reference_range("≤70"), (None, Some(70.0)));
        assert_eq!(parse_reference_range("3.8–5.2"), (Some(3.8), Some(5.2)));
    }

    #[test]
    fn derives_lab_flags_from_range() {
        assert_eq!(derive_flag(Some(205.0), Some(50.0), Some(149.0)), "high");
        assert_eq!(derive_flag(Some(45.0), Some(50.0), Some(149.0)), "low");
        assert_eq!(derive_flag(Some(100.0), Some(50.0), Some(149.0)), "normal");
        assert_eq!(derive_flag(Some(100.0), None, None), "unknown");
    }

    #[test]
    fn accepts_real_iso_dates() {
        assert!(is_iso_date("2026-07-08"));
        assert!(is_iso_date("2024-02-29"));
    }

    #[test]
    fn rejects_invalid_iso_dates() {
        assert!(!is_iso_date("2026-13-08"));
        assert!(!is_iso_date("2025-02-29"));
        assert!(!is_iso_date("<script>"));
    }
}
