import type { RendererModuleDefinition } from "@/app/module-contract";

/** Canonical health identifiers and value contracts. This module owns no page. */
export const healthCoreModule: RendererModuleDefinition = {
  id: "health-core",
  version: "1.0.0",
  dependencies: [],
  commands: [],
  pages: [],
};

export default healthCoreModule;
