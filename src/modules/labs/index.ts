import type { RendererModuleDefinition } from "@/app/module-contract";

export const labsModule: RendererModuleDefinition = {
  id: "labs",
  version: "1.0.0",
  dependencies: ["health-core"],
  commands: [
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
  pages: [
    {
      routeId: "labs",
      load: () => import("./pages/history-page"),
    },
  ],
};

export default labsModule;
