import { validateAppleHealthFile } from "./apple-health-summary";
import { type AppleHealthImport } from "./dashboard-model";

type WorkerResponse = { summary: AppleHealthImport } | { error: string };

export async function summarizeAppleHealthFile(file: File): Promise<AppleHealthImport> {
  validateAppleHealthFile(file);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./apple-health-worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => worker.terminate();

    worker.onmessage = (event) => {
      const data = event.data as WorkerResponse;
      cleanup();
      if ("summary" in data) resolve(data.summary);
      else reject(new Error(data.error));
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || "Apple Health import failed."));
    };
    worker.postMessage({ file });
  });
}
