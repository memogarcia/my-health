import assert from "node:assert/strict";
import test from "node:test";
import { markdownToSafeHtml } from "../src/markdown-output";

test("markdownToSafeHtml removes executable HTML and unsafe attributes", async () => {
  const html = await markdownToSafeHtml("Hello <script>alert(1)</script> <img src=x onerror=alert(2)>");

  assert.match(html, /Hello/u);
  assert.doesNotMatch(html, /<script|onerror/u);
});

test("markdownToSafeHtml preserves common Markdown structure", async () => {
  const html = await markdownToSafeHtml("## Results\n\n- One\n- Two");

  assert.match(html, /<h2>Results<\/h2>/u);
  assert.match(html, /<li>One<\/li>/u);
});
