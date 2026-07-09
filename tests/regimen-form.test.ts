import test from "node:test";
import assert from "node:assert/strict";
import { regimenInputFromForm } from "../src/regimen-form";

test("regimen form trims values and marks stopped items inactive", () => {
  const form = new FormData();
  form.set("kind", "medication");
  form.set("name", "  Vitamin D  ");
  form.set("dose", " 2000 ");
  form.set("unit", " IU ");
  form.set("frequency", " Daily ");
  form.set("startDate", "2026-07-01");
  form.set("stopDate", "2026-07-08");
  form.set("reason", " Low vitamin D ");
  form.set("notes", " With breakfast ");

  assert.deepEqual(regimenInputFromForm(form), {
    kind: "medication",
    name: "Vitamin D",
    dose: "2000",
    unit: "IU",
    frequency: "Daily",
    startDate: "2026-07-01",
    stopDate: "2026-07-08",
    reason: "Low vitamin D",
    notes: "With breakfast",
    active: false,
  });
});

test("regimen form defaults unknown kinds to supplement", () => {
  const form = new FormData();
  form.set("kind", "other");

  assert.equal(regimenInputFromForm(form).kind, "supplement");
  assert.equal(regimenInputFromForm(form).active, true);
});
