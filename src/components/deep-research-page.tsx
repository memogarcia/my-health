import { useMemo, useState } from "react";
import { FileSearch, Plus, Sparkles, Trash2 } from "lucide-react";
import { getAiProvider, hasEnabledAiModel } from "@/ai-sdk-config";
import { getActiveAiConversation } from "@/ai-conversation";
import { buildDeepResearchBrief, buildDeepResearchPrompt, type ResearchDepth } from "@/deep-research";
import { t } from "@/i18n";
import type { DashboardController } from "@/use-dashboard-controller";
import { Button } from "@/components/ui/button";
import { MarkdownOutput } from "@/components/markdown-output";
import { PromptComposer } from "@/components/prompt-composer";

const examples = [
  "research.example.trends",
  "research.example.preparation",
  "research.example.patterns",
] as const;

export function ResearchPage({ controller }: { controller: DashboardController }) {
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState<ResearchDepth>("comprehensive");
  const [startingFresh, setStartingFresh] = useState(false);
  const brief = useMemo(
    () => buildDeepResearchBrief(controller.display, controller.userState),
    [controller.display, controller.userState],
  );
  const activeConversation = getActiveAiConversation(controller.userState);
  const researchConversations = controller.userState.aiConversations.filter((entry) => entry.mode === "research");
  const conversation = !startingFresh && activeConversation?.mode === "research" ? activeConversation : null;
  const report = conversation?.messages.filter((message) => message.role === "assistant").at(-1);
  const pending = Boolean(controller.aiPendingConversationId);
  const available = hasEnabledAiModel(controller.aiSettings);
  const provider = getAiProvider(controller.aiSettings.providerId);
  const reportProvider = report ? getAiProvider(report.providerId) : provider;

  function startNewResearch(): void {
    controller.startAiConversation();
    controller.setSelectedNav("research");
    setQuestion("");
    setStartingFresh(true);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-canvas">
      <header className="flex shrink-0 items-start justify-between gap-5 px-8 pb-5 pt-7 max-[880px]:px-5">
        <div>
          <h1 className="text-[1.35rem] font-semibold tracking-[-0.025em] text-ink">{t("research.title")}</h1>
          <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-muted-ink">{t("research.description")}</p>
        </div>
        {conversation ? (
          <Button disabled={pending} onClick={startNewResearch} type="button" variant="outline"><Plus />{t("research.new")}</Button>
        ) : null}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px] border-t border-border/55 max-[1040px]:grid-cols-[minmax(0,1fr)_220px] max-[880px]:grid-cols-1">
        <section className="min-h-0 overflow-y-auto px-8 py-7 max-[880px]:px-5" aria-label={t("research.title")}>
          {report ? (
            <article className="mx-auto grid w-full max-w-[820px] gap-5">
              <header className="border-b border-border/55 pb-5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-ink">
                  <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                  {reportProvider.label}
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-ink">{researchTitle(conversation?.messages[0]?.content)}</h2>
                <p className="mt-1 text-xs text-muted-ink">{t("research.savedWithChat")}</p>
              </header>
              <div className={report.isError ? "rounded-xl bg-attention/8 p-4 text-attention" : ""}>
                <MarkdownOutput markdown={report.content} />
              </div>
            </article>
          ) : pending ? (
            <div className="mx-auto grid min-h-[420px] max-w-[620px] place-items-center content-center text-center">
              <span className="grid size-12 place-items-center rounded-xl bg-accent text-accent-ink"><Sparkles className="size-5 animate-pulse" /></span>
              <h2 className="mt-4 text-base font-semibold text-ink">{t("research.workingTitle")}</h2>
              <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-muted-ink">{t("research.workingDescription")}</p>
            </div>
          ) : (
            <div className="mx-auto grid min-h-[420px] max-w-[680px] content-center">
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-ink"><FileSearch className="size-5" /></span>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-ink">{t("research.emptyTitle")}</h2>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-ink">{t("research.emptyDescription")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {examples.map((key) => (
                  <button className="rounded-lg bg-secondary px-3 py-2 text-left text-xs font-medium text-muted-ink transition-colors hover:bg-accent hover:text-accent-ink" key={key} onClick={() => setQuestion(t(key))} type="button">
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-border/55 px-5 py-6 max-[880px]:max-h-[210px] max-[880px]:border-l-0 max-[880px]:border-t" aria-label={t("research.scope")}>
          <h2 className="text-sm font-semibold text-ink">{t("research.scope")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-ink">{t("research.scopeDescription", { count: brief.totalRecords })}</p>
          <dl className="mt-5 grid gap-0 border-y border-border/55">
            {brief.coverage.map((item) => (
              <div className="flex items-center justify-between gap-3 border-b border-border/45 py-2.5 last:border-b-0" key={item.key}>
                <dt className="text-xs text-muted-ink">{item.label}</dt>
                <dd className="m-0 text-xs font-semibold tabular-nums text-ink">{item.count}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 grid gap-2">
            <span className="text-xs font-semibold text-ink">{t("research.depth")}</span>
            <div className="grid grid-cols-2 rounded-lg bg-secondary p-1" role="group" aria-label={t("research.depth")}>
              {(["focused", "comprehensive"] as const).map((value) => (
                <button aria-pressed={depth === value} className="min-h-7 rounded-md px-2 text-[11px] font-semibold text-muted-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[var(--elev-1)]" key={value} onClick={() => setDepth(value)} type="button">
                  {t(`research.depth.${value}`)}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted-ink">{t("research.privacy")}</p>
          {researchConversations.length ? (
            <div className="mt-6 border-t border-border/55 pt-5">
              <h2 className="text-xs font-semibold text-ink">{t("research.history")}</h2>
              <div className="mt-2 grid gap-1">
                {researchConversations.map((entry) => (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1" key={entry.id}>
                    <button
                      aria-pressed={entry.id === conversation?.id}
                      className="truncate rounded-md px-2 py-1.5 text-left text-xs text-muted-ink transition-colors hover:bg-secondary hover:text-ink aria-pressed:bg-secondary aria-pressed:text-ink"
                      onClick={() => {
                        setStartingFresh(false);
                        controller.selectAiConversation(entry.id);
                      }}
                      type="button"
                    >
                      {entry.title}
                    </button>
                    <Button
                      aria-label={t("research.deleteReport", { title: entry.title })}
                      disabled={Boolean(controller.aiPendingConversationId)}
                      onClick={() => {
                        if (window.confirm(t("research.deleteConfirm"))) void controller.deleteAiConversation(entry.id);
                      }}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    ><Trash2 /></Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="shrink-0 border-t border-border/55 bg-canvas px-6 py-4">
        <PromptComposer
          ariaLabel={t("research.questionLabel")}
          available={available}
          onOpenSettings={() => controller.setSelectedNav("settings")}
          onSubmit={(value) => {
            setQuestion("");
            setStartingFresh(false);
            void controller.submitDeepResearch(buildDeepResearchPrompt(value, depth));
          }}
          onValueChange={setQuestion}
          pending={pending}
          pendingLabel={t("research.starting")}
          placeholder={t("research.placeholder")}
          providerLabel={provider.label}
          settingsLabel={t("settings.ai.open")}
          setupMessage={t("research.setupRequired")}
          submitLabel={t("research.start")}
          value={question}
        />
      </footer>
    </div>
  );
}

function researchTitle(prompt = ""): string {
  return prompt.split("\n")[0]?.replace(/^Research question:\s*/u, "") || t("research.reportTitle");
}
