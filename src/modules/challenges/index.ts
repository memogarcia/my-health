import type { RendererModuleDefinition } from "@/app/module-contract";

export const challengesModule: RendererModuleDefinition = {
  id: "challenges",
  version: "1.0.0",
  dependencies: [],
  commands: [],
  pages: [{ routeId: "challenges", load: () => import("./pages/challenges-page") }],
};

export default challengesModule;
