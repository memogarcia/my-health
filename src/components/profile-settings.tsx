import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserProfile } from "../dashboard-model";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;
const KG_PER_POUND = 0.45359237;

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round(totalInches - feet * INCHES_PER_FOOT);
  if (inches === INCHES_PER_FOOT) return { feet: feet + 1, inches: 0 };
  return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

function kgToPounds(kg: number): number {
  return kg / KG_PER_POUND;
}

function poundsToKg(pounds: number): number {
  return pounds * KG_PER_POUND;
}

function round1(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function parseNonNegativeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function ProfileSettings({ controller }: { controller: DashboardController }) {
  const profile = controller.userState.profile;
  const fieldCount = [profile.age, profile.sex, profile.heightCm, profile.weightKg].filter(Boolean).length;

  const [anatomyModel, setAnatomyModel] = useState<UserProfile["anatomyModel"]>(profile.anatomyModel);
  const [unitSystem, setUnitSystem] = useState<UserProfile["unitSystem"]>(profile.unitSystem);

  // Canonical measurement text, kept per unit so switching units converts without retype jitter.
  const [heightCmText, setHeightCmText] = useState(profile.heightCm != null ? round1(profile.heightCm) : "");
  const [weightKgText, setWeightKgText] = useState(profile.weightKg != null ? round1(profile.weightKg) : "");
  const initialFeetInches = profile.heightCm != null ? cmToFeetInches(profile.heightCm) : null;
  const [heightFtText, setHeightFtText] = useState(initialFeetInches ? String(initialFeetInches.feet) : "");
  const [heightInText, setHeightInText] = useState(initialFeetInches ? String(initialFeetInches.inches) : "");
  const [weightLbText, setWeightLbText] = useState(profile.weightKg != null ? round1(kgToPounds(profile.weightKg)) : "");

  useEffect(() => {
    setAnatomyModel(profile.anatomyModel);
    setUnitSystem(profile.unitSystem);
    setHeightCmText(profile.heightCm != null ? round1(profile.heightCm) : "");
    setWeightKgText(profile.weightKg != null ? round1(profile.weightKg) : "");
    const feetInches = profile.heightCm != null ? cmToFeetInches(profile.heightCm) : null;
    setHeightFtText(feetInches ? String(feetInches.feet) : "");
    setHeightInText(feetInches ? String(feetInches.inches) : "");
    setWeightLbText(profile.weightKg != null ? round1(kgToPounds(profile.weightKg)) : "");
  }, [profile]);

  function selectUnitSystem(next: UserProfile["unitSystem"]): void {
    if (next === unitSystem) return;
    const cm = unitSystem === "metric"
      ? parseNonNegativeNumber(heightCmText)
      : (() => {
          const feet = parseNonNegativeNumber(heightFtText) ?? 0;
          const inches = parseNonNegativeNumber(heightInText) ?? 0;
          return feet || inches ? feetInchesToCm(feet, inches) : null;
        })();
    const kg = unitSystem === "metric"
      ? parseNonNegativeNumber(weightKgText)
      : (() => {
          const pounds = parseNonNegativeNumber(weightLbText);
          return pounds != null ? poundsToKg(pounds) : null;
        })();
    if (next === "metric") {
      setHeightCmText(cm != null ? round1(cm) : "");
      setWeightKgText(kg != null ? round1(kg) : "");
    } else {
      const feetInches = cm != null ? cmToFeetInches(cm) : null;
      setHeightFtText(feetInches ? String(feetInches.feet) : "");
      setHeightInText(feetInches ? String(feetInches.inches) : "");
      setWeightLbText(kg != null ? round1(kgToPounds(kg)) : "");
    }
    setUnitSystem(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("anatomyModel", anatomyModel);
    form.set("unitSystem", unitSystem);
    const cmValue = unitSystem === "metric"
      ? parseNonNegativeNumber(heightCmText)
      : (() => {
          const feet = parseNonNegativeNumber(heightFtText) ?? 0;
          const inches = parseNonNegativeNumber(heightInText) ?? 0;
          return feet || inches ? feetInchesToCm(feet, inches) : null;
        })();
    const kgValue = unitSystem === "metric"
      ? parseNonNegativeNumber(weightKgText)
      : (() => {
          const pounds = parseNonNegativeNumber(weightLbText);
          return pounds != null ? poundsToKg(pounds) : null;
        })();
    form.set("heightCm", cmValue != null ? String(cmValue) : "");
    form.set("weightKg", kgValue != null ? String(kgValue) : "");
    void controller.saveProfile(form);
  }

  const isImperial = unitSystem === "imperial";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile.title")}</CardTitle>
        <CardDescription>{fieldCount === 0 ? t("settings.profile.notSet") : t("settings.profile.fieldsSet", { count: fieldCount })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <NumberField name="age" label={t("settings.profile.age")} value={profile.age} min={0} max={130} step={1} />
            <Field>
              <FieldLabel htmlFor="profile-sex">{t("settings.profile.sex")}</FieldLabel>
              <Select name="sex" defaultValue={profile.sex}>
                <SelectTrigger className="w-full" id="profile-sex"><SelectValue placeholder={t("settings.profile.notSet")} /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="female">{t("settings.profile.sexFemale")}</SelectItem>
                    <SelectItem value="male">{t("settings.profile.sexMale")}</SelectItem>
                    <SelectItem value="intersex">{t("settings.profile.sexIntersex")}</SelectItem>
                    <SelectItem value="not_listed">{t("settings.profile.sexNotListed")}</SelectItem>
                    <SelectItem value="prefer_not_to_say">{t("settings.profile.sexPreferNot")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-anatomy-model">{t("settings.profile.anatomyModel")}</FieldLabel>
              <Select value={anatomyModel} onValueChange={(value) => setAnatomyModel(value === "female" ? "female" : "male")}>
                <SelectTrigger className="w-full" id="profile-anatomy-model"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="male">{t("settings.profile.anatomyMale")}</SelectItem>
                    <SelectItem value="female">{t("settings.profile.anatomyFemale")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>{t("settings.profile.anatomyDescription")}</FieldDescription>
            </Field>



            <Field>
              <FieldLabel htmlFor="profile-units">{t("settings.profile.units")}</FieldLabel>
              <Select value={unitSystem} onValueChange={(value) => selectUnitSystem(value === "imperial" ? "imperial" : "metric")}>
                <SelectTrigger className="w-full" id="profile-units"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="metric">{t("settings.profile.unitsMetric")}</SelectItem>
                    <SelectItem value="imperial">{t("settings.profile.unitsImperial")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>{t("settings.profile.unitsDescription")}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor={isImperial ? "profile-height-ft" : "profile-height-cm"}>{t("settings.profile.height")}</FieldLabel>
              {isImperial ? (
                <div className="flex items-center gap-2">
                  <Input id="profile-height-ft" type="number" min={0} step={1} inputMode="numeric" value={heightFtText} onChange={(event) => setHeightFtText(event.target.value)} aria-label={t("settings.profile.unitFt")} className="w-16" />
                  <span className="text-sm text-quiet">{t("settings.profile.unitFt")}</span>
                  <Input id="profile-height-in" type="number" min={0} max={11} step={1} inputMode="numeric" value={heightInText} onChange={(event) => setHeightInText(event.target.value)} aria-label={t("settings.profile.unitIn")} className="w-16" />
                  <span className="text-sm text-quiet">{t("settings.profile.unitIn")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input id="profile-height-cm" type="number" min={0} step={0.1} inputMode="decimal" value={heightCmText} onChange={(event) => setHeightCmText(event.target.value)} />
                  <span className="text-sm text-quiet">{t("settings.profile.unitCm")}</span>
                </div>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor={isImperial ? "profile-weight-lb" : "profile-weight-kg"}>{t("settings.profile.weight")}</FieldLabel>
              {isImperial ? (
                <div className="flex items-center gap-2">
                  <Input id="profile-weight-lb" type="number" min={0} step={0.1} inputMode="decimal" value={weightLbText} onChange={(event) => setWeightLbText(event.target.value)} />
                  <span className="text-sm text-quiet">{t("settings.profile.unitLb")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input id="profile-weight-kg" type="number" min={0} step={0.1} inputMode="decimal" value={weightKgText} onChange={(event) => setWeightKgText(event.target.value)} />
                  <span className="text-sm text-quiet">{t("settings.profile.unitKg")}</span>
                </div>
              )}
            </Field>

            <Button className="sm:col-span-2 sm:justify-self-end" type="submit">{t("settings.profile.save")}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function NumberField({ label, name, value, min, max, step }: { label: string; name: string; value: number | null; min: number; max?: number; step: number }) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} type="number" min={min} max={max} step={step} defaultValue={value ?? ""} />
    </Field>
  );
}
