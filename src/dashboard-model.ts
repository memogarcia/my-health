import { t } from "./i18n";
import { normalizeDeveloperLog, normalizeLlmCall } from "./developer-diagnostics";
import type { DeveloperLog, LlmCall } from "./developer-diagnostics";
export type { DeveloperLog, DeveloperLogInput, LlmCall, LlmCallInput, LlmCallPatch } from "./developer-diagnostics";

const MAX_USER_TEXT_CHARS = 32_000;

/**
 * A symptom affects the current organ state from the day it is logged through
 * the inclusive 30-day lookback boundary. Older and future-dated symptoms stay
 * in history without affecting the current state.
 */
export const CURRENT_SYMPTOM_LOOKBACK_DAYS = 30;

export type HealthStatus = "normal" | "monitor" | "attention";
export type ExtractedResultStatus = HealthStatus | "";
export type LabFlag = "low" | "normal" | "high" | "unknown";
export type RegimenKind = "medication" | "supplement";
export type ConditionStatus = "current" | "managed" | "past";
export type NavKey = "body" | "labs" | "symptoms" | "medications" | "plan" | "research" | "documents" | "settings" | "developer";
export type HistoryTab = "labs" | "symptoms" | "files";
export type DialogKey = "lab" | "symptom" | "activity" | "document" | null;

export type OrganSummary = {
  key: string;
  name: string;
  system: string;
  status: HealthStatus;
  labCount: number;
  symptomCount: number;
};

export type LabResult = {
  id: number;
  reportId: number | null;
  reportSourceName: string | null;
  reportLocalCopyPath: string | null;
  organKey: string;
  marker: string;
  value: string;
  valueNumber: number | null;
  unit: string;
  status: HealthStatus;
  flag: LabFlag;
  measuredAt: string;
  notes: string;
  referenceRange: string;
  referenceLow: number | null;
  referenceHigh: number | null;
};

export type SymptomEntry = {
  id: number;
  organKey: string;
  name: string;
  severity: number;
  observedAt: string;
  notes: string;
};

export type Recommendation = {
  title: string;
  body: string;
  priority: HealthStatus;
};

export type RegimenItem = {
  id: number;
  kind: RegimenKind;
  name: string;
  dose: string;
  unit: string;
  frequency: string;
  startDate: string;
  stopDate: string;
  reason: string;
  notes: string;
  active: boolean;
};

export type RegimenInput = {
  kind: RegimenKind;
  name: string;
  dose: string;
  unit: string;
  frequency: string;
  startDate: string;
  stopDate: string;
  reason: string;
  notes: string;
  active: boolean;
};

export type ConditionEntry = {
  id: number;
  organKey: string;
  name: string;
  status: ConditionStatus;
  diagnosedAt: string;
  notes: string;
};

export type ConditionInput = {
  organKey: string;
  name: string;
  status: ConditionStatus;
  diagnosedAt: string;
  notes: string;
};

export type LabReport = {
  id: number;
  sourceName: string;
  fileType: string;
  sizeLabel: string;
  localCopyPath: string;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSnapshot = {
  dbPath: string;
  organs: OrganSummary[];
  latestLabResults: LabResult[];
  recentSymptoms: SymptomEntry[];
  conditions: ConditionEntry[];
  regimenItems: RegimenItem[];
  aiRecommendations: Recommendation[];
  labReports: LabReport[];
};

export type DisplaySnapshot = DashboardSnapshot;

export type UserProfile = {
  age: number | null;
  sex: string;
  heightCm: number | null;
  weightKg: number | null;
};

export type ActivityEntry = {
  id: string;
  loggedAt: string;
  cigarettes: number;
  drinks: number;
  activityName: string;
  durationMinutes: number;
  notes: string;
};

export type AppleHealthImport = {
  id: string;
  sourceName: string;
  importedAt: string;
  recordCount: number;
  workoutCount: number;
  startedAt: string;
  endedAt: string;
};

export type PendingDocument = {
  sourceName: string;
  fileType: string;
  sizeLabel: string;
  localCopyPath?: string;
};

export type ExtractedResult = {
  id: string;
  organKey: string;
  marker: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: ExtractedResultStatus;
  measuredAt: string;
  notes: string;
};

export type DocumentAnalysisStatus = "ready" | "analyzing" | "error";

export type DocumentAnalysis = {
  status: DocumentAnalysisStatus;
  results: ExtractedResult[];
  error: string;
};

export type BackgroundJobKind = "document-analysis" | "deep-research" | "ai-chat";
export type BackgroundJobStatus = "running" | "completed" | "failed";

export type BackgroundJob = {
  id: string;
  kind: BackgroundJobKind;
  title: string;
  description: string;
  status: BackgroundJobStatus;
  progress: number | null;
  createdAt: string;
  finishedAt: string;
  error: string;
};

export type BackgroundJobInput = Pick<BackgroundJob, "kind" | "title" | "description">;
export type BackgroundJobPatch = Partial<Pick<BackgroundJob, "description" | "status" | "progress" | "error">>;

export type AiConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  providerId: string;
  modelId: string;
  isError: boolean;
};

export type AiConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiConversationMessage[];
};

export type UserState = {
  profile: UserProfile;
  activityEntries: ActivityEntry[];
  appleHealthImports: AppleHealthImport[];
  aiConversations: AiConversation[];
  activeAiConversationId: string;
  backgroundJobs: BackgroundJob[];
  developerLogs: DeveloperLog[];
  llmCalls: LlmCall[];
};

export type OrganVisual = {
  color: string;
  x: number;
  y: number;
};

export const navItems: Array<{ key: NavKey; label: string; description: string }> = [
  { key: "body", label: t("nav.body.label"), description: t("nav.body.description") },
  { key: "labs", label: t("nav.labs.label"), description: t("nav.labs.description") },
  { key: "symptoms", label: t("nav.symptoms.label"), description: t("nav.symptoms.description") },
  { key: "medications", label: t("nav.medications.label"), description: t("nav.medications.description") },
  { key: "plan", label: t("nav.plan.label"), description: t("nav.plan.description") },
  { key: "research", label: t("nav.research.label"), description: t("nav.research.description") },
  { key: "documents", label: t("nav.documents.label"), description: t("nav.documents.description") },
  { key: "settings", label: t("nav.settings.label"), description: t("nav.settings.description") },
  { key: "developer", label: t("nav.developer.label"), description: t("nav.developer.description") },
];

// Sidebar grouping. Order follows navItems so digit shortcuts stay sequential.
export const navGroups: Array<{ label: string; keys: NavKey[] }> = [
  { label: t("nav.group.health"), keys: ["body", "labs", "symptoms", "medications"] },
  { label: t("nav.group.assistant"), keys: ["plan", "research"] },
  { label: t("nav.group.library"), keys: ["documents"] },
];

export const statusLabel: Record<HealthStatus, string> = {
  normal: t("status.normal"),
  monitor: t("status.monitor"),
  attention: t("status.attention"),
};

export const organOrder = ["brain", "thyroid", "lungs", "heart", "liver", "spleen", "stomach", "pancreas", "kidneys", "intestines", "bladder", "blood", "bones", "skin", "reproductive"] as const;

const organVisuals: Record<string, OrganVisual> = {
  brain: { color: "#e87982", x: 50, y: 13 },
  thyroid: { color: "#7c5cc4", x: 50, y: 23 },
  lungs: { color: "#53b7c0", x: 50, y: 37 },
  heart: { color: "#e05a47", x: 51, y: 47 },
  liver: { color: "#9a5b45", x: 44, y: 56 },
  spleen: { color: "#5b8a72", x: 61, y: 55 },
  stomach: { color: "#e79d6b", x: 57, y: 61 },
  pancreas: { color: "#c98a4b", x: 50, y: 64 },
  kidneys: { color: "#b46a78", x: 47, y: 67 },
  intestines: { color: "#d78770", x: 51, y: 77 },
  bladder: { color: "#2d9cdb", x: 50, y: 84 },
  blood: { color: "#c0392b", x: 50, y: 50 },
  bones: { color: "#cdbb8a", x: 50, y: 50 },
  skin: { color: "#d99a6c", x: 50, y: 50 },
  reproductive: { color: "#d76a9e", x: 50, y: 50 },
};

export const wholeBodySystems = new Set<string>(["blood", "bones", "skin", "reproductive"]);

export const defaultOrgans: OrganSummary[] = [
  { key: "brain", name: t("organ.brain.name"), system: t("organ.brain.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "thyroid", name: t("organ.thyroid.name"), system: t("organ.thyroid.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "lungs", name: t("organ.lungs.name"), system: t("organ.lungs.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "heart", name: t("organ.heart.name"), system: t("organ.heart.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "liver", name: t("organ.liver.name"), system: t("organ.liver.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "spleen", name: t("organ.spleen.name"), system: t("organ.spleen.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "stomach", name: t("organ.stomach.name"), system: t("organ.stomach.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "pancreas", name: t("organ.pancreas.name"), system: t("organ.pancreas.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "kidneys", name: t("organ.kidneys.name"), system: t("organ.kidneys.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "intestines", name: t("organ.intestines.name"), system: t("organ.intestines.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "bladder", name: t("organ.bladder.name"), system: t("organ.bladder.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "blood", name: t("organ.blood.name"), system: t("organ.blood.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "bones", name: t("organ.bones.name"), system: t("organ.bones.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "skin", name: t("organ.skin.name"), system: t("organ.skin.system"), status: "normal", labCount: 0, symptomCount: 0 },
  { key: "reproductive", name: t("organ.reproductive.name"), system: t("organ.reproductive.system"), status: "normal", labCount: 0, symptomCount: 0 },
];

export function getOrganVisual(key: string): OrganVisual {
  return organVisuals[key] || { color: "#219d8a", x: 50, y: 50 };
}

export function deriveOrganStatus(
  input: { labs: LabResult[]; symptoms: SymptomEntry[]; conditions: ConditionEntry[] },
  today = localToday(),
): HealthStatus {
  const labs = latestLabsByMarker(input.labs);
  const symptoms = input.symptoms.filter((symptom) => isCurrentSymptom(symptom, today));
  if (labs.some((lab) => lab.status === "attention") || symptoms.some((symptom) => symptom.severity >= 4)) return "attention";
  if (
    labs.some((lab) => lab.status === "monitor") ||
    symptoms.some((symptom) => symptom.severity >= 2) ||
    input.conditions.some((condition) => condition.status === "current")
  ) return "monitor";
  return "normal";
}

/** Latest result for each normalized marker within its organ. */
export function latestLabsByMarker(labs: LabResult[]): LabResult[] {
  const latest = new Map<string, LabResult>();
  for (const lab of labs) {
    const key = `${lab.organKey}|${lab.marker.trim().toLowerCase()}`;
    const current = latest.get(key);
    if (!current || lab.measuredAt > current.measuredAt || (lab.measuredAt === current.measuredAt && lab.id > current.id)) {
      latest.set(key, lab);
    }
  }
  return [...latest.values()];
}

export function isCurrentSymptom(symptom: SymptomEntry, today = localToday()): boolean {
  const cutoff = shiftIsoDate(today, -CURRENT_SYMPTOM_LOOKBACK_DAYS);
  return symptom.observedAt >= cutoff && symptom.observedAt <= today;
}

export function buildDisplaySnapshot(snapshot: DashboardSnapshot | null): DisplaySnapshot {
  const latestLabResults = snapshot?.latestLabResults || [];
  const recentSymptoms = snapshot?.recentSymptoms || [];
  const conditions = snapshot?.conditions || [];
  const baseOrgans = snapshot?.organs.length ? snapshot.organs : defaultOrgans;
  const organs = baseOrgans.map((organ) => {
    const labs = latestLabResults.filter((lab) => lab.organKey === organ.key);
    const symptoms = recentSymptoms.filter((symptom) => symptom.organKey === organ.key);
    const organConditions = conditions.filter((condition) => condition.organKey === organ.key);
    return { ...organ, status: deriveOrganStatus({ labs, symptoms, conditions: organConditions }), labCount: labs.length, symptomCount: symptoms.length };
  });

  return {
    dbPath: snapshot?.dbPath || t("database.localUnavailable"),
    organs,
    latestLabResults,
    recentSymptoms,
    conditions,
    regimenItems: snapshot?.regimenItems || [],
    aiRecommendations: snapshot?.aiRecommendations || [],
    labReports: snapshot?.labReports || [],
  };
}

function localToday(): string {
  const today = new Date();
  return formatDateParts(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

function shiftIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeUserState(value: Partial<UserState> = {}): UserState {
  const profile: Partial<UserProfile> = value.profile || {};
  const aiConversations = Array.isArray(value.aiConversations)
    ? value.aiConversations.map(normalizeAiConversation).filter((entry) => entry.id)
    : [];
  const activeAiConversationId =
    typeof value.activeAiConversationId === "string" && aiConversations.some((entry) => entry.id === value.activeAiConversationId)
      ? value.activeAiConversationId
      : aiConversations[0]?.id || "";

  return {
    profile: {
      age: numberOrNull(profile.age),
      sex: typeof profile.sex === "string" ? profile.sex : "",
      heightCm: numberOrNull(profile.heightCm),
      weightKg: numberOrNull(profile.weightKg),
    },
    activityEntries: Array.isArray(value.activityEntries)
      ? value.activityEntries.map(normalizeActivityEntry).filter((entry) => entry.loggedAt)
      : [],
    appleHealthImports: Array.isArray(value.appleHealthImports)
      ? value.appleHealthImports.map(normalizeAppleHealthImport).filter((entry) => entry.sourceName)
      : [],
    aiConversations,
    activeAiConversationId,
    backgroundJobs: Array.isArray(value.backgroundJobs)
      ? value.backgroundJobs.map(normalizeBackgroundJob).filter((entry) => entry.id).slice(0, 24)
      : [],
    developerLogs: Array.isArray(value.developerLogs)
      ? value.developerLogs.map(normalizeDeveloperLog).filter((entry) => entry.id).slice(0, 120)
      : [],
    llmCalls: Array.isArray(value.llmCalls)
      ? value.llmCalls.map(normalizeLlmCall).filter((entry) => entry.id).slice(0, 40)
      : [],
  };
}

function normalizeActivityEntry(entry: Partial<ActivityEntry>): ActivityEntry {
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    loggedAt: typeof entry.loggedAt === "string" ? entry.loggedAt : "",
    cigarettes: numberOrZero(entry.cigarettes),
    drinks: numberOrZero(entry.drinks),
    activityName: typeof entry.activityName === "string" ? entry.activityName : "",
    durationMinutes: numberOrZero(entry.durationMinutes),
    notes: typeof entry.notes === "string" ? limitText(entry.notes, MAX_USER_TEXT_CHARS) : "",
  };
}

function normalizeAppleHealthImport(entry: Partial<AppleHealthImport>): AppleHealthImport {
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    sourceName: typeof entry.sourceName === "string" ? entry.sourceName : "",
    importedAt: typeof entry.importedAt === "string" ? entry.importedAt : "",
    recordCount: numberOrZero(entry.recordCount),
    workoutCount: numberOrZero(entry.workoutCount),
    startedAt: typeof entry.startedAt === "string" ? entry.startedAt : "",
    endedAt: typeof entry.endedAt === "string" ? entry.endedAt : "",
  };
}

function normalizeAiConversation(entry: Partial<AiConversation>): AiConversation {
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    title: typeof entry.title === "string" ? limitText(entry.title, 120) : "",
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : "",
    messages: Array.isArray(entry.messages)
      ? entry.messages.map(normalizeAiConversationMessage).filter((message) => message.id && message.content)
      : [],
  };
}

function normalizeAiConversationMessage(entry: Partial<AiConversationMessage>): AiConversationMessage {
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    role: entry.role === "assistant" ? "assistant" : "user",
    content: typeof entry.content === "string" ? limitText(entry.content, MAX_USER_TEXT_CHARS) : "",
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    providerId: typeof entry.providerId === "string" ? entry.providerId : "",
    modelId: typeof entry.modelId === "string" ? entry.modelId : "",
    isError: entry.isError === true,
  };
}

function normalizeBackgroundJob(entry: Partial<BackgroundJob>): BackgroundJob {
  const progress = typeof entry.progress === "number" && Number.isFinite(entry.progress)
    ? Math.min(100, Math.max(0, Math.round(entry.progress)))
    : null;
  return {
    id: typeof entry.id === "string" ? entry.id : "",
    kind: entry.kind === "document-analysis" || entry.kind === "deep-research" ? entry.kind : "ai-chat",
    title: typeof entry.title === "string" ? limitText(entry.title, 120) : "",
    description: typeof entry.description === "string" ? limitText(entry.description, 240) : "",
    status: entry.status === "completed" || entry.status === "failed" ? entry.status : "running",
    progress,
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    finishedAt: typeof entry.finishedAt === "string" ? entry.finishedAt : "",
    error: typeof entry.error === "string" ? limitText(entry.error, 1000) : "",
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function limitText(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value;
}
