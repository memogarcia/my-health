import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Trash2, X, Plus, Send, Sparkles, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasEnabledAiModel, getAiProvider } from "../ai-sdk-config";
import { getActiveAiConversation } from "../ai-conversation";
import { ConversationEmpty, ConversationMessage, PendingMessage } from "./ai-chat-message";
import type { AiConversation } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";

export function AiChatPage({ controller }: { controller: DashboardController }) {
  const active = getActiveAiConversation(controller.userState);
  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[228px_minmax(0,1fr)] bg-canvas max-[1040px]:grid-cols-[200px_minmax(0,1fr)] max-[880px]:grid-cols-[174px_minmax(0,1fr)]">
      <ThreadRail controller={controller} activeConversation={active} />
      <ConversationPanel controller={controller} activeConversation={active} />
    </div>
  );
}

function ThreadRail({ controller, activeConversation }: { controller: DashboardController; activeConversation: AiConversation | null }) {
  const count = controller.userState.aiConversations.length;
  return (
    <aside className="flex min-h-0 flex-col bg-canvas border-r border-border/80">
      <header className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-border/80">
        <div className="flex flex-col min-w-0 pr-2">
          <h2 className="text-xs font-semibold text-ink truncate">{t("chat.conversations")}</h2>
          <span className="text-[10px] text-muted-ink truncate leading-none mt-1">
            {t(count === 1 ? "chat.savedThread" : "chat.savedThreads", { count })}
          </span>
        </div>
        <Button
          type="button" variant="ghost" size="icon" title={t("chat.new")}
          className="h-7 w-7 rounded-md hover:bg-surface-soft text-ink border border-border/40 bg-surface/50 shadow-sm shrink-0"
          disabled={Boolean(controller.aiPendingConversationId)} onClick={controller.startAiConversation}
        >
          <Plus className="size-4" />
        </Button>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {count ? controller.userState.aiConversations.map((c) => (
          <ThreadRow controller={controller} conversation={c} active={c.id === activeConversation?.id} key={c.id} />
        )) : <p className="px-3 py-6 text-xs text-muted-ink text-center leading-relaxed">{t("chat.none")}</p>}
      </div>
    </aside>
  );
}

function ThreadRow({ controller, conversation, active }: { controller: DashboardController; conversation: AiConversation; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const pending = controller.aiPendingConversationId === "pending" || controller.aiPendingConversationId === conversation.id;
  const latest = conversation.messages.at(-1);

  if (editing) {
    return (
      <form
        className="flex items-center gap-1 p-1 bg-surface-soft rounded-lg border border-border/40"
        onSubmit={(e) => { e.preventDefault(); if (title.trim()) void controller.renameAiConversation(conversation.id, title).then((s) => s && setEditing(false)); }}
      >
        <Input
          aria-label={t("chat.renameLabel")} autoFocus maxLength={120} value={title}
          onChange={(e) => setTitle(e.target.value)} onFocus={(e) => e.currentTarget.select()}
          className="h-7 text-xs bg-surface border-border/80 focus-visible:ring-1 focus-visible:ring-ring flex-1 min-w-0 px-2"
        />
        <Button aria-label={t("chat.saveName")} disabled={!title.trim()} size="icon" type="submit" variant="secondary" className="h-7 w-7 shrink-0"><Check className="size-3.5" /></Button>
        <Button aria-label={t("common.cancel")} onClick={() => { setTitle(conversation.title); setEditing(false); }} size="icon" type="button" variant="ghost" className="h-7 w-7 shrink-0 text-muted-ink hover:text-ink"><X className="size-3.5" /></Button>
      </form>
    );
  }

  return (
    <div className={cn(
      "group relative flex items-center justify-between rounded-lg transition-all duration-150 border border-transparent",
      active ? "bg-surface shadow-[0_1px_2px_oklch(0.2_0.03_310/0.06)] border-border/50" : "hover:bg-surface-soft/60"
    )}>
      <button
        aria-pressed={active} className="flex-1 min-w-0 px-3 py-2.5 text-left"
        onClick={() => controller.selectAiConversation(conversation.id)} type="button"
      >
        <strong className="block truncate text-xs font-semibold text-ink leading-tight">{conversation.title || t("chat.untitled")}</strong>
        <span className="block truncate text-[10px] text-muted-ink mt-1 font-normal leading-normal">{latest?.content || t("chat.noMessages")}</span>
      </button>
      <div className={cn(
        "absolute right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pl-4 py-1.5 rounded-r-lg",
        active ? "bg-gradient-to-l from-surface via-surface to-transparent" : "bg-gradient-to-l from-canvas via-canvas to-transparent group-hover:from-surface-soft/60 group-hover:via-surface-soft/60"
      )}>
        <Button
          aria-label={t("chat.renameConversation", { title: conversation.title })} disabled={pending}
          onClick={(e) => { e.stopPropagation(); setEditing(true); }} size="icon" type="button" variant="ghost"
          className="h-6 w-6 text-muted-ink hover:text-ink hover:bg-surface-soft rounded"
        >
          <Pencil className="size-3" />
        </Button>
        <Button
          aria-label={t("chat.deleteConversation", { title: conversation.title })} disabled={pending}
          onClick={(e) => { e.stopPropagation(); if (window.confirm(t("chat.deleteConfirm"))) void controller.deleteAiConversation(conversation.id); }}
          size="icon" type="button" variant="ghost" className="h-6 w-6 text-muted-ink hover:text-attention hover:bg-attention/10 rounded"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function ConversationPanel({ controller, activeConversation }: { controller: DashboardController; activeConversation: AiConversation | null }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const messageCount = activeConversation?.messages.length || 0;
  const pending = Boolean(controller.aiPendingConversationId);

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [messageCount, pending, activeConversation?.id]);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center justify-between px-6 border-b border-border/80 bg-canvas">
        <div className="flex flex-col min-w-0 pr-4">
          <h1 className="text-sm font-semibold text-ink truncate">{activeConversation ? activeConversation.title : t("chat.askTitle")}</h1>
          <p className="text-[10px] text-muted-ink truncate leading-tight mt-0.5">{t("chat.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasEnabledAiModel(controller.aiSettings) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft/30 px-2 py-0.5 text-[10px] font-medium text-accent border border-accent/20">
              <Sparkles className="size-3 text-accent" />
              {getAiProvider(controller.aiSettings.providerId).label}
            </span>
          )}
          <Button
            type="button" size="sm" variant="ghost"
            className="h-7 text-xs text-muted-ink hover:text-ink hover:bg-surface-soft gap-1 px-2.5 border border-border/60 rounded-md"
            onClick={() => controller.setSelectedNav("settings")}
          >
            {t("settings.ai.open")}
          </Button>
        </div>
      </header>
      <div className="flex-1 min-h-0 w-full overflow-y-auto px-6 py-6" ref={viewportRef}>
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-6" role="log" aria-live="polite" aria-relevant="additions text">
          {activeConversation && messageCount ? activeConversation.messages.map((m) => (
            <ConversationMessage message={m} key={m.id} />
          )) : <ConversationEmpty />}
          {pending && <PendingMessage />}
        </div>
      </div>
      <ConversationComposer controller={controller} />
    </section>
  );
}



function ConversationComposer({ controller }: { controller: DashboardController }) {
  const [prompt, setPrompt] = useState("");
  const configured = hasEnabledAiModel(controller.aiSettings);
  const pending = Boolean(controller.aiPendingConversationId);
  const inputDisabled = pending || !configured;
  const sendDisabled = inputDisabled || !prompt.trim();
  const provider = getAiProvider(controller.aiSettings.providerId);

  return (
    <div className="shrink-0 p-4 bg-canvas border-t border-border/40">
      <div className="mx-auto w-full max-w-3xl">
        <form
          onSubmit={(e) => { e.preventDefault(); if (!sendDisabled) { void controller.submitAiPrompt(prompt); setPrompt(""); } }}
          className="flex flex-col rounded-xl border border-border/60 bg-surface shadow-sm focus-within:border-border/85 focus-within:ring-1 focus-within:ring-ring transition-all"
        >
          <Textarea
            aria-label={configured ? t("chat.placeholder") : t("chat.setupPlaceholder")}
            disabled={inputDisabled} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            placeholder={configured ? t("chat.placeholder") : t("chat.setupPlaceholder")}
            rows={2} value={prompt}
            className="min-h-[56px] max-h-36 resize-none border-0 bg-transparent px-4 py-3 text-sm text-ink placeholder:text-quiet/80 focus-visible:ring-0 focus-visible:outline-none shadow-none"
          />
          <div className="flex items-center justify-between border-t border-border/30 px-3 py-2 bg-surface-soft/20 rounded-b-xl">
            <div className="flex-1 min-w-0 pr-4">
              {!configured ? (
                <p className="text-[10px] text-attention font-medium truncate" id="chat-ai-availability">{t("chat.setupRequired")}</p>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-ink">
                  <Sparkles className="size-3 text-accent" />
                  {provider.label}
                </span>
              )}
            </div>
            <Button
              type="submit" disabled={sendDisabled} size="sm"
              className="h-7 gap-1.5 px-3 bg-primary hover:bg-accent-strong text-primary-foreground rounded-md shadow-sm transition-colors text-xs font-medium"
            >
              {pending ? <LoaderCircle className="size-3 animate-spin" /> : <Send className="size-3" />}
              {pending ? t("common.sending") : t("common.send")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


