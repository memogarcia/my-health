import type { NavKey } from "./dashboard-model";
import { t } from "./i18n";

export const navItems: Array<{ key: NavKey; label: string; description: string }> = [
  { key: "body", label: t("nav.body.label"), description: t("nav.body.description") },
  { key: "labs", label: t("nav.labs.label"), description: t("nav.labs.description") },
  { key: "symptoms", label: t("nav.symptoms.label"), description: t("nav.symptoms.description") },
  { key: "activity", label: t("nav.activity.label"), description: t("nav.activity.description") },
  { key: "diet", label: t("nav.diet.label"), description: t("nav.diet.description") },
  { key: "medications", label: t("nav.medications.label"), description: t("nav.medications.description") },
  { key: "fasting", label: t("nav.fasting.label"), description: t("nav.fasting.description") },
  { key: "breathing", label: t("nav.breathing.label"), description: t("nav.breathing.description") },
  { key: "challenges", label: t("nav.challenges.label"), description: t("nav.challenges.description") },
  { key: "plan", label: t("nav.plan.label"), description: t("nav.plan.description") },
  { key: "research", label: t("nav.research.label"), description: t("nav.research.description") },
  { key: "documents", label: t("nav.documents.label"), description: t("nav.documents.description") },
  { key: "settings", label: t("nav.settings.label"), description: t("nav.settings.description") },
  { key: "developer", label: t("nav.developer.label"), description: t("nav.developer.description") },
];

export const primaryNavGroups: Array<{ label: string; keys: NavKey[] }> = [
  { label: t("nav.group.health"), keys: ["body", "labs", "documents"] },
  { label: t("nav.group.routines"), keys: ["diet", "medications", "fasting", "breathing", "challenges"] },
  { label: t("nav.group.intelligence"), keys: ["plan", "research"] },
];
