import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import assistantModule from "@/modules/assistant";
import appleHealthModule from "@/modules/apple-health";
import conditionsModule from "@/modules/conditions";
import challengesModule from "@/modules/challenges";
import documentsModule from "@/modules/documents";
import healthCoreModule from "@/modules/health-core";
import labsModule from "@/modules/labs";
import lifestyleModule from "@/modules/lifestyle";
import overviewModule from "@/modules/overview";
import platformPagesModule from "@/modules/platform-pages";
import regimenModule from "@/modules/regimen";
import symptomsModule from "@/modules/symptoms";
import type { ModulePageProps, RendererModuleDefinition } from "./module-contract";

export const rendererModules = validateRendererCatalog([
  healthCoreModule,
  overviewModule,
  labsModule,
  symptomsModule,
  conditionsModule,
  challengesModule,
  regimenModule,
  documentsModule,
  appleHealthModule,
  lifestyleModule,
  assistantModule,
  platformPagesModule,
]);

export const rendererPageRegistry: ReadonlyMap<
  string,
  LazyExoticComponent<ComponentType<ModulePageProps>>
> = buildPageRegistry(rendererModules);

export function getRendererPage(routeId: string): LazyExoticComponent<ComponentType<ModulePageProps>> | undefined {
  return rendererPageRegistry.get(routeId);
}

function buildPageRegistry(
  modules: readonly RendererModuleDefinition[],
): ReadonlyMap<string, LazyExoticComponent<ComponentType<ModulePageProps>>> {
  const pages = new Map<string, LazyExoticComponent<ComponentType<ModulePageProps>>>();
  for (const module of modules) {
    for (const page of module.pages) pages.set(page.routeId, lazy(page.load));
  }
  return pages;
}

function validateRendererCatalog(
  modules: readonly RendererModuleDefinition[],
): readonly RendererModuleDefinition[] {
  const moduleIds = new Set<string>();
  const routeIds = new Set<string>();
  const commandNames = new Set<string>();

  for (const module of modules) {
    if (moduleIds.has(module.id)) throw new Error(`Duplicate renderer module id: ${module.id}`);
    moduleIds.add(module.id);

    for (const dependency of module.dependencies) {
      if (dependency === module.id) throw new Error(`Renderer module cannot depend on itself: ${module.id}`);
      if (!modules.some((candidate) => candidate.id === dependency)) {
        throw new Error(`Unknown renderer module dependency: ${module.id} -> ${dependency}`);
      }
    }

    for (const routeId of module.pages.map((page) => page.routeId)) {
      if (routeIds.has(routeId)) throw new Error(`Duplicate renderer route id: ${routeId}`);
      routeIds.add(routeId);
    }

    for (const commandName of module.commands) {
      if (commandNames.has(commandName)) throw new Error(`Duplicate renderer command name: ${commandName}`);
      commandNames.add(commandName);
    }
  }

  assertAcyclicDependencies(modules);
  return Object.freeze([...modules]);
}

function assertAcyclicDependencies(modules: readonly RendererModuleDefinition[]): void {
  const definitions = new Map(modules.map((module) => [module.id, module]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(moduleId: string): void {
    if (visited.has(moduleId)) return;
    if (visiting.has(moduleId)) throw new Error(`Cyclic renderer module dependency: ${moduleId}`);
    visiting.add(moduleId);
    for (const dependency of definitions.get(moduleId)?.dependencies || []) visit(dependency);
    visiting.delete(moduleId);
    visited.add(moduleId);
  }

  for (const module of modules) visit(module.id);
}
