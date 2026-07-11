import type { RendererModuleDefinition } from "@/app/module-contract";

/** Read-only body and organ composition. Source records stay in domain modules. */
export const overviewModule: RendererModuleDefinition = {
  id: "overview",
  version: "1.0.0",
  dependencies: ["health-core", "labs", "symptoms", "conditions"],
  commands: ["get_dashboard_snapshot"],
  pages: [],
};

export default overviewModule;
