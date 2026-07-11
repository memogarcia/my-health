import type { RendererModuleDefinition } from "@/app/module-contract";

export const documentsModule: RendererModuleDefinition = {
  id: "documents",
  version: "1.0.0",
  dependencies: ["labs"],
  commands: ["analyze_document"],
  pages: [
    {
      routeId: "documents",
      load: () => import("./pages/documents-page"),
    },
  ],
};

export default documentsModule;
