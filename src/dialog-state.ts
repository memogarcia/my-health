import type { DialogKey, PendingDocument } from "./dashboard-model";

export function closeDialogState(activeDialog: DialogKey, pendingDocument: PendingDocument | null) {
  return {
    activeDialog: null,
    pendingDocument: activeDialog === "document" ? null : pendingDocument,
  };
}
