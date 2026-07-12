import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil, X } from "@/components/health-icons";
import type { Challenge } from "@/dashboard-model";
import { t } from "@/i18n";
import type { DashboardController } from "@/use-dashboard-controller";

const blank = (): Omit<Challenge, "id" | "createdAt" | "completed"> => ({
  title: "",
  description: "",
  measure: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
});

export default function ChallengesPage({ controller }: { controller: DashboardController }) {
  const [draft, setDraft] = useState(blank);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const challenges = controller.userState.challenges;
  const activeCount = challenges.filter((challenge) => !challenge.completed && challenge.endDate >= today()).length;

  useEffect(() => {
    if (!editingId) setDraft(blank());
  }, [editingId]);

  function edit(challenge: Challenge): void {
    setEditingId(challenge.id);
    setDraft({ title: challenge.title, description: challenge.description, measure: challenge.measure, startDate: challenge.startDate, endDate: challenge.endDate });
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const saved = await controller.saveChallenge(draft, editingId || undefined);
    if (!saved) {
      setError(t("challenges.validation"));
      return;
    }
    setDraft(blank());
    setEditingId("");
    setError("");
  }

  return (
    <div className="mx-auto grid w-full max-w-[1040px] gap-8 px-8 py-7 max-[880px]:px-5">
      <header className="grid gap-2 border-b border-border/55 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1.5">
            <h1 className="text-xl font-semibold tracking-[-0.02em]">{t("challenges.title")}</h1>
            <p className="max-w-[66ch] text-sm leading-relaxed text-muted-ink">{t("challenges.description")}</p>
          </div>
          <span className="text-xs font-medium text-muted-ink">{t("challenges.activeCount", { count: activeCount })}</span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t(editingId ? "challenges.editTitle" : "challenges.newTitle")}</CardTitle>
            <CardDescription>{t("challenges.formDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
              <Field>
                <FieldLabel htmlFor="challenge-title">{t("challenges.name")}</FieldLabel>
                <Input id="challenge-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={t("challenges.namePlaceholder")} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="challenge-measure">{t("challenges.measure")}</FieldLabel>
                <Input id="challenge-measure" value={draft.measure} onChange={(event) => setDraft({ ...draft, measure: event.target.value })} placeholder={t("challenges.measurePlaceholder")} />
                <FieldDescription>{t("challenges.measureDescription")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="challenge-description">{t("challenges.notes")}</FieldLabel>
                <Textarea id="challenge-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder={t("challenges.notesPlaceholder")} />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-3">
                <Field><FieldLabel htmlFor="challenge-start">{t("challenges.startDate")}</FieldLabel><Input id="challenge-start" type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} required /></Field>
                <Field><FieldLabel htmlFor="challenge-end">{t("challenges.endDate")}</FieldLabel><Input id="challenge-end" type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} required /></Field>
              </FieldGroup>
              {error ? <p className="text-xs leading-relaxed text-attention" role="alert">{error}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                {editingId ? <Button type="button" variant="ghost" onClick={() => { setEditingId(""); setError(""); }}>{t("common.cancel")}</Button> : null}
                <Button type="submit">{t(editingId ? "challenges.update" : "challenges.save")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="grid content-start gap-3" aria-labelledby="challenge-list-title">
          <div className="flex items-center justify-between gap-3 border-b border-border/55 pb-3">
            <div><h2 className="text-sm font-semibold" id="challenge-list-title">{t("challenges.listTitle")}</h2><p className="mt-1 text-xs leading-relaxed text-muted-ink">{t("challenges.listDescription")}</p></div>
            <span className="text-xs text-muted-ink">{t("challenges.totalCount", { count: challenges.length })}</span>
          </div>
          {challenges.length === 0 ? <div className="grid min-h-48 place-items-center border-y border-dashed border-border px-6 text-center"><div className="grid max-w-sm gap-2"><h3 className="text-sm font-semibold">{t("challenges.emptyTitle")}</h3><p className="text-sm leading-relaxed text-muted-ink">{t("challenges.emptyDescription")}</p></div></div> : challenges.map((challenge) => <ChallengeRow challenge={challenge} controller={controller} key={challenge.id} onEdit={edit} />)}
        </section>
      </div>
    </div>
  );
}

function ChallengeRow({ challenge, controller, onEdit }: { challenge: Challenge; controller: DashboardController; onEdit: (challenge: Challenge) => void }) {
  return (
    <article className="grid gap-3 border-b border-border/55 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
      <button aria-label={t("challenges.toggle", { title: challenge.title })} aria-pressed={challenge.completed} className="mt-0.5 grid size-5 place-items-center rounded-full border border-border text-transparent transition-colors hover:border-primary data-[completed=true]:border-normal data-[completed=true]:bg-normal data-[completed=true]:text-canvas" data-completed={challenge.completed} onClick={() => void controller.toggleChallenge(challenge.id)} type="button"><Check className="size-3" /></button>
      <div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><h3 className={challenge.completed ? "text-sm font-semibold line-through text-muted-ink" : "text-sm font-semibold"}>{challenge.title}</h3><span className="text-xs text-muted-ink">{challenge.startDate} → {challenge.endDate}</span></div>{challenge.measure ? <p className="mt-1 text-sm leading-relaxed text-ink">{challenge.measure}</p> : null}{challenge.description ? <p className="mt-1 text-xs leading-relaxed text-muted-ink">{challenge.description}</p> : null}</div>
      <div className="flex gap-1 sm:justify-self-end"><Button aria-label={t("challenges.edit", { title: challenge.title })} onClick={() => onEdit(challenge)} size="icon-sm" type="button" variant="ghost"><Pencil /></Button><Button aria-label={t("challenges.delete", { title: challenge.title })} onClick={() => { if (window.confirm(t("challenges.deleteConfirm"))) void controller.deleteChallenge(challenge.id); }} size="icon-sm" type="button" variant="ghost"><X /></Button></div>
    </article>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
