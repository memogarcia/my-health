import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasEnabledCodexModel } from "../ai-sdk-config";
import { getActiveAiConversation } from "../ai-conversation";
import { formatDate } from "../dashboard-format";
import type { AiConversation, AiConversationMessage } from "../dashboard-model";
import { resultDocumentAccept } from "../document-intake";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { FileText, LoaderCircle, Plus, Send, Sparkles } from "./health-icons";

const MarkdownOutput = lazy(() => import("./markdown-output").then((module) => ({ default: module.MarkdownOutput })));

export function AiChatPage({ controller }: { controller: DashboardController }) {
  const activeConversation = getActiveAiConversation(controller.userState);
  return (
    <section className="chat-layout">
      <ThreadRail controller={controller} activeConversation={activeConversation} />
      <ConversationPanel controller={controller} activeConversation={activeConversation} />
    </section>
  );
}

function ThreadRail({ controller, activeConversation }: { controller: DashboardController; activeConversation: AiConversation | null }) {
  const count = controller.userState.aiConversations.length;
  return (
    <Card className="min-h-0">
      <CardHeader>
        <CardTitle>{t("chat.conversations")}</CardTitle>
        <CardDescription>{t(count === 1 ? "chat.savedThread" : "chat.savedThreads", { count })}</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(controller.aiPendingConversationId)}
            onClick={controller.startAiConversation}
          >
            <Plus data-icon="inline-start" />
            {t("chat.new")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <ScrollArea className="chat-scroll h-full pr-2">
          <div className="grid gap-1.5">
            {count ? controller.userState.aiConversations.map((conversation) => (
              <ThreadButton controller={controller} conversation={conversation} active={conversation.id === activeConversation?.id} key={conversation.id} />
            )) : <p className="px-1 text-sm text-muted-foreground">{t("chat.none")}</p>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ThreadButton({ controller, conversation, active }: { controller: DashboardController; conversation: AiConversation; active: boolean }) {
  const latest = conversation.messages.at(-1);
  return (
    <Button
      aria-pressed={active}
      className="h-auto justify-start px-3 py-2 text-left"
      variant={active ? "secondary" : "ghost"}
      onClick={() => controller.selectAiConversation(conversation.id)}
      type="button"
    >
      <span className="min-w-0">
        <strong className="block truncate">{conversation.title || t("chat.untitled")}</strong>
        <span className="block truncate text-xs font-normal text-muted-foreground">{latest?.content || t("chat.noMessages")}</span>
      </span>
    </Button>
  );
}

function ConversationPanel({ controller, activeConversation }: { controller: DashboardController; activeConversation: AiConversation | null }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const messageCount = activeConversation?.messages.length || 0;
  const pending = Boolean(controller.aiPendingConversationId);

  useEffect(() => {
    const viewport = viewportRef.current?.querySelector("[data-slot=scroll-area-viewport]");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messageCount, pending, activeConversation?.id]);

  return (
    <Card className="min-h-0">
      <CardHeader>
        <CardTitle>{activeConversation ? activeConversation.title : t("chat.askTitle")}</CardTitle>
        <CardDescription>{t("chat.description")}</CardDescription>
        <CardAction>
          <Button type="button" size="sm" variant="outline" onClick={() => controller.setSelectedNav("settings")}>
            {t("settings.ai.open")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="min-h-0 flex-1" ref={viewportRef}>
          <ScrollArea className="chat-scroll h-full rounded-lg border border-border bg-background p-4">
            <div className="grid gap-3" role="log" aria-live="polite" aria-relevant="additions text">
              {activeConversation && messageCount ? activeConversation.messages.map((message) => <ConversationMessage message={message} key={message.id} />) : <ConversationEmpty />}
              {pending ? <PendingMessage /> : null}
            </div>
          </ScrollArea>
        </div>
        <ConversationComposer controller={controller} />
      </CardContent>
    </Card>
  );
}

function ConversationMessage({ message }: { message: AiConversationMessage }) {
  if (message.role === "user") {
    return (
      <div className="grid justify-items-end gap-1">
        <article className="chat-message user">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </article>
        <time className="text-xs text-muted-foreground" dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
      </div>
    );
  }
  return (
    <article className={cn("chat-message assistant", message.isError && "error")}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        <strong>{t("chat.aiOutput")}</strong>
        <span aria-hidden="true">·</span>
        <time dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t("chat.rendering")}</p>}>
        <MarkdownOutput markdown={message.content} />
      </Suspense>
    </article>
  );
}

function ConversationComposer({ controller }: { controller: DashboardController }) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState(null as File | null);
  const fileInputRef = useRef(null as HTMLInputElement | null);
  const configured = hasEnabledCodexModel(controller.aiSettings);
  const pending = Boolean(controller.aiPendingConversationId);
  const inputDisabled = pending || !configured;
  const sendDisabled = inputDisabled || (!prompt.trim() && !file);
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (sendDisabled) return;
      void controller.submitAiPrompt(prompt, file || undefined);
      if (!file) setPrompt("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
      {!configured ? (
        <div className="col-span-full flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/35 px-3 py-2">
          <p className="text-sm text-muted-foreground" id="chat-ai-availability">{t("chat.setupRequired")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => controller.setSelectedNav("settings")}>
            {t("settings.ai.open")}
          </Button>
        </div>
      ) : null}
      <Textarea
        aria-label={configured ? t("chat.placeholder") : t("chat.setupPlaceholder")}
        aria-describedby={!configured ? "chat-ai-availability" : undefined}
        disabled={inputDisabled}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) event.currentTarget.form?.requestSubmit();
        }}
        placeholder={configured ? t("chat.placeholder") : t("chat.setupPlaceholder")}
        rows={2}
        value={prompt}
      />
      <input
        ref={fileInputRef}
        accept={resultDocumentAccept}
        hidden
        type="file"
        onChange={(event) => setFile(event.currentTarget.files?.[0] || null)}
      />
      <Button type="button" variant={file ? "secondary" : "outline"} size="icon" disabled={inputDisabled} onClick={() => fileInputRef.current?.click()} title={file?.name || t("appShell.attachResultFile")} aria-label={file?.name || t("appShell.attachResultFile")}>
        <FileText />
      </Button>
      <Button type="submit" disabled={sendDisabled} aria-describedby={!configured ? "chat-ai-availability" : undefined}>
        {pending ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />}
        {pending ? t("common.sending") : t("common.send")}
      </Button>
    </form>
  );
}

function ConversationEmpty() {
  return (
    <div className="grid min-h-64 place-items-center text-center text-sm text-muted-foreground">
      <div className="grid max-w-sm justify-items-center gap-2">
        <span className="grid size-10 place-items-center rounded-full bg-accent text-primary"><Sparkles /></span>
        <strong className="text-foreground">{t("chat.emptyTitle")}</strong>
        <p>{t("chat.emptyBody")}</p>
      </div>
    </div>
  );
}

function PendingMessage() {
  return (
    <article className="chat-message assistant pending">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" />{t("chat.pending")}</div>
    </article>
  );
}
