import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight } from "../health-icons";
import { t } from "../../i18n";

export function BodyCollapseToggle({
  collapsed,
  onToggle,
  section,
  className,
  direction = "vertical",
}: {
  collapsed: boolean;
  onToggle: () => void;
  section: string;
  className?: string;
  direction?: "vertical" | "left" | "right";
}) {
  const Icon = direction === "left"
    ? (collapsed ? ChevronsRight : ChevronsLeft)
    : direction === "right"
      ? (collapsed ? ChevronsLeft : ChevronsRight)
      : (collapsed ? ChevronDown : ChevronUp);
  return (
    <Button
      aria-expanded={!collapsed}
      aria-label={t(collapsed ? "body.expand" : "body.collapse", { section })}
      className={cn("shrink-0", className)}
      onClick={onToggle}
      size="icon-sm"
      title={t(collapsed ? "body.expand" : "body.collapse", { section })}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
