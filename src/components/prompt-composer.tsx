import { LoaderCircle, Send, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PromptComposerProps = {
  ariaLabel: string;
  available: boolean;
  className?: string;
  mode?: "dock" | "conversation";
  onOpenSettings?: () => void;
  onSubmit: (value: string) => void;
  onValueChange?: (value: string) => void;
  pending?: boolean;
  pendingLabel: string;
  placeholder: string;
  providerLabel?: string;
  settingsLabel: string;
  setupMessage: string;
  submitLabel: string;
  value: string;
};

/** Shared AI prompt surface for the dock, chat, and Deep Research. */
export function PromptComposer({
  ariaLabel,
  available,
  className,
  mode = "conversation",
  onOpenSettings,
  onSubmit,
  onValueChange,
  pending = false,
  pendingLabel,
  placeholder,
  providerLabel,
  settingsLabel,
  setupMessage,
  submitLabel,
  value,
}: PromptComposerProps) {
  const canSubmit = available && !pending && Boolean(value.trim());
  const compact = mode === "dock";

  return (
    <form aria-label={ariaLabel} className={cn("group/prompt overflow-hidden rounded-2xl bg-surface shadow-[var(--elev-1)] ring-1 ring-border/45 transition-[box-shadow,background-color] duration-[var(--dur-state)] focus-within:shadow-[0_0_0_2px_color-mix(in_oklch,var(--focus)_22%,transparent),var(--elev-1)]", compact && "mx-auto mb-4 w-[min(720px,calc(100%-3.5rem))] bg-secondary/75", !compact && "mx-auto w-full max-w-3xl", className)} onSubmit={(event) => {
      event.preventDefault();
      if (canSubmit) onSubmit(value.trim());
    }}>
      <Textarea
        aria-label={ariaLabel}
        className={cn("max-h-40 min-h-[58px] resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed shadow-none outline-none placeholder:text-quiet focus-visible:border-transparent focus-visible:ring-0", compact && "min-h-[48px] px-3.5 py-2.5")}
        disabled={pending || !available}
        onChange={(event) => onValueChange?.(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={placeholder}
        rows={compact ? 1 : 2}
        value={value}
      />
      <div className={cn("flex min-h-11 items-center justify-between gap-3 border-t border-border/40 px-3 py-2", compact && "min-h-10 border-t-0 pt-0")}>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-ink">
          {available ? <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> : <Settings2 className="size-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate font-medium text-ink">{available ? providerLabel : setupMessage}</span>
        </div>
        {!available && onOpenSettings ? (
          <Button className="shrink-0" onClick={onOpenSettings} size="sm" type="button" variant="secondary">{settingsLabel}</Button>
        ) : compact ? (
          <Tooltip>
            <TooltipTrigger asChild><Button aria-label={pending ? pendingLabel : submitLabel} className="shrink-0 rounded-full" disabled={!canSubmit} size="icon-sm" type="submit">{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}</Button></TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>{pending ? pendingLabel : submitLabel}</TooltipContent>
          </Tooltip>
        ) : (
          <Button className="shrink-0" disabled={!canSubmit} size="sm" type="submit">{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}{pending ? pendingLabel : submitLabel}</Button>
        )}
      </div>
    </form>
  );
}
