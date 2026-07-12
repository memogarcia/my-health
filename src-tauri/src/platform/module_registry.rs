#[derive(Debug)]
pub struct ModuleDefinition {
    pub id: &'static str,
    pub version: &'static str,
    pub dependencies: &'static [&'static str],
    pub commands: &'static [&'static str],
}

/// Static Rust composition catalog. Domain implementations remain behind their
/// compatibility adapters until each migration phase moves its source files.
pub const MODULES: &[ModuleDefinition] = &[
    ModuleDefinition {
        id: crate::modules::health_core::MODULE_ID,
        version: "1.0.0",
        dependencies: &[],
        commands: &[],
    },
    ModuleDefinition {
        id: crate::modules::overview::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core", "labs", "symptoms", "conditions"],
        commands: &["get_dashboard_snapshot"],
    },
    ModuleDefinition {
        id: crate::modules::labs::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core"],
        commands: &[
            "add_lab_result",
            "update_lab_result",
            "update_lab_results",
            "delete_lab_result",
            "add_lab_results",
            "import_lab_results_document",
            "list_lab_reports",
            "unlink_lab_report",
            "delete_lab_report",
        ],
    },
    ModuleDefinition {
        id: crate::modules::symptoms::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core"],
        commands: &["add_symptom", "update_symptom", "delete_symptom"],
    },
    ModuleDefinition {
        id: crate::modules::conditions::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core"],
        commands: &["add_condition", "update_condition", "delete_condition"],
    },
    ModuleDefinition {
        id: crate::modules::regimen::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core"],
        commands: &[
            "add_regimen_item",
            "update_regimen_item",
            "delete_regimen_item",
            "stop_regimen_item",
            "reactivate_regimen_item",
        ],
    },
    ModuleDefinition {
        id: crate::modules::documents::MODULE_ID,
        version: "1.0.0",
        dependencies: &["labs"],
        commands: &["analyze_document"],
    },
    ModuleDefinition {
        id: crate::modules::apple_health::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core"],
        commands: &[
            "get_apple_health_sync_status",
            "import_apple_health_sync_batch",
        ],
    },
    ModuleDefinition {
        id: crate::modules::lifestyle::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core"],
        commands: &[],
    },
    ModuleDefinition {
        id: crate::modules::challenges::MODULE_ID,
        version: "1.0.0",
        dependencies: &[],
        commands: &[],
    },
    ModuleDefinition {
        id: crate::modules::assistant::MODULE_ID,
        version: "1.0.0",
        dependencies: &["health-core", "labs", "symptoms", "conditions", "regimen"],
        commands: &["ask_llm", "get_codex_options"],
    },
    ModuleDefinition {
        id: crate::modules::platform_pages::MODULE_ID,
        version: "1.0.0",
        dependencies: &[],
        commands: &[
            "get_database_status",
            "get_shell_theme",
            "set_shell_theme",
            "select_database",
            "unlock_database",
            "lock_database",
            "export_database",
            "get_ai_settings",
            "save_ai_settings",
            "get_user_state",
            "save_user_state",
        ],
    },
];

pub fn validate_catalog() -> Result<(), String> {
    for (index, module) in MODULES.iter().enumerate() {
        if module.version.trim().is_empty() {
            return Err(format!("module version is empty: {}", module.id));
        }
        for other in MODULES.iter().take(index) {
            if module.id == other.id {
                return Err(format!("duplicate module id: {}", module.id));
            }
            if module
                .commands
                .iter()
                .any(|command| other.commands.contains(command))
            {
                return Err(format!(
                    "duplicate command name in module catalog: {}",
                    module.id
                ));
            }
        }
        for dependency in module.dependencies {
            if *dependency == module.id {
                return Err(format!("module depends on itself: {}", module.id));
            }
            if !MODULES.iter().any(|candidate| candidate.id == *dependency) {
                return Err(format!(
                    "unknown module dependency: {} -> {}",
                    module.id, dependency
                ));
            }
        }
    }

    let mut state = vec![0_u8; MODULES.len()];
    for index in 0..MODULES.len() {
        visit(index, &mut state)?;
    }
    Ok(())
}

fn visit(index: usize, state: &mut [u8]) -> Result<(), String> {
    if state[index] == 2 {
        return Ok(());
    }
    if state[index] == 1 {
        return Err(format!("cyclic module dependency: {}", MODULES[index].id));
    }
    state[index] = 1;
    for dependency in MODULES[index].dependencies {
        let dependency_index = MODULES
            .iter()
            .position(|module| module.id == *dependency)
            .ok_or_else(|| {
                format!(
                    "unknown module dependency: {} -> {}",
                    MODULES[index].id, dependency
                )
            })?;
        visit(dependency_index, state)?;
    }
    state[index] = 2;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compiled_module_catalog_is_valid() {
        validate_catalog().unwrap();
    }
}
