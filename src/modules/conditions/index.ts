import type { RendererModuleDefinition } from "@/app/module-contract";

export const conditionsModule: RendererModuleDefinition = {
  id: "conditions",
  version: "1.0.0",
  dependencies: ["health-core"],
  commands: ["add_condition", "update_condition", "delete_condition"],
  pages: [],
};

export default conditionsModule;
