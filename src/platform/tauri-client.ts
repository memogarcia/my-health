import { invoke } from "@tauri-apps/api/core";

/** Every renderer-to-Rust operation crosses this typed platform boundary. */
export type TauriCommand =
  | "get_database_status"
  | "get_shell_theme"
  | "set_shell_theme"
  | "select_database"
  | "unlock_database"
  | "lock_database"
  | "export_database"
  | "change_database_password"
  | "get_dashboard_snapshot"
  | "add_lab_result"
  | "update_lab_result"
  | "update_lab_results"
  | "delete_lab_result"
  | "add_lab_results"
  | "import_lab_results_document"
  | "list_lab_reports"
  | "unlink_lab_report"
  | "delete_lab_report"
  | "add_symptom"
  | "update_symptom"
  | "delete_symptom"
  | "add_condition"
  | "update_condition"
  | "delete_condition"
  | "add_regimen_item"
  | "update_regimen_item"
  | "delete_regimen_item"
  | "stop_regimen_item"
  | "reactivate_regimen_item"
  | "get_apple_health_sync_status"
  | "import_apple_health_sync_batch"
  | "ask_llm"
  | "analyze_document"
  | "get_codex_options"
  | "get_ai_settings"
  | "save_ai_settings"
  | "get_user_state"
  | "save_user_state";

export function invokeCommand<T>(command: TauriCommand, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args);
}
