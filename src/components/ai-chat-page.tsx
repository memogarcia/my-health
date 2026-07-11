import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAiProvider, hasEnabledAiModel } from "../ai-sdk-config";
import { getActiveAiConversation } from "../ai-conversation";
import type { AiConversation } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { ConversationEmpty, ConversationMessage, PendingMessage } from "./ai-chat-message";
import { PromptComposer } from "./prompt-composer";

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
    <aside className="flex min-h-0 flex-col border-r border-border/80 bg-canvas">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/65 px-4">
        <div className="flex min-w-0 flex-col pr-2">
          <h2 className="truncate text-xs font-semibold text-ink">{t("chat.conversations")}</h2>
          <span className="mt-1 truncate text-[10px] leading-none text-muted-ink">
            {t(count === 1 ? "chat.savedThread" : "chat.savedThreads", { count })}
          </span>
        </div>
        <Button
          aria-label={t("chat.new")}
          className="shrink-0"
          disabled={Boolean(controller.aiPendingConversationId)}
          onClick={controller.startAiConversation}
          size="icon-sm"
          title={t("chat.new")}
          type="button"
          variant="ghost"
        >
          <Plus />
        </Button>
      </header>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {count ? controller.userState.aiConversations.map((conversation) => (
          <ThreadRow
            active={conversation.id === activeConversation?.id}
            controller={controller}
            conversation={conversation}
            key={conversation.id}
          />
        )) : <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted-ink">{t("chat.none")}</p>}
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
        className="flex items-center gap-1 rounded-lg border border-border/60 bg-surface-soft p-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) void controller.renameAiConversation(conversation.id, title).then((saved) => saved && setEditing(false));
        }}
      >
        <Input
          aria-label={t("chat.renameLabel")}
          autoFocus
          className="h-7 min-w-0 flex-1 bg-surface px-2 text-xs"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          value={title}
        />
        <Button aria-label={t("chat.saveName")} disabled={!title.trim()} size="icon-sm" type="submit" variant="secondary"><Check /></Button>
        <Button
          aria-label={t("common.cancel")}
          onClick={() => { setTitle(conversation.title); setEditing(false); }}
          size="icon-sm"
          type="button"
          variant="ghost"
        ><X /></Button>
      </form>
    );
  }

  return (
    <div className={cn(
      "group relative flex items-center justify-between rounded-lg border border-transparent transition-colors duration-[var(--dur-feedback)]",
      active ? "border-border/55 bg-surface shadow-[var(--elev-1)]" : "hover:bg-secondary/60",
    )}>
      <button
        aria-pressed={active}
        className="min-w-0 flex-1 px-3 py-2.5 text-left"
        onClick={() => controller.selectAiConversation(conversation.id)}
        type="button"
      >
        <strong className="block truncate text-xs font-semibold leading-tight text-ink">{conversation.title || t("chat.untitled")}</strong>
        <span className="mt-1 block truncate text-[10px] font-normal leading-normal text-muted-ink">{latest?.content || t("chat.noMessages")}</span>
      </button>
      <div className={cn(
        "absolute right-1.5 flex items-center gap-0.5 rounded-md bg-surface/95 p-0.5 opacity-0 shadow-[var(--elev-1)] transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
        !active && "bg-secondary/95",
      )}>
        <Button
          aria-label={t("chat.renameConversation", { title: conversation.title })}
          disabled={pending}
          onClick={(event) => { event.stopPropagation(); setEditing(true); }}
          size="icon-xs"
          type="button"
          variant="ghost"
        ><Pencil /></Button>
        <Button
          aria-label={t("chat.deleteConversation", { title: conversation.title })}
          className="text-attention"
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation();
            if (window.confirm(t("chat.deleteConfirm"))) void controller.deleteAiConversation(conversation.id);
          }}
          size="icon-xs"
          type="button"
          variant="ghost"
        ><Trash2 /></Button>
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
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/65 px-6">
        <div className="flex min-w-0 flex-col pr-4">
          <h1 className="truncate text-sm font-semibold text-ink">{activeConversation ? activeConversation.title : t("chat.askTitle")}</h1>
          <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-ink">{t("chat.description")}</p>
        </div>
        {hasEnabledAiModel(controller.aiSettings) ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/55 px-2 py-0.5 text-[10px] font-medium text-muted-ink">
            <Sparkles className="size-3 text-primary" aria-hidden="true" />
            {getAiProvider(controller.aiSettings.providerId).label}
          </span>
        ) : null}
      </header>
      <div className="min-h-0 w-full flex-1 overflow-y-auto px-6 py-6" ref={viewportRef}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6" role="log" aria-live="polite" aria-relevant="additions text">
          {activeConversation && messageCount ? activeConversation.messages.map((message) => (
            <ConversationMessage message={message} key={message.id} />
          )) : <ConversationEmpty />}
          {pending ? <PendingMessage /> : null}
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
  const provider = getAiProvider(controller.aiSettings.providerId);

  return (
    <div className="shrink-0 border-t border-border/45 bg-canvas p-4">
      <PromptComposer
        ariaLabel={configured ? t("chat.placeholder") : t("chat.setupPlaceholder")}
        available={configured}
        onOpenSettings={() => controller.setSelectedNav("settings")}
        onSubmit={(value) => {
          setPrompt("");
          void controller.submitAiPrompt(value);
        }}
        onValueChange={setPrompt}
        pending={pending}
        pendingLabel={t("common.sending")}
        placeholder={configured ? t("chat.placeholder") : t("chat.setupPlaceholder")}
        providerLabel={provider.label}
        settingsLabel={t("settings.ai.open")}
        setupMessage={t("chat.setupRequired")}
        submitLabel={t("common.send")}
        value={prompt}
      />
    </div>
  );
}
