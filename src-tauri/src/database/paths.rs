use std::{
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub(super) fn is_plaintext_sqlite(path: &Path) -> bool {
    let mut header = [0; 16];
    File::open(path)
        .and_then(|mut file| file.read_exact(&mut header))
        .map(|_| header == *b"SQLite format 3\0")
        .unwrap_or(false)
}

pub(super) fn migration_paths(path: &Path) -> (PathBuf, PathBuf) {
    (
        path.with_extension("sqlite3.encrypted-tmp"),
        path.with_extension("sqlite3.plaintext-backup"),
    )
}

pub(super) fn unix_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}
