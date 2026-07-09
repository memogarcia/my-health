import type { RegimenInput } from "./dashboard-model";

export function regimenInputFromForm(form: FormData): RegimenInput {
  const stopDate = formString(form, "stopDate");
  return {
    kind: formString(form, "kind") === "medication" ? "medication" : "supplement",
    name: formString(form, "name"),
    dose: formString(form, "dose"),
    unit: formString(form, "unit"),
    frequency: formString(form, "frequency"),
    startDate: formString(form, "startDate"),
    stopDate,
    reason: formString(form, "reason"),
    notes: formString(form, "notes"),
    active: !stopDate,
  };
}

function formString(form: FormData, key: string): string {
  return String(form.get(key) || "").trim();
}
