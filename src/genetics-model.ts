import { t } from "./i18n";

export const biologicalAgeSystemKeys = [
  "lungs",
  "metabolic",
  "musculoskeletal",
  "blood",
  "liver",
  "inflammation",
  "kidneys",
  "heart",
  "hormone",
  "immune",
  "brain",
] as const;

export type BiologicalAgeSystemKey = (typeof biologicalAgeSystemKeys)[number];

export type BiologicalAgeSystemScore = {
  systemKey: BiologicalAgeSystemKey;
  age: number;
};

export type BiologicalAgeReport = {
  id: number;
  reportName: string;
  provider: string;
  collectedAt: string;
  chronologicalAge: number;
  overallAge: number;
  percentile: number | null;
  notes: string;
  systemScores: BiologicalAgeSystemScore[];
  createdAt: string;
  updatedAt: string;
};

export type BiologicalAgeReportInput = Omit<
  BiologicalAgeReport,
  "id" | "createdAt" | "updatedAt"
>;

export const biologicalAgeSystems: ReadonlyArray<{
  key: BiologicalAgeSystemKey;
  label: string;
}> = [
  { key: "lungs", label: t("genetics.system.lungs") },
  { key: "metabolic", label: t("genetics.system.metabolic") },
  { key: "musculoskeletal", label: t("genetics.system.musculoskeletal") },
  { key: "blood", label: t("genetics.system.blood") },
  { key: "liver", label: t("genetics.system.liver") },
  { key: "inflammation", label: t("genetics.system.inflammation") },
  { key: "kidneys", label: t("genetics.system.kidneys") },
  { key: "heart", label: t("genetics.system.heart") },
  { key: "hormone", label: t("genetics.system.hormone") },
  { key: "immune", label: t("genetics.system.immune") },
  { key: "brain", label: t("genetics.system.brain") },
];

export function biologicalAgeInputFromForm(form: FormData): BiologicalAgeReportInput {
  const reportName = String(form.get("reportName") || "").trim();
  const collectedAt = String(form.get("collectedAt") || "").trim();
  if (!reportName) throw new Error(t("genetics.validation.reportName"));
  if (!collectedAt) throw new Error(t("genetics.validation.date"));
  const chronologicalAge = requiredAge(form, "chronologicalAge");
  const overallAge = requiredAge(form, "overallAge");
  const percentile = optionalNumber(form, "percentile");
  if (percentile !== null && (percentile < 0 || percentile > 100)) {
    throw new Error(t("genetics.validation.percentile"));
  }

  const systemScores = biologicalAgeSystems.flatMap(({ key, label }) => {
    const raw = String(form.get(`system-${key}`) || "").trim();
    if (!raw) return [];
    const age = Number(raw);
    if (!Number.isFinite(age) || age < 0 || age > 150) {
      throw new Error(t("genetics.validation.systemAge", { system: label }));
    }
    return [{ systemKey: key, age }];
  });
  if (systemScores.length === 0) {
    throw new Error(t("genetics.validation.systemRequired"));
  }

  return {
    reportName,
    provider: String(form.get("provider") || "").trim(),
    collectedAt,
    chronologicalAge,
    overallAge,
    percentile,
    notes: String(form.get("notes") || "").trim(),
    systemScores,
  };
}

export function formatAge(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/u, "");
}

export function systemLabel(key: BiologicalAgeSystemKey): string {
  return biologicalAgeSystems.find((system) => system.key === key)?.label || key;
}

function requiredAge(form: FormData, name: string): number {
  const raw = String(form.get(name) || "").trim();
  const value = raw ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value) || value < 0 || value > 150) {
    throw new Error(t("genetics.validation.ageRequired"));
  }
  return value;
}

function optionalNumber(form: FormData, name: string): number | null {
  const raw = String(form.get(name) || "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}
