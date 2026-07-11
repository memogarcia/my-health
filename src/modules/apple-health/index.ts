import type { RendererModuleDefinition } from "@/app/module-contract";

export const appleHealthModule: RendererModuleDefinition = {
  id: "apple-health",
  version: "1.0.0",
  dependencies: ["health-core"],
  commands: ["get_apple_health_sync_status", "import_apple_health_sync_batch"],
  pages: [],
};

export default appleHealthModule;
