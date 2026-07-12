import type { DisplaySnapshot, UserState } from "./dashboard-model";
import { t } from "./i18n";

export type ResearchDepth = "focused" | "comprehensive";
export type ResearchCoverageItem = { key: string; label: string; count: number };

export function buildDeepResearchPrompt(question: string, depth: ResearchDepth): string {
  const depthInstruction = depth === "comprehensive"
    ? "Analyze every relevant dated record, compare changes over time, and examine plausible relationships as hypotheses rather than facts."
    : "Focus on the records most relevant to the question and keep secondary observations brief.";
  return [
    `Research question: ${question.trim()}`,
    "Create a detailed health-record research report using the complete dated context supplied with this conversation.",
    depthInstruction,
    "Separate direct record evidence from general medical knowledge. Use exact saved dates, values, units, symptoms, regimen changes, diet entries, fasting sessions, body notes, and daily logs when relevant.",
    "Do not diagnose, prescribe treatment, or provide emergency triage. Do not invent citations or claim that external sources were browsed.",
    "Call out contradictions, missing data, and uncertainty. End with specific questions the user can discuss with a clinician.",
  ].join("\n");
}

export function buildDeepResearchBrief(display: DisplaySnapshot, userState: UserState) {
  const coverage: ResearchCoverageItem[] = [
    { key: "markers", label: t("research.coverage.markers"), count: display.latestLabResults.length },
    { key: "symptoms", label: t("research.coverage.symptoms"), count: display.recentSymptoms.length },
    { key: "conditions", label: t("research.coverage.conditions"), count: display.conditions.length },
    { key: "regimen", label: t("research.coverage.regimen"), count: display.regimenItems.length },
    { key: "diet", label: t("research.coverage.diet"), count: userState.dietEntries.length },
    { key: "dailyLogs", label: t("research.coverage.dailyLogs"), count: userState.activityEntries.length },
    { key: "fasting", label: t("research.coverage.fasting"), count: userState.fasting.sessions.length + (userState.fasting.activeStartedAt ? 1 : 0) },
    { key: "bodyNotes", label: t("research.coverage.bodyNotes"), count: userState.bodyNotes.length },
    { key: "documents", label: t("research.coverage.documents"), count: display.labReports.length + userState.appleHealthImports.length },
    { key: "recommendations", label: t("research.coverage.recommendations"), count: display.aiRecommendations.length },
  ];
  return {
    coverage,
    totalRecords: coverage.reduce((total, item) => total + item.count, 0),
  };
}
