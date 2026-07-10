use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Command, Output, Stdio},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

const PROCESS_POLL_INTERVAL: Duration = Duration::from_millis(50);

pub(super) struct CodexWorkspace {
    path: PathBuf,
}

impl CodexWorkspace {
    pub(super) fn create(app: &tauri::AppHandle) -> Result<Self, String> {
        let root = app
            .path()
            .app_cache_dir()
            .map_err(|error| error.to_string())?
            .join("codex-workspaces");
        fs::create_dir_all(&root).map_err(|error| error.to_string())?;
        cleanup_stale_workspaces(&root);
        let path = root.join(format!("{}-{}", std::process::id(), unix_nanos()));
        fs::create_dir(&path).map_err(|error| error.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o700))
                .map_err(|error| error.to_string())?;
        }
        Ok(Self { path })
    }

    pub(super) fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for CodexWorkspace {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

pub(super) fn codex_bin() -> PathBuf {
    if let Ok(path) = std::env::var("CODEX_CLI_PATH") {
        if !path.trim().is_empty() {
            return PathBuf::from(path);
        }
    }
    for path in ["/opt/homebrew/bin/codex", "/usr/local/bin/codex"] {
        if Path::new(path).exists() {
            return PathBuf::from(path);
        }
    }
    PathBuf::from("codex")
}

pub(super) fn run_command_with_timeout(
    mut command: Command,
    timeout: Duration,
    stdin: Option<&[u8]>,
) -> Result<Output, String> {
    command
        .stdin(if stdin.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let mut child = command.spawn().map_err(|error| error.to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Could not capture stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Could not capture stderr".to_string())?;
    let stdout_reader = thread::spawn(move || read_stream(stdout));
    let stderr_reader = thread::spawn(move || read_stream(stderr));
    if let Some(input) = stdin {
        let mut child_stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Could not open stdin".to_string())?;
        child_stdin
            .write_all(input)
            .map_err(|error| error.to_string())?;
    }
    let started = Instant::now();
    loop {
        if let Some(status) = child.try_wait().map_err(|error| error.to_string())? {
            let stdout = stdout_reader
                .join()
                .map_err(|_| "stdout reader panicked".to_string())??;
            let stderr = stderr_reader
                .join()
                .map_err(|_| "stderr reader panicked".to_string())??;
            return Ok(Output {
                status,
                stdout,
                stderr,
            });
        }
        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            let _ = stdout_reader.join();
            let stderr = stderr_reader
                .join()
                .ok()
                .and_then(Result::ok)
                .unwrap_or_default();
            let detail = String::from_utf8_lossy(&stderr).trim().to_string();
            let suffix = if detail.is_empty() {
                String::new()
            } else {
                format!(" CLI stderr: {}", truncate_output(&detail, 2_000))
            };
            return Err(format!(
                "Timed out after {} seconds.{suffix}",
                timeout.as_secs()
            ));
        }
        thread::sleep(PROCESS_POLL_INTERVAL);
    }
}

fn truncate_output(value: &str, limit: usize) -> String {
    if value.chars().count() <= limit {
        return value.to_string();
    }
    format!("{}...", value.chars().take(limit).collect::<String>())
}

fn cleanup_stale_workspaces(root: &Path) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let stale = entry
            .metadata()
            .and_then(|metadata| metadata.modified())
            .ok()
            .and_then(|modified| modified.elapsed().ok())
            .is_some_and(|age| age >= Duration::from_secs(60 * 60));
        if stale {
            let _ = fs::remove_dir_all(entry.path());
        }
    }
}

fn read_stream(mut stream: impl Read) -> Result<Vec<u8>, String> {
    let mut output = Vec::new();
    stream
        .read_to_end(&mut output)
        .map_err(|error| error.to_string())?;
    Ok(output)
}

fn unix_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default()
}
