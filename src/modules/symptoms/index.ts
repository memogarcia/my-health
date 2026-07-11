import type { RendererModuleDefinition } from "@/app/module-contract";

export const symptomsModule: RendererModuleDefinition = {
  id: "symptoms",
  version: "1.0.0",
  dependencies: ["health-core"],
  commands: ["add_symptom", "update_symptom", "delete_symptom"],
  pages: [
    {
      routeId: "symptoms",
      load: () => import("./pages/history-page"),
    },
  ],
};

export default symptomsModule;
