import type { DisplaySnapshot, HealthStatus, LabResult, SymptomEntry, UserState } from "./dashboard-model";

export type CoverageItem = { label: string; value: string };
export type LifestyleRecommendation = {
  category: "Breathing" | "Exercise" | "Activity" | "Routine";
  title: string;
  body: string;
  action: string;
  priority: HealthStatus;
  evidence: string[];
};
export type LifestylePlan = {
  coverage: CoverageItem[];
  signals: string[];
  recommendations: LifestyleRecommendation[];
  routine: string[];
  prompt: string;
};

export function buildLifestylePlan(display: DisplaySnapshot, userState: UserState): LifestylePlan {
  const labs = display.latestLabResults;
  const symptoms = display.recentSymptoms;
  const attentionLabs = labs.filter((lab) => lab.status === "attention");
  const monitorLabs = labs.filter((lab) => lab.status === "monitor");
  const highSymptoms = symptoms.filter((symptom) => symptom.severity >= 4);
  const activeMinutes = userState.activityEntries.reduce((total, entry) => total + entry.durationMinutes, 0);
  const loggedCigarettes = userState.activityEntries.reduce((total, entry) => total + entry.cigarettes, 0);
  const loggedDrinks = userState.activityEntries.reduce((total, entry) => total + entry.drinks, 0);
  const organNames = display.organs.filter((organ) => organ.status !== "normal").map((organ) => organ.name);
  const signals = buildSignals({
    attentionLabs,
    monitorLabs,
    highSymptoms,
    organNames,
    activeMinutes,
    loggedCigarettes,
    loggedDrinks,
    conditionNames: display.conditions.map((condition) => condition.name),
    appleHealthImports: userState.appleHealthImports.length,
    profileSaved: hasProfile(userState),
  });
  const coverage = buildCoverage(display, userState);
  const recommendations: LifestyleRecommendation[] = [
    buildBreathingRecommendation(labs, symptoms),
    buildExerciseRecommendation(attentionLabs, highSymptoms, activeMinutes),
    buildActivityRecommendation(userState, loggedCigarettes, loggedDrinks),
    buildRoutineRecommendation(display, userState),
  ];
  const routine = [
    attentionLabs.length || highSymptoms.length
      ? "Keep movement light and write down symptom changes before changing intensity."
      : "Keep one repeatable daily movement block on the calendar.",
    "Log activity, symptoms, cigarettes, drinks, and notes once per day.",
    display.regimenItems.length
      ? "Review active medications and supplements against new results each week."
      : "Add medications or supplements you take regularly before comparing patterns.",
    "Use Deep Research for a structured review before your next clinician conversation.",
  ];

  return {
    coverage,
    signals,
    recommendations,
    routine,
    prompt: buildLifestylePrompt(display, userState, { coverage, signals, recommendations, routine }),
  };
}

export function buildDeepResearchPrompt(display: DisplaySnapshot, userState: UserState): string {
  return [
    "Review my local health dashboard data and create a deep research brief.",
    "Do not diagnose, prescribe treatment, or provide emergency triage. Frame output as patterns to track, lifestyle experiments, and clinician-discussion questions.",
    "Use every section below, call out missing data, and separate stronger signals from weak hypotheses.",
    "",
    "Return Markdown with these sections:",
    "1. Highest-priority signals",
    "2. Cross-marker and symptom patterns",
    "3. Lifestyle and routine improvements",
    "4. Follow-up questions for a clinician",
    "5. Data gaps to fill next",
    "",
    "Profile",
    profileLine(userState),
    "",
    "Coverage",
    buildCoverage(display, userState).map((item) => `- ${item.label}: ${item.value}`).join("\n"),
    "",
    "Lab results and vitals",
    listLabs(display.latestLabResults),
    "",
    "Symptoms",
    listSymptoms(display.recentSymptoms),
    "",
    "Conditions",
    display.conditions.length
      ? display.conditions.map((item) => `- ${clean(item.name)} (${item.status}) ${item.diagnosedAt || "date unknown"}: ${clean(item.notes) || "no notes"}`).join("\n")
      : "- None saved",
    "",
    "Medications and supplements",
    display.regimenItems.length
      ? display.regimenItems.map((item) => `- ${clean(item.name)} (${item.kind}, ${item.active ? "active" : "stopped"}): ${[item.dose, item.unit, item.frequency].filter(Boolean).join(" ") || "dose not saved"}; reason: ${clean(item.reason) || "not saved"}; notes: ${clean(item.notes) || "none"}`).join("\n")
      : "- None saved",
    "",
    "Daily logs",
    userState.activityEntries.length
      ? userState.activityEntries.map((item) => `- ${item.loggedAt}: ${clean(item.activityName) || "daily entry"}, ${item.durationMinutes} min, cigarettes ${item.cigarettes}, drinks ${item.drinks}; notes: ${clean(item.notes) || "none"}`).join("\n")
      : "- None saved",
    "",
    "Apple Health imports",
    userState.appleHealthImports.length
      ? userState.appleHealthImports.map((item) => `- ${clean(item.sourceName)} imported ${item.importedAt}: ${item.recordCount} records, ${item.workoutCount} workouts, range ${item.startedAt || "unknown"} to ${item.endedAt || "unknown"}`).join("\n")
      : "- None saved",
  ].join("\n");
}

export function buildDeepResearchBrief(display: DisplaySnapshot, userState: UserState) {
  const prompt = buildDeepResearchPrompt(display, userState);
  const attentionLabs = display.latestLabResults.filter((lab) => lab.status === "attention");
  const monitorLabs = display.latestLabResults.filter((lab) => lab.status === "monitor");
  const highSymptoms = display.recentSymptoms.filter((symptom) => symptom.severity >= 4);
  return {
    coverage: buildCoverage(display, userState),
    signals: buildSignals({
      attentionLabs,
      monitorLabs,
      highSymptoms,
      organNames: display.organs.filter((organ) => organ.status !== "normal").map((organ) => organ.name),
      activeMinutes: userState.activityEntries.reduce((total, entry) => total + entry.durationMinutes, 0),
      loggedCigarettes: userState.activityEntries.reduce((total, entry) => total + entry.cigarettes, 0),
      loggedDrinks: userState.activityEntries.reduce((total, entry) => total + entry.drinks, 0),
      conditionNames: display.conditions.map((condition) => condition.name),
      appleHealthImports: userState.appleHealthImports.length,
      profileSaved: hasProfile(userState),
    }),
    prompt,
  };
}

function buildCoverage(display: DisplaySnapshot, userState: UserState): CoverageItem[] {
  return [
    { label: "Markers", value: String(display.latestLabResults.length) },
    { label: "Symptoms", value: String(display.recentSymptoms.length) },
    { label: "Conditions", value: String(display.conditions.length) },
    { label: "Regimen", value: String(display.regimenItems.length) },
    { label: "Daily logs", value: String(userState.activityEntries.length) },
    { label: "Apple Health", value: String(userState.appleHealthImports.length) },
  ];
}

function buildSignals(input: {
  attentionLabs: LabResult[];
  monitorLabs: LabResult[];
  highSymptoms: SymptomEntry[];
  organNames: string[];
  activeMinutes: number;
  loggedCigarettes: number;
  loggedDrinks: number;
  conditionNames: string[];
  appleHealthImports: number;
  profileSaved: boolean;
}): string[] {
  const signals = [];
  if (input.attentionLabs.length) signals.push(`${input.attentionLabs.length} marker${input.attentionLabs.length === 1 ? "" : "s"} need attention`);
  if (input.monitorLabs.length) signals.push(`${input.monitorLabs.length} marker${input.monitorLabs.length === 1 ? "" : "s"} to monitor`);
  if (input.highSymptoms.length) signals.push(`${input.highSymptoms.length} severe symptom log${input.highSymptoms.length === 1 ? "" : "s"}`);
  if (input.organNames.length) signals.push(`${input.organNames.slice(0, 3).join(", ")} showing follow-up status`);
  if (input.conditionNames.length) signals.push(`${input.conditionNames.length} saved condition${input.conditionNames.length === 1 ? "" : "s"}`);
  if (input.activeMinutes > 0) signals.push(`${input.activeMinutes} logged activity minutes`);
  if (input.loggedCigarettes > 0 || input.loggedDrinks > 0) signals.push("cigarette or alcohol exposure logged");
  if (input.appleHealthImports > 0) signals.push(`${input.appleHealthImports} Apple Health import${input.appleHealthImports === 1 ? "" : "s"}`);
  if (input.profileSaved) signals.push("profile available");
  return signals.length ? signals : ["No elevated signals saved yet"];
}

function buildBreathingRecommendation(labs: LabResult[], symptoms: SymptomEntry[]): LifestyleRecommendation {
  const respiratory = symptoms.some((item) => /breath|chest|panic|anxiety|stress|sleep|fatigue/iu.test(item.name + " " + item.notes));
  return {
    category: "Breathing",
    title: respiratory ? "Low-intensity breathing reset" : "Daily paced breathing",
    body: respiratory
      ? "Keep this gentle: slow nasal breathing can help track stress or breath-related symptoms without changing medications or treatment."
      : "A short breathing block gives you a repeatable baseline to compare against sleep, symptoms, and activity notes.",
    action: "Try 5 minutes at a comfortable pace, then log how you feel.",
    priority: respiratory || labs.some((lab) => lab.status === "attention") ? "monitor" : "normal",
    evidence: [symptoms.length ? labelSymptoms(symptoms) : "no symptoms logged", labs.length ? labelLabs(labs) : "no markers saved"],
  };
}

function buildExerciseRecommendation(attentionLabs: LabResult[], highSymptoms: SymptomEntry[], activeMinutes: number): LifestyleRecommendation {
  const cautious = attentionLabs.length > 0 || highSymptoms.length > 0;
  return {
    category: "Exercise",
    title: cautious ? "Gentle movement only" : activeMinutes ? "Keep repeatable movement" : "Start with easy walks",
    body: cautious
      ? "Use low-intensity walking or mobility until the flagged results or severe symptoms are reviewed."
      : "Consistent easy movement is easier to compare with marker trends than occasional hard sessions.",
    action: cautious ? "Use 10-15 easy minutes and stop if symptoms worsen." : "Aim for a comfortable 20-minute walk or mobility block.",
    priority: attentionLabs.length ? "attention" : highSymptoms.length ? "monitor" : "normal",
    evidence: [attentionLabs.length ? labelLabs(attentionLabs) : "no attention markers", highSymptoms.length ? labelSymptoms(highSymptoms) : "no severe symptoms", `${activeMinutes} logged minutes`],
  };
}

function buildActivityRecommendation(userState: UserState, loggedCigarettes: number, loggedDrinks: number): LifestyleRecommendation {
  const exposure = loggedCigarettes > 0 || loggedDrinks > 0;
  return {
    category: "Activity",
    title: exposure ? "Track exposure triggers" : userState.activityEntries.length ? "Repeat useful days" : "Build a daily signal log",
    body: exposure
      ? "Keep cigarettes, drinks, activity, and symptom notes in the same log so patterns are visible before making changes."
      : userState.activityEntries.length
        ? "Reuse the activities that leave useful notes and compare them with symptoms and results over time."
        : "A small daily log makes lifestyle advice specific instead of generic.",
    action: "Log activity, cigarettes, drinks, and one short note today.",
    priority: exposure ? "monitor" : "normal",
    evidence: [`${userState.activityEntries.length} daily logs`, `${loggedCigarettes} cigarettes`, `${loggedDrinks} drinks`],
  };
}

function buildRoutineRecommendation(display: DisplaySnapshot, userState: UserState): LifestyleRecommendation {
  const hasRegimen = display.regimenItems.some((item) => item.active);
  return {
    category: "Routine",
    title: hasRegimen ? "Weekly regimen review" : "Weekly health review",
    body: hasRegimen
      ? "Keep active medications and supplements beside new results so dose, timing, symptoms, and labs are reviewed together."
      : "Review markers, symptoms, and daily logs once per week before adding more complicated routines.",
    action: "Set one weekly review block and write clinician-discussion questions.",
    priority: display.latestLabResults.some((lab) => lab.status === "attention") ? "attention" : "normal",
    evidence: [display.regimenItems.length ? labelRegimen(display) : "no regimen saved", `${userState.appleHealthImports.length} Apple Health imports`],
  };
}

function buildLifestylePrompt(display: DisplaySnapshot, userState: UserState, input: Pick<LifestylePlan, "coverage" | "signals" | "recommendations" | "routine">): string {
  return [
    "Review my health dashboard data and refine a lifestyle plan.",
    "Do not diagnose or prescribe treatment. Keep suggestions lifestyle-focused and clinician-discussion friendly.",
    "",
    "Profile",
    profileLine(userState),
    "",
    "Coverage:",
    input.coverage.map((item) => `- ${item.label}: ${item.value}`).join("\n"),
    "",
    "Signals:",
    input.signals.map((item) => `- ${item}`).join("\n"),
    "",
    "Current local recommendations:",
    input.recommendations.map((item) => `- ${item.category}: ${item.title}. ${item.action}`).join("\n"),
    "",
    "Routine draft:",
    input.routine.map((item) => `- ${item}`).join("\n"),
    "",
    "Lab results and vitals",
    listLabs(display.latestLabResults),
    "",
    "Symptoms",
    listSymptoms(display.recentSymptoms),
    "",
    "Conditions",
    display.conditions.length
      ? display.conditions.map((item) => `- ${clean(item.name)} (${item.status}) ${item.diagnosedAt || "date unknown"}: ${clean(item.notes) || "no notes"}`).join("\n")
      : "- None saved",
    "",
    "Medications and supplements",
    display.regimenItems.length
      ? display.regimenItems.map((item) => `- ${clean(item.name)} (${item.kind}, ${item.active ? "active" : "stopped"}): ${[item.dose, item.unit, item.frequency].filter(Boolean).join(" ") || "dose not saved"}`).join("\n")
      : "- None saved",
    "",
    "Daily logs",
    userState.activityEntries.length
      ? userState.activityEntries.map((item) => `- ${item.loggedAt}: ${clean(item.activityName) || "daily entry"}, ${item.durationMinutes} min, cigarettes ${item.cigarettes}, drinks ${item.drinks}; notes: ${clean(item.notes) || "none"}`).join("\n")
      : "- None saved",
    "",
    "Apple Health imports",
    userState.appleHealthImports.length
      ? userState.appleHealthImports.map((item) => `- ${clean(item.sourceName)} imported ${item.importedAt}: ${item.recordCount} records, ${item.workoutCount} workouts, range ${item.startedAt || "unknown"} to ${item.endedAt || "unknown"}`).join("\n")
      : "- None saved",
  ].join("\n");
}

function listLabs(labs: LabResult[]): string {
  if (!labs.length) return "- None saved";
  return labs.map((lab) => {
    const value = [lab.value, lab.unit].filter(Boolean).join(" ");
    const range = lab.referenceRange ? `; reference ${lab.referenceRange}` : "";
    return `- ${lab.measuredAt}: ${clean(lab.marker)} ${value || "value not saved"} (${lab.flag}, ${lab.status}) for ${lab.organKey}${range}; notes: ${clean(lab.notes) || "none"}`;
  }).join("\n");
}

function listSymptoms(symptoms: SymptomEntry[]): string {
  if (!symptoms.length) return "- None saved";
  return symptoms.map((symptom) => `- ${symptom.observedAt}: ${clean(symptom.name)} severity ${symptom.severity}/5 for ${symptom.organKey}; notes: ${clean(symptom.notes) || "none"}`).join("\n");
}

function profileLine(userState: UserState): string {
  const profile = userState.profile;
  return [
    `- Age: ${profile.age ?? "not saved"}`,
    `- Sex: ${profile.sex || "not saved"}`,
    `- Height cm: ${profile.heightCm ?? "not saved"}`,
    `- Weight kg: ${profile.weightKg ?? "not saved"}`,
  ].join("\n");
}

function labelLabs(labs: LabResult[]): string {
  return labs.slice(0, 2).map((lab) => clean(lab.marker)).join(", ") + (labs.length > 2 ? ` +${labs.length - 2}` : "");
}

function labelSymptoms(symptoms: SymptomEntry[]): string {
  return symptoms.slice(0, 2).map((symptom) => clean(symptom.name)).join(", ") + (symptoms.length > 2 ? ` +${symptoms.length - 2}` : "");
}

function labelRegimen(display: DisplaySnapshot): string {
  const names = display.regimenItems.slice(0, 2).map((item) => clean(item.name)).filter(Boolean);
  return names.join(", ") + (display.regimenItems.length > 2 ? ` +${display.regimenItems.length - 2}` : "");
}

function hasProfile(userState: UserState): boolean {
  const profile = userState.profile;
  return profile.age !== null || Boolean(profile.sex) || profile.heightCm !== null || profile.weightKg !== null;
}

function clean(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}
