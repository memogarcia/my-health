import type { RendererModuleDefinition } from "@/app/module-contract";

export const regimenModule: RendererModuleDefinition = {
  id: "regimen",
  version: "1.0.0",
  dependencies: ["health-core"],
  commands: [
    "add_regimen_item",
    "update_regimen_item",
    "delete_regimen_item",
    "stop_regimen_item",
    "reactivate_regimen_item",
  ],
  pages: [
    {
      routeId: "medications",
      load: () => import("./pages/medications-page"),
    },
  ],
};

export default regimenModule;
