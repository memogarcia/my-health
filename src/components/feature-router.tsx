import { lazy, Suspense } from "react";
import type { DashboardController } from "../use-dashboard-controller";
import { Skeleton } from "./ui/skeleton";

const AiChatPage = lazy(() => import("./ai-chat-page").then((module) => ({ default: module.AiChatPage })));
const BreathingPage = lazy(() => import("./breathing-page").then((module) => ({ default: module.BreathingPage })));
const DeveloperPage = lazy(() => import("./developer-page").then((module) => ({ default: module.DeveloperPage })));
const DocumentsPage = lazy(() => import("./documents-page").then((module) => ({ default: module.DocumentsPage })));
const FastingPage = lazy(() => import("./fasting-page").then((module) => ({ default: module.FastingPage })));
const HistoryPage = lazy(() => import("./history-page").then((module) => ({ default: module.HistoryPage })));
const MedicationsPage = lazy(() => import("./medications-page").then((module) => ({ default: module.MedicationsPage })));
const ResearchPage = lazy(() => import("./deep-research-page").then((module) => ({ default: module.ResearchPage })));
const SettingsPage = lazy(() => import("./settings-page").then((module) => ({ default: module.SettingsPage })));

export function FeatureRouter({ controller }: { controller: DashboardController }) {
  let page = null;
  if (controller.selectedNav === "labs" || controller.selectedNav === "symptoms") page = <HistoryPage controller={controller} />;
  else if (controller.selectedNav === "medications") page = <MedicationsPage controller={controller} />;
  else if (controller.selectedNav === "fasting") page = <FastingPage controller={controller} />;
  else if (controller.selectedNav === "breathing") page = <BreathingPage controller={controller} />;
  else if (controller.selectedNav === "plan") page = <AiChatPage controller={controller} />;
  else if (controller.selectedNav === "research") page = <ResearchPage controller={controller} />;
  else if (controller.selectedNav === "documents") page = <DocumentsPage controller={controller} />;
  else if (controller.selectedNav === "settings") page = <SettingsPage controller={controller} />;
  else if (controller.selectedNav === "developer") page = <DeveloperPage controller={controller} />;

  return <Suspense fallback={<PageSkeleton />}>{page}</Suspense>;
}

function PageSkeleton() {
  return (
    <div className="feature-page-loading" aria-busy="true">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-4 h-72 w-full rounded-2xl" />
    </div>
  );
}
