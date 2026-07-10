import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, formatDate, todayString } from "../src/dashboard-format";

test("todayString uses the local calendar date", () => {
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  assert.equal(todayString(), expected);
});

test("formatDate renders valid ISO dates", () => {
  assert.match(formatDate("2026-07-08"), /2026/);
  assert.match(formatDate("2026-07-08 10:15:00"), /2026/);
});

test("formatDate does not echo invalid raw input into HTML", () => {
  assert.equal(formatDate("<img src=x onerror=alert(1)>"), "Invalid date");
  assert.equal(formatDate("2026-13-08"), "Invalid date");
});

test("escapeHtml escapes text used in rendered HTML", () => {
  assert.equal(escapeHtml("<b>LDL</b>"), "&lt;b&gt;LDL&lt;/b&gt;");
});
