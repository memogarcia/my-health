import { Check, ChevronDown, LoaderCircle, Send, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PromptComposerMode = "dock" | "conversation" | "review";

type PromptComposerProps = {
  ariaLabel: string;
  available: boolean;
  className?: string;
  mode?: PromptComposerMode;
  onOpenSettings?: () => void;
  onReview?: () => void;
  onSubmit: (value: string) => void;
  onValueChange?: (value: string) => void;
  pending?: boolean;
  pendingLabel: string;
  placeholder: string;
  providerLabel?: string;
  readOnly?: boolean;
  reviewed?: boolean;
  reviewedLabel?: string;
  reviewRequiredLabel?: string;
  reviewSummary?: string;
  settingsLabel: string;
  setupMessage: string;
  submitLabel: string;
  value: string;
};

/** One prompt surface for docked capture, conversation, and reviewed research. */
export function PromptComposer({
  ariaLabel,
  available,
  className,
  mode = "conversation",
  onOpenSettings,
  onReview,
  onSubmit,
  onValueChange,
  pending = false,
  pendingLabel,
  placeholder,
  providerLabel,
  readOnly = false,
  reviewed,
  reviewedLabel,
  reviewRequiredLabel,
  reviewSummary,
  settingsLabel,
  setupMessage,
  submitLabel,
  value,
}: PromptComposerProps) {
  const reviewRequired = mode === "review" && typeof reviewed === "boolean";
  const canSubmit = available && !pending && Boolean(value.trim()) && (!reviewRequired || reviewed);
  const compact = mode === "dock";

  const editor = (
    <Textarea
      aria-label={ariaLabel}
      className={cn(
        "max-h-40 min-h-[58px] resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed shadow-none outline-none placeholder:text-quiet focus-visible:border-transparent focus-visible:ring-0",
        compact && "min-h-[48px] px-3.5 py-2.5",
        mode === "review" && "max-h-[28rem] min-h-[20rem] rounded-none border-t border-border/60 bg-canvas/45 font-mono text-xs",
      )}
      disabled={pending || (!available && !readOnly)}
      onChange={(event) => onValueChange?.(event.target.value)}
      onKeyDown={(event) => {
        if (!readOnly && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={compact ? 1 : 2}
      value={value}
    />
  );

  return (
    <form
      aria-label={ariaLabel}
      className={cn(
        "group/prompt overflow-hidden rounded-[18px] border border-border/70 bg-surface shadow-[var(--elev-1)] transition-[border-color,box-shadow,background-color] duration-[var(--dur-state)] focus-within:border-ring/65 focus-within:shadow-[var(--elev-2)]",
        compact && "mx-auto mb-4 w-[min(720px,calc(100%-3.5rem))] rounded-2xl bg-secondary/70",
        mode === "conversation" && "mx-auto w-full max-w-3xl",
        mode === "review" && "w-full rounded-xl",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(value.trim());
      }}
    >
      {mode === "review" ? (
        <details
          className="group/review"
          onToggle={(event) => {
            if (event.currentTarget.open) onReview?.();
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink marker:content-none hover:bg-secondary/55">
            <span>{reviewSummary || ariaLabel}</span>
            <ChevronDown className="size-4 text-muted-ink transition-transform duration-[var(--dur-state)] group-open/review:rotate-180" aria-hidden="true" />
          </summary>
          {editor}
        </details>
      ) : editor}

      <div className={cn("flex min-h-11 items-center justify-between gap-3 border-t border-border/45 px-3 py-2", compact && "min-h-10 border-t-0 pt-0")}>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-ink">
          {available ? <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> : <Settings2 className="size-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate font-medium text-ink">{available ? providerLabel : setupMessage}</span>
          {reviewRequired ? (
            <span className={cn("hidden items-center gap-1 sm:inline-flex", reviewed ? "text-normal" : "text-monitor")} role="status">
              {reviewed ? <Check className="size-3.5" aria-hidden="true" /> : null}
              {reviewed ? reviewedLabel : reviewRequiredLabel}
            </span>
          ) : null}
        </div>

        {!available && onOpenSettings ? (
          <Button className="shrink-0" onClick={onOpenSettings} size="sm" type="button" variant="secondary">
            {settingsLabel}
          </Button>
        ) : compact ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label={pending ? pendingLabel : submitLabel} className="shrink-0 rounded-full" disabled={!canSubmit} size="icon-sm" type="submit">
                {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>{pending ? pendingLabel : submitLabel}</TooltipContent>
          </Tooltip>
        ) : (
          <Button className="shrink-0" disabled={!canSubmit} size="sm" type="submit">
            {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {pending ? pendingLabel : submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
