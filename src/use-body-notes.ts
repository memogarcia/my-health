import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { normalizeUserState, type BodyNote, type DialogKey, type UserState } from "./dashboard-model";
import { t } from "./i18n";
import { bodyNoteFromForm } from "./user-state";

export type BodyNoteDraft = Omit<BodyNote, "id" | "note" | "createdAt">;

export function makeBodyNoteActions({ draft, setDraft, setActiveDialog, getUserState, setUserState, persistUserState }: { draft: BodyNoteDraft | null; setDraft: Dispatch<SetStateAction<BodyNoteDraft | null>>; setActiveDialog: Dispatch<SetStateAction<DialogKey>>; getUserState: () => UserState; setUserState: (state: UserState) => void; persistUserState: (state: UserState) => Promise<boolean> }) {
  function openBodyNote(next: BodyNoteDraft): void { setDraft(next); setActiveDialog("bodyNote"); }
  async function addBodyNote(form: FormData): Promise<void> {
    if (!draft) return;
    const note = bodyNoteFromForm(form, draft);
    if (!note.note) return;
    const next = normalizeUserState({ ...getUserState(), bodyNotes: [note, ...getUserState().bodyNotes].slice(0, 120) });
    setUserState(next); setDraft(null); setActiveDialog(null);
    if (await persistUserState(next)) toast.success(t("toast.bodyNoteSaved"));
  }
  return { openBodyNote, addBodyNote };
}
