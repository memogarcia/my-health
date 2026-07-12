import { lazy, Suspense } from "react";
import { Sparkles, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "../dashboard-format";
import type { AiConversationMessage } from "../dashboard-model";
import { t } from "../i18n";

const MarkdownOutput = lazy(() => import("./markdown-output").then((m) => ({ default: m.MarkdownOutput })));

export function ConversationMessage({ message }: { message: AiConversationMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1 self-end max-w-[85%]">
        <article className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground text-[13px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.04)] whitespace-pre-wrap font-sans">{message.content}</article>
        <time className="text-[9px] text-muted-ink px-1" dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
      </div>
    );
  }

  return (
    <article className={cn("self-start flex gap-3.5 w-full", message.isError && "rounded-lg border border-attention/30 bg-attention/5 p-4")}>
      <div className={cn(
        "flex size-7 shrink-0 select-none items-center justify-center rounded-full border border-border/10 shadow-sm",
        message.isError ? "bg-attention/10 text-attention" : "bg-accent text-accent-ink"
      )}>
        <Sparkles className="size-3.5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-ink">
          <strong className="text-ink font-semibold">{t("chat.aiOutput")}</strong>
          <span aria-hidden="true" className="text-quiet">·</span>
          <time dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
        </div>
        <div className="text-[13.5px] leading-relaxed text-ink">
          <Suspense fallback={<p className="text-xs text-muted-ink animate-pulse">{t("chat.rendering")}</p>}>
            <MarkdownOutput markdown={message.content} />
          </Suspense>
        </div>
      </div>
    </article>
  );
}

export function ConversationEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="grid max-w-sm justify-items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-ink"><Sparkles className="size-5" /></span>
        <h3 className="text-sm font-semibold text-ink mt-2">{t("chat.emptyTitle")}</h3>
        <p className="text-xs text-muted-ink leading-relaxed px-4">{t("chat.emptyBody")}</p>
      </div>
    </div>
  );
}

export function PendingMessage() {
  return (
    <article className="self-start flex gap-3.5 w-full animate-pulse">
      <div className="flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-accent text-accent-ink"><LoaderCircle className="size-3.5 animate-spin" /></div>
      <div className="flex-1 py-1">
        <p className="text-xs text-muted-ink leading-relaxed font-medium">{t("chat.pending")}</p>
      </div>
    </article>
  );
}
