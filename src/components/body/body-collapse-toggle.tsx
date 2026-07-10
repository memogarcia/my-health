import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "../health-icons";
import { t } from "../../i18n";

export function BodyCollapseToggle({
  collapsed,
  onToggle,
  section,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  section: string;
  className?: string;
}) {
  const Icon = collapsed ? ChevronRight : ChevronDown;
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
