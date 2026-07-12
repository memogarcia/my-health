import type { RendererModuleDefinition } from "@/app/module-contract";

export const lifestyleModule: RendererModuleDefinition = {
  id: "lifestyle",
  version: "1.0.0",
  dependencies: ["health-core"],
  commands: [],
  pages: [
    {
      routeId: "diet",
      load: () => import("./pages/diet-page"),
    },
    {
      routeId: "fasting",
      load: () => import("./pages/fasting-page"),
    },
    {
      routeId: "breathing",
      load: () => import("./pages/breathing-page"),
    },
    {
      routeId: "activity",
      load: () => import("./pages/daily-log-page"),
    },
  ],
};

export default lifestyleModule;
