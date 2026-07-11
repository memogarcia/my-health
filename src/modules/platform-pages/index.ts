import type { RendererModuleDefinition } from "@/app/module-contract";

export const platformPagesModule: RendererModuleDefinition = {
  id: "platform-pages",
  version: "1.0.0",
  dependencies: [],
  commands: [
    "get_database_status",
    "select_database",
    "unlock_database",
    "lock_database",
    "export_database",
    "get_ai_settings",
    "save_ai_settings",
    "get_user_state",
    "save_user_state",
  ],
  pages: [
    {
      routeId: "settings",
      load: () => import("./pages/settings-page"),
    },
    {
      routeId: "developer",
      load: () => import("./pages/developer-page"),
    },
  ],
};

export default platformPagesModule;
