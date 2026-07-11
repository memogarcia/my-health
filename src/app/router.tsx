import { Suspense } from "react";
import type { DashboardController } from "../use-dashboard-controller";
import { getRendererPage } from "./module-registry";
import { Skeleton } from "@/components/ui/skeleton";

export function FeatureRouter({ controller }: { controller: DashboardController }) {
  const Page = getRendererPage(controller.selectedNav);

  return (
    <Suspense fallback={<PageSkeleton />}>
      {Page ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Page controller={controller} />
        </div>
      ) : null}
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="grid min-h-0 min-w-0 flex-1 content-start gap-3" aria-busy="true">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-4 h-72 w-full rounded-2xl" />
    </div>
  );
}
