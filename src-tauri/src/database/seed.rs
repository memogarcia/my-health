use rusqlite::{params, Connection};

pub(super) fn seed_organs(conn: &Connection) -> rusqlite::Result<()> {
    let organs = [
        (
            10,
            "brain",
            "Brain",
            "Nervous",
            "normal",
            "Sleep, cognition, mood",
        ),
        (
            20,
            "thyroid",
            "Thyroid",
            "Endocrine",
            "normal",
            "Metabolism, energy, and temperature",
        ),
        (
            30,
            "lungs",
            "Lungs",
            "Respiratory",
            "normal",
            "Breathing and oxygenation",
        ),
        (
            40,
            "heart",
            "Heart",
            "Cardiovascular",
            "normal",
            "Blood pressure and lipids",
        ),
        (
            50,
            "liver",
            "Liver",
            "Digestive",
            "normal",
            "Liver enzymes and metabolism",
        ),
        (
            60,
            "spleen",
            "Spleen",
            "Lymphatic",
            "normal",
            "Immune function and blood filtering",
        ),
        (
            70,
            "stomach",
            "Stomach",
            "Digestive",
            "normal",
            "Digestion and appetite",
        ),
        (
            80,
            "pancreas",
            "Pancreas",
            "Endocrine",
            "normal",
            "Blood sugar and digestion",
        ),
        (
            90,
            "kidneys",
            "Kidneys",
            "Renal",
            "normal",
            "Kidney function and hydration",
        ),
        (
            100,
            "intestines",
            "Intestines",
            "Digestive",
            "normal",
            "Gut symptoms and nutrition",
        ),
        (
            110,
            "bladder",
            "Bladder",
            "Urinary",
            "normal",
            "Urinary storage and voiding",
        ),
        (
            200,
            "blood",
            "Blood",
            "Circulatory",
            "normal",
            "Complete blood count, iron, and clotting",
        ),
        (
            210,
            "bones",
            "Bones & Joints",
            "Musculoskeletal",
            "normal",
            "Bone density, joints, and vitamin D",
        ),
        (
            220,
            "skin",
            "Skin",
            "Integumentary",
            "normal",
            "Skin, hair, nails, and moles",
        ),
        (
            230,
            "reproductive",
            "Reproductive",
            "Reproductive",
            "normal",
            "Hormonal and reproductive health",
        ),
    ];

    for (display_order, key, name, system, status, notes) in organs {
        conn.execute(
            "INSERT OR IGNORE INTO organs (key, name, system, status, notes, display_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![key, name, system, status, notes, display_order],
        )?;
        conn.execute(
            "UPDATE organs SET display_order = ?1 WHERE key = ?2 AND display_order = 0",
            params![display_order, key],
        )?;
    }
    Ok(())
}
