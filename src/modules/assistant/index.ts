import type { RendererModuleDefinition } from "@/app/module-contract";

export const assistantModule: RendererModuleDefinition = {
  id: "assistant",
  version: "1.0.0",
  dependencies: ["health-core", "labs", "symptoms", "conditions", "regimen"],
  commands: ["ask_llm", "get_codex_options"],
  pages: [
    {
      routeId: "plan",
      load: () => import("./pages/ai-chat-page"),
    },
    {
      routeId: "research",
      load: () => import("./pages/deep-research-page"),
    },
  ],
};

export default assistantModule;
