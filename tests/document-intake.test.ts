import test from "node:test";
import assert from "node:assert/strict";
import { bindDocumentDrop, pendingDocumentFromFile } from "../src/document-intake";

test("pendingDocumentFromFile accepts PDFs and rejects unsupported files", () => {
  assert.deepEqual(pendingDocumentFromFile(new File(["x"], "lab.pdf", { type: "application/pdf" })), {
    document: { sourceName: "lab.pdf", fileType: "PDF", sizeLabel: "1 B" },
  });
  assert.deepEqual(pendingDocumentFromFile(new File(["x"], "notes.txt", { type: "text/plain" })), {
    error: "Choose a PDF or image result file.",
  });
});

test("bindDocumentDrop routes file drops and cleans up listeners", () => {
  const listeners = new Map<string, EventListener>();
  const root = {
    addEventListener(type: string, listener: EventListener) {
      listeners.set(type, listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  } as unknown as HTMLElement;
  const file = new File(["x"], "result.pdf", { type: "application/pdf" });
  let dropped: File | undefined;

  const cleanup = bindDocumentDrop(root, (next) => {
    dropped = next;
  });
  const event = fakeDropEvent(file);
  listeners.get("dragover")?.(event);
  listeners.get("drop")?.(event);

  assert.equal(event.defaultPrevented, true);
  assert.equal(event.dataTransfer.dropEffect, "copy");
  assert.equal(dropped, file);

  cleanup();
  assert.equal(listeners.size, 0);
});

function fakeDropEvent(file: File) {
  return {
    dataTransfer: { types: ["Files"], files: [file], dropEffect: "" },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: null,
  } as unknown as DragEvent & { defaultPrevented: boolean; dataTransfer: { dropEffect: string } };
}
