import type { PendingDocument } from "./dashboard-model";

import { t } from "./i18n";

export const resultDocumentAccept = "application/pdf,image/png,image/jpeg,image/gif,image/webp,image/bmp";

export function pendingDocumentFromFile(file: File): { document: PendingDocument } | { error: string } {
  const fileName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
  const isImage = /\.(png|jpe?g|webp|gif|bmp)$/u.test(fileName) || ["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"].includes(file.type);
  if (!isPdf && !isImage) return { error: t("document.choosePdfImage") };

  return {
    document: {
      sourceName: file.name,
      fileType: isPdf ? "PDF" : file.type.replace("image/", "").toUpperCase() || "Image",
      sizeLabel: formatFileSize(file.size),
    },
  };
}

type DocumentDropRoot = Pick<HTMLElement, "addEventListener" | "removeEventListener">;

export function bindDocumentDrop(root: DocumentDropRoot, onFile: (file: File) => void): () => void {
  function handleDragOver(event: DragEvent): void {
    if (!hasFiles(event) || isDocumentDropTarget(event.target)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent): void {
    if (!hasFiles(event) || isDocumentDropTarget(event.target)) return;
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) onFile(file);
  }

  root.addEventListener("dragover", handleDragOver);
  root.addEventListener("drop", handleDrop);
  return () => {
    root.removeEventListener("dragover", handleDragOver);
    root.removeEventListener("drop", handleDrop);
  };
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function isDocumentDropTarget(target: EventTarget | null): boolean {
  return typeof HTMLElement !== "undefined" && target instanceof HTMLElement && Boolean(target.closest("[data-document-drop]"));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
