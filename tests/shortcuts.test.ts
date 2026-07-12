import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SHORTCUTS, formatShortcut, isValidShortcut, normalizeShortcuts } from "../src/shortcuts";
import { normalizeUserState } from "../src/dashboard-model";

test("shortcut defaults are portable and validate their modifier shape", () => {
  assert.equal(isValidShortcut(DEFAULT_SHORTCUTS.closeDatabase), true);
  assert.equal(isValidShortcut("Ctrl+L"), false);
  assert.equal(formatShortcut(DEFAULT_SHORTCUTS.settings, true), "⌘ Comma");
  assert.deepEqual(normalizeShortcuts({ lockDatabase: "Mod+Shift+L" }).lockDatabase, "Mod+Shift+L");
});

test("user state keeps bounded challenges and falls back to sane shortcuts", () => {
  const state = normalizeUserState({
    challenges: [{ id: "challenge-1", title: "  Walk  ", measure: "10 minutes", startDate: "2026-07-11", endDate: "2026-07-17", completed: false, createdAt: "2026-07-11T00:00:00.000Z" }],
  });
  assert.equal(state.challenges[0]?.title, "Walk");
  assert.equal(state.shortcuts.overview, "Mod+1");
});
