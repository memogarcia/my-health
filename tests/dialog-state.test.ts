import test from "node:test";
import assert from "node:assert/strict";
import { closeDialogState } from "../src/dialog-state";

test("closing document dialog clears pending intake state", () => {
  assert.deepEqual(closeDialogState("document", { sourceName: "result.pdf", fileType: "application/pdf", sizeLabel: "1 KB" }), {
    activeDialog: null,
    pendingDocument: null,
  });
});
