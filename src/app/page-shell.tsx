import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  fullBleed?: boolean;
};

/** Shared page frame for every routed surface. */
export function PageShell({ children, className, contentClassName, fullBleed = false }: PageShellProps) {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas", className)}>
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full min-w-0 max-w-[1120px] flex-1 flex-col px-[var(--page-gutter)] py-6 max-[880px]:px-[var(--page-gutter-compact)]",
          fullBleed && "max-w-none px-0 py-0",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
