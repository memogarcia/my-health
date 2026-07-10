import test from "node:test";
import assert from "node:assert/strict";
import {
  isDatabasePassphraseLongEnough,
  normalizeDatabasePassphrase,
} from "../src/database-passphrase";

test("database passphrase validation matches the trimmed Rust boundary", () => {
  assert.equal(normalizeDatabasePassphrase("  correct horse  "), "correct horse");
  assert.equal(isDatabasePassphraseLongEnough("            "), false);
  assert.equal(isDatabasePassphraseLongEnough("  twelve chars  "), true);
});
