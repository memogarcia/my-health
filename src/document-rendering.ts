import { t } from "./i18n";

const MAX_PAGE_DIMENSION = 1_800;

export type RenderedDocumentPage = {
  fileName: string;
  fileBytes: number[];
};

export async function renderDocumentPages(file: File): Promise<RenderedDocumentPage[]> {
  const lowerName = file.name.toLowerCase();
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) return renderPdfPages(file);
  if (file.type === "image/bmp" || lowerName.endsWith(".bmp")) {
    return [await renderBitmapPage(file)];
  }
  return [];
}

async function renderPdfPages(file: File): Promise<RenderedDocumentPage[]> {
  const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  try {
    const pages: RenderedDocumentPage[] = [];
    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index);
      const natural = page.getViewport({ scale: 1 });
      const scale = Math.min(2, MAX_PAGE_DIMENSION / Math.max(natural.width, natural.height));
      const viewport = page.getViewport({ scale });
      const canvas = documentCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error(t("document.renderFailed"));
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push(await canvasPage(canvas, `page-${index}.jpg`));
      page.cleanup();
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

async function renderBitmapPage(file: File): Promise<RenderedDocumentPage> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_PAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = documentCanvas(bitmap.width * scale, bitmap.height * scale);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error(t("document.renderFailed"));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvasPage(canvas, "page-1.jpg");
  } finally {
    bitmap.close();
  }
}

function documentCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

async function canvasPage(canvas: HTMLCanvasElement, fileName: string): Promise<RenderedDocumentPage> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error(t("document.renderFailed"));
  return { fileName, fileBytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
}
