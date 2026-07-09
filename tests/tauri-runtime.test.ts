import test from "node:test";
import assert from "node:assert/strict";
import { isTauriRuntime } from "../src/tauri-runtime";

test("isTauriRuntime detects the Tauri host object", () => {
  assert.equal(isTauriRuntime({ __TAURI_INTERNALS__: {} }), true);
  assert.equal(isTauriRuntime({}), false);
  assert.equal(isTauriRuntime(undefined), false);
});
