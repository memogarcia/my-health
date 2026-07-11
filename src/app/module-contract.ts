import type { ComponentType } from "react";
import type { DashboardController } from "./../use-dashboard-controller";

/** Public props shared by every page registered with the app composition root. */
export type ModulePageProps = {
  controller: DashboardController;
};

export type ModulePageLoader = () => Promise<{
  default: ComponentType<ModulePageProps>;
}>;

export type RendererModuleDefinition = {
  id: string;
  version: string;
  dependencies: readonly string[];
  commands: readonly string[];
  pages: readonly RendererPageDefinition[];
};

export type RendererPageDefinition = {
  routeId: string;
  load: ModulePageLoader;
};
