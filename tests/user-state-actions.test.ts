import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUserState, type DialogKey, type UserState } from "../src/dashboard-model";
import { makeBodyNoteActions } from "../src/use-body-notes";
import { makeFastingActions } from "../src/use-fasting-actions";
import { makeUserStateActions } from "../src/use-user-state-actions";

function stateHarness(initial: Partial<UserState>) {
  let state = normalizeUserState(initial);
  return {
    get: () => state,
    set: (next: UserState) => { state = next; },
    persist: async () => false,
  };
}

test("user-state record actions delete daily logs and Apple Health summaries", async () => {
  const harness = stateHarness({
    activityEntries: [{ id: "activity-1", loggedAt: "2026-07-10", cigarettes: 0, drinks: 0, activityName: "Walk", durationMinutes: 20, notes: "" }],
    appleHealthImports: [{ id: "import-1", sourceName: "export.xml", importedAt: "2026-07-10T00:00:00Z", recordCount: 10, workoutCount: 1, startedAt: "2026-07-01", endedAt: "2026-07-10" }],
  });
  const actions = makeUserStateActions({
    activityDraft: null,
    getUserState: harness.get,
    persistUserState: harness.persist,
    setActiveDialog: () => undefined,
    setActivityDraft: () => undefined,
    setUserState: harness.set,
  });

  await actions.deleteActivity("activity-1");
  await actions.deleteAppleHealthImport("import-1");

  assert.deepEqual(harness.get().activityEntries, []);
  assert.deepEqual(harness.get().appleHealthImports, []);
});

test("body-note actions update and delete the selected note", async () => {
  const note = { id: "note-1", area: "Chest, front view", angle: 0, x: 50, y: 40, note: "Before", createdAt: "2026-07-10T00:00:00Z" };
  const harness = stateHarness({ bodyNotes: [note] });
  let dialog: DialogKey = "bodyNote";
  const actions = makeBodyNoteActions({
    draft: note,
    getUserState: harness.get,
    persistUserState: harness.persist,
    setActiveDialog: (next) => { dialog = typeof next === "function" ? next(dialog) : next; },
    setDraft: () => undefined,
    setUserState: harness.set,
  });
  const form = new FormData();
  form.set("note", "After");

  await actions.saveBodyNote(form);
  assert.equal(harness.get().bodyNotes[0]?.note, "After");
  assert.equal(dialog, null);

  await actions.deleteBodyNote("note-1");
  assert.deepEqual(harness.get().bodyNotes, []);
});

test("fasting actions delete a completed local session", async () => {
  const harness = stateHarness({
    fasting: { activeStartedAt: "", targetHours: 16, sessions: [{ id: "fast-1", startedAt: "2026-07-09T00:00:00Z", endedAt: "2026-07-09T16:00:00Z", targetHours: 16 }] },
  });
  const actions = makeFastingActions({ getUserState: harness.get, persistUserState: harness.persist, setUserState: harness.set });

  await actions.deleteFastingSession("fast-1");

  assert.deepEqual(harness.get().fasting.sessions, []);
});
