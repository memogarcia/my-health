import { summarizeAppleHealthXml, validateAppleHealthFile } from "./apple-health-summary";
import { type AppleHealthImport } from "./dashboard-model";

type WorkerRequest = { file: File };
type WorkerResponse = { summary: AppleHealthImport } | { error: string };

self.onmessage = async (event) => {
  try {
    const { file } = event.data as WorkerRequest;
    validateAppleHealthFile(file);
    const summary = summarizeAppleHealthXml(await file.text(), file.name);
    self.postMessage({ summary } satisfies WorkerResponse);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) } satisfies WorkerResponse);
  }
};
