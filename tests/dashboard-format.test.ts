import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, formatDate } from "../src/dashboard-format";

test("formatDate renders valid ISO dates", () => {
  assert.match(formatDate("2026-07-08"), /2026/);
});

test("formatDate does not echo invalid raw input into HTML", () => {
  assert.equal(formatDate("<img src=x onerror=alert(1)>"), "Invalid date");
  assert.equal(formatDate("2026-13-08"), "Invalid date");
});

test("escapeHtml escapes text used in rendered HTML", () => {
  assert.equal(escapeHtml("<b>LDL</b>"), "&lt;b&gt;LDL&lt;/b&gt;");
});
