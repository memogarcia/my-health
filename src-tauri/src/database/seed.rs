use rusqlite::{params, Connection};

pub(super) fn seed_organs(conn: &Connection) -> rusqlite::Result<()> {
    let organs = [
        (
            "brain",
            "Brain",
            "Nervous",
            "normal",
            "Sleep, cognition, mood",
        ),
        (
            "thyroid",
            "Thyroid",
            "Endocrine",
            "normal",
            "Metabolism, energy, and temperature",
        ),
        (
            "heart",
            "Heart",
            "Cardiovascular",
            "normal",
            "Blood pressure and lipids",
        ),
        (
            "lungs",
            "Lungs",
            "Respiratory",
            "normal",
            "Breathing and oxygenation",
        ),
        (
            "liver",
            "Liver",
            "Digestive",
            "normal",
            "Liver enzymes and metabolism",
        ),
        (
            "spleen",
            "Spleen",
            "Lymphatic",
            "normal",
            "Immune function and blood filtering",
        ),
        (
            "stomach",
            "Stomach",
            "Digestive",
            "normal",
            "Digestion and appetite",
        ),
        (
            "pancreas",
            "Pancreas",
            "Endocrine",
            "normal",
            "Blood sugar and digestion",
        ),
        (
            "kidneys",
            "Kidneys",
            "Renal",
            "normal",
            "Kidney function and hydration",
        ),
        (
            "intestines",
            "Intestines",
            "Digestive",
            "normal",
            "Gut symptoms and nutrition",
        ),
        (
            "bladder",
            "Bladder",
            "Urinary",
            "normal",
            "Urinary storage and voiding",
        ),
        (
            "blood",
            "Blood",
            "Circulatory",
            "normal",
            "Complete blood count, iron, and clotting",
        ),
        (
            "bones",
            "Bones & Joints",
            "Musculoskeletal",
            "normal",
            "Bone density, joints, and vitamin D",
        ),
        (
            "skin",
            "Skin",
            "Integumentary",
            "normal",
            "Skin, hair, nails, and moles",
        ),
        (
            "reproductive",
            "Reproductive",
            "Reproductive",
            "normal",
            "Hormonal and reproductive health",
        ),
    ];

    for (key, name, system, status, notes) in organs {
        conn.execute(
            "INSERT OR IGNORE INTO organs (key, name, system, status, notes)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![key, name, system, status, notes],
        )?;
    }
    Ok(())
}
