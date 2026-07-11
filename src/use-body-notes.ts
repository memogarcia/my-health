import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { normalizeUserState, type BodyNote, type DialogKey, type UserState } from "./dashboard-model";
import { t } from "./i18n";
import { bodyNoteFromForm } from "./user-state";

export type BodyNoteDraft = Omit<BodyNote, "id" | "note" | "createdAt"> & Partial<Pick<BodyNote, "id" | "note" | "createdAt">>;

export function makeBodyNoteActions({ draft, setDraft, setActiveDialog, getUserState, setUserState, persistUserState }: { draft: BodyNoteDraft | null; setDraft: Dispatch<SetStateAction<BodyNoteDraft | null>>; setActiveDialog: Dispatch<SetStateAction<DialogKey>>; getUserState: () => UserState; setUserState: (state: UserState) => void; persistUserState: (state: UserState) => Promise<boolean> }) {
  function openBodyNote(next: BodyNoteDraft): void { setDraft(next); setActiveDialog("bodyNote"); }
  function editBodyNote(note: BodyNote): void { setDraft(note); setActiveDialog("bodyNote"); }
  async function saveBodyNote(form: FormData): Promise<void> {
    if (!draft) return;
    const note = draft.id
      ? { ...draft, id: draft.id, note: String(form.get("note") || "").trim(), createdAt: draft.createdAt || new Date().toISOString() } as BodyNote
      : bodyNoteFromForm(form, draft);
    if (!note.note) return;
    const current = getUserState();
    const bodyNotes = draft.id
      ? current.bodyNotes.map((entry) => entry.id === draft.id ? note : entry)
      : [note, ...current.bodyNotes].slice(0, 120);
    const next = normalizeUserState({ ...current, bodyNotes });
    setUserState(next); setDraft(null); setActiveDialog(null);
    if (await persistUserState(next)) toast.success(t(draft.id ? "toast.bodyNoteUpdated" : "toast.bodyNoteSaved"));
  }
  async function deleteBodyNote(id: string): Promise<void> {
    const current = getUserState();
    if (!current.bodyNotes.some((entry) => entry.id === id)) return;
    const next = normalizeUserState({ ...current, bodyNotes: current.bodyNotes.filter((entry) => entry.id !== id) });
    setUserState(next); setDraft(null); setActiveDialog(null);
    if (await persistUserState(next)) toast.success(t("toast.bodyNoteDeleted"));
  }
  return { deleteBodyNote, editBodyNote, openBodyNote, saveBodyNote };
}
