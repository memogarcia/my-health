use super::{AppleHealthSampleInput, AppleHealthSyncBatch};
use crate::records::parse::validate_iso_date;
use serde_json::Value;

const MAX_SAMPLES_PER_BATCH: usize = 5_000;
const MAX_DELETIONS_PER_BATCH: usize = 5_000;
const MAX_ANCHOR_BYTES: usize = 64 * 1024;
const MAX_METADATA_BYTES: usize = 8 * 1024;
const MAX_SOURCE_TEXT_BYTES: usize = 255;
const MAX_UNIT_BYTES: usize = 64;

const SUPPORTED_TYPE_IDENTIFIERS: &[&str] = &[
    "HKQuantityTypeIdentifierStepCount",
    "HKQuantityTypeIdentifierDistanceWalkingRunning",
    "HKQuantityTypeIdentifierBodyMass",
    "HKQuantityTypeIdentifierHeartRate",
    "HKQuantityTypeIdentifierRestingHeartRate",
    "HKQuantityTypeIdentifierWalkingHeartRateAverage",
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
    "HKQuantityTypeIdentifierRespiratoryRate",
    "HKQuantityTypeIdentifierOxygenSaturation",
    "HKQuantityTypeIdentifierBloodPressureSystolic",
    "HKQuantityTypeIdentifierBloodPressureDiastolic",
    "HKQuantityTypeIdentifierBloodGlucose",
    "HKQuantityTypeIdentifierActiveEnergyBurned",
    "HKQuantityTypeIdentifierBasalEnergyBurned",
    "HKQuantityTypeIdentifierAppleExerciseTime",
    "HKCategoryTypeIdentifierSleepAnalysis",
    "HKWorkoutTypeIdentifier",
];

pub(super) fn validate_batch(input: &AppleHealthSyncBatch) -> Result<(), String> {
    validate_uuid("deviceId", &input.device_id)?;
    validate_type_identifier(&input.type_identifier)?;
    validate_text("nextAnchor", &input.next_anchor, MAX_ANCHOR_BYTES, false)?;
    if input.samples.len() > MAX_SAMPLES_PER_BATCH {
        return Err(format!(
            "Apple Health sync batches can contain at most {MAX_SAMPLES_PER_BATCH} samples"
        ));
    }
    if input.deleted_uuids.len() > MAX_DELETIONS_PER_BATCH {
        return Err(format!(
            "Apple Health sync batches can contain at most {MAX_DELETIONS_PER_BATCH} deletions"
        ));
    }
    for uuid in &input.deleted_uuids {
        validate_uuid("deleted UUID", uuid)?;
    }
    for sample in &input.samples {
        validate_sample(&input.type_identifier, sample)?;
    }
    Ok(())
}

fn validate_sample(
    type_identifier: &str,
    sample: &AppleHealthSampleInput,
) -> Result<(), String> {
    validate_uuid("sample UUID", &sample.uuid)?;
    validate_rfc3339("startAt", &sample.start_at)?;
    validate_rfc3339("endAt", &sample.end_at)?;
    validate_text(
        "sourceName",
        &sample.source_name,
        MAX_SOURCE_TEXT_BYTES,
        true,
    )?;
    validate_text(
        "sourceBundleId",
        &sample.source_bundle_id,
        MAX_SOURCE_TEXT_BYTES,
        true,
    )?;
    validate_text(
        "sourceVersion",
        &sample.source_version,
        MAX_SOURCE_TEXT_BYTES,
        true,
    )?;
    validate_text("unit", &sample.unit, MAX_UNIT_BYTES, true)?;
    validate_optional_finite("numericValue", sample.numeric_value)?;
    validate_optional_non_negative("durationSeconds", sample.duration_seconds)?;
    validate_optional_non_negative("totalEnergyKcal", sample.total_energy_kcal)?;
    validate_optional_non_negative("totalDistanceMeters", sample.total_distance_meters)?;
    normalize_metadata(sample.metadata.as_ref())?;

    let expected_kind = expected_sample_kind(type_identifier);
    if sample.sample_kind.trim() != expected_kind {
        return Err(format!(
            "sampleKind for {type_identifier} must be {expected_kind}"
        ));
    }
    match expected_kind {
        "quantity" => {
            if sample.numeric_value.is_none() {
                return Err("numericValue is required for quantity samples".into());
            }
            if sample.unit.trim().is_empty() {
                return Err("unit is required for quantity samples".into());
            }
        }
        "category" => {
            if sample.category_value.is_none() {
                return Err("categoryValue is required for category samples".into());
            }
        }
        "workout" => {
            if sample.workout_activity_type.is_none() {
                return Err("workoutActivityType is required for workout samples".into());
            }
            if sample.duration_seconds.is_none() {
                return Err("durationSeconds is required for workout samples".into());
            }
        }
        _ => unreachable!(),
    }
    Ok(())
}

fn validate_type_identifier(value: &str) -> Result<(), String> {
    if SUPPORTED_TYPE_IDENTIFIERS.contains(&value.trim()) {
        Ok(())
    } else {
        Err(format!(
            "Unsupported Apple Health type identifier: {}",
            value.trim()
        ))
    }
}

fn expected_sample_kind(type_identifier: &str) -> &'static str {
    match type_identifier.trim() {
        "HKCategoryTypeIdentifierSleepAnalysis" => "category",
        "HKWorkoutTypeIdentifier" => "workout",
        _ => "quantity",
    }
}

fn validate_text(
    name: &str,
    value: &str,
    max_bytes: usize,
    allow_empty: bool,
) -> Result<(), String> {
    let value = value.trim();
    if !allow_empty && value.is_empty() {
        return Err(format!("{name} is required"));
    }
    if value.len() > max_bytes {
        return Err(format!("{name} must be {max_bytes} bytes or fewer"));
    }
    if value.chars().any(char::is_control) {
        return Err(format!("{name} contains unsupported control characters"));
    }
    Ok(())
}

fn validate_uuid(name: &str, value: &str) -> Result<(), String> {
    let value = value.trim().as_bytes();
    if value.len() != 36 {
        return Err(format!("{name} must be a UUID"));
    }
    for (index, byte) in value.iter().enumerate() {
        let valid = if matches!(index, 8 | 13 | 18 | 23) {
            *byte == b'-'
        } else {
            byte.is_ascii_hexdigit()
        };
        if !valid {
            return Err(format!("{name} must be a UUID"));
        }
    }
    Ok(())
}

fn validate_rfc3339(name: &str, value: &str) -> Result<(), String> {
    let value = value.trim();
    if value.len() < 20 || value.len() > 40 || !value.is_ascii() {
        return Err(format!("{name} must be an RFC 3339 timestamp"));
    }
    validate_iso_date(name, &value[..10])?;
    let bytes = value.as_bytes();
    if bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || !bytes[11..13].iter().all(u8::is_ascii_digit)
        || !bytes[14..16].iter().all(u8::is_ascii_digit)
        || !bytes[17..19].iter().all(u8::is_ascii_digit)
    {
        return Err(format!("{name} must be an RFC 3339 timestamp"));
    }
    let hour = value[11..13].parse::<u8>().unwrap_or(24);
    let minute = value[14..16].parse::<u8>().unwrap_or(60);
    let second = value[17..19].parse::<u8>().unwrap_or(60);
    if hour > 23 || minute > 59 || second > 59 {
        return Err(format!("{name} must be an RFC 3339 timestamp"));
    }

    let suffix = &value[19..];
    let zone_index = suffix
        .char_indices()
        .find(|(_, character)| matches!(character, 'Z' | '+' | '-'))
        .map(|(index, _)| index)
        .ok_or_else(|| format!("{name} must include a timezone"))?;
    let fraction = &suffix[..zone_index];
    if !fraction.is_empty()
        && (!fraction.starts_with('.')
            || fraction.len() == 1
            || !fraction[1..]
                .chars()
                .all(|character| character.is_ascii_digit()))
    {
        return Err(format!("{name} has an invalid fractional second"));
    }
    let zone = &suffix[zone_index..];
    if zone == "Z" {
        return Ok(());
    }
    let zone_bytes = zone.as_bytes();
    if zone_bytes.len() != 6
        || !matches!(zone_bytes[0], b'+' | b'-')
        || zone_bytes[3] != b':'
        || !zone_bytes[1..3].iter().all(u8::is_ascii_digit)
        || !zone_bytes[4..6].iter().all(u8::is_ascii_digit)
    {
        return Err(format!("{name} has an invalid timezone"));
    }
    let zone_hour = zone[1..3].parse::<u8>().unwrap_or(24);
    let zone_minute = zone[4..6].parse::<u8>().unwrap_or(60);
    if zone_hour > 23 || zone_minute > 59 {
        return Err(format!("{name} has an invalid timezone"));
    }
    Ok(())
}

fn validate_optional_finite(name: &str, value: Option<f64>) -> Result<(), String> {
    if value.is_some_and(|value| !value.is_finite()) {
        Err(format!("{name} must be finite"))
    } else {
        Ok(())
    }
}

fn validate_optional_non_negative(name: &str, value: Option<f64>) -> Result<(), String> {
    validate_optional_finite(name, value)?;
    if value.is_some_and(|value| value < 0.0) {
        Err(format!("{name} must be zero or greater"))
    } else {
        Ok(())
    }
}

pub(super) fn normalize_metadata(value: Option<&Value>) -> Result<String, String> {
    let value = value
        .cloned()
        .unwrap_or_else(|| Value::Object(Default::default()));
    if !value.is_object() {
        return Err("metadata must be a JSON object".into());
    }
    let encoded = serde_json::to_string(&value).map_err(|error| error.to_string())?;
    if encoded.len() > MAX_METADATA_BYTES {
        return Err(format!(
            "metadata must be {MAX_METADATA_BYTES} bytes or fewer"
        ));
    }
    Ok(encoded)
}
