pub(crate) fn parse_lab_number(value: &str) -> Option<f64> {
    let value = normalize_number_text(value.trim());
    if value.contains('/') {
        return None;
    }
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

pub(crate) fn parse_reference_range(value: &str) -> (Option<f64>, Option<f64>) {
    let value = value.trim().replace(['–', '—'], "-");
    if value.contains('≤') || value.contains("<=") || value.starts_with('<') {
        return (None, parse_lab_number(&value));
    }
    if value.contains('≥') || value.contains(">=") || value.starts_with('>') {
        return (parse_lab_number(&value), None);
    }
    let numbers = extract_numbers(&value);
    if numbers.len() == 2 && numbers[0] <= numbers[1] {
        return (Some(numbers[0]), Some(numbers[1]));
    }
    (None, None)
}

pub(crate) fn derive_flag_from_reference(value: Option<f64>, reference: &str) -> &'static str {
    let Some(value) = value else {
        return "unknown";
    };
    let reference = reference.trim();
    let (low, high) = parse_reference_range(reference);
    if reference.starts_with("<") && !reference.starts_with("<=") && !reference.starts_with('≤') {
        return high.map_or(
            "unknown",
            |high| if value >= high { "high" } else { "normal" },
        );
    }
    if reference.starts_with('>') && !reference.starts_with(">=") && !reference.starts_with('≥') {
        return low.map_or("unknown", |low| if value <= low { "low" } else { "normal" });
    }
    derive_flag(Some(value), low, high)
}

pub(super) fn validate_reference_range(value: &str) -> Result<(), String> {
    let value = value.trim();
    if value.is_empty() {
        return Ok(());
    }
    let (low, high) = parse_reference_range(value);
    if low.is_none() && high.is_none() {
        return Err("referenceRange must be a number comparison or a low-high range".into());
    }
    Ok(())
}

fn normalize_number_text(value: &str) -> String {
    if value.matches(',').count() == 1 && !value.contains('.') {
        let mut parts = value.split(',');
        let left = parts.next().unwrap_or_default();
        let right = parts.next().unwrap_or_default();
        if !left.is_empty()
            && !right.is_empty()
            && left
                .trim_start_matches(['+', '-'])
                .chars()
                .all(|char| char.is_ascii_digit())
            && right.chars().all(|char| char.is_ascii_digit())
            && right.len() != 3
        {
            return format!("{left}.{right}");
        }
    }
    value.replace(',', "")
}

fn extract_numbers(value: &str) -> Vec<f64> {
    let normalized = normalize_number_text(value);
    let mut values = Vec::new();
    let mut start = None;
    for (index, character) in normalized.char_indices() {
        let numeric = character.is_ascii_digit()
            || character == '.'
            || ((character == '-' || character == '+')
                && start.is_none()
                && normalized[index + character.len_utf8()..]
                    .chars()
                    .next()
                    .is_some_and(|next| next.is_ascii_digit() || next == '.'));
        if numeric {
            start.get_or_insert(index);
        } else if let Some(number_start) = start.take() {
            if let Ok(number) = normalized[number_start..index].parse() {
                values.push(number);
            }
        }
    }
    if let Some(number_start) = start {
        if let Ok(number) = normalized[number_start..].parse() {
            values.push(number);
        }
    }
    values
}

pub(super) fn derive_flag(value: Option<f64>, low: Option<f64>, high: Option<f64>) -> &'static str {
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
    year > 0 && (1..=12).contains(&month) && (1..=days_in_month(year, month)).contains(&day)
}

fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        2 if year.is_multiple_of(400) || (year.is_multiple_of(4) && !year.is_multiple_of(100)) => {
            29
        }
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
        assert_eq!(parse_lab_number("4,5"), Some(4.5));
        assert_eq!(parse_lab_number("120/80"), None);
        assert_eq!(parse_reference_range("-2--1"), (Some(-2.0), Some(-1.0)));
        assert_eq!(parse_reference_range("10-5"), (None, None));
    }

    #[test]
    fn derives_lab_flags_from_range() {
        assert_eq!(derive_flag(Some(205.0), Some(50.0), Some(149.0)), "high");
        assert_eq!(derive_flag(Some(45.0), Some(50.0), Some(149.0)), "low");
        assert_eq!(derive_flag(Some(100.0), Some(50.0), Some(149.0)), "normal");
        assert_eq!(derive_flag(Some(100.0), None, None), "unknown");
        assert_eq!(derive_flag_from_reference(Some(5.0), "<5"), "high");
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
