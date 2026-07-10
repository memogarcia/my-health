import { useId } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrganSummary } from "../dashboard-model";
import { t } from "../i18n";

export function OrganSelect({
  id,
  name = "organKey",
  organs,
  value,
  defaultValue,
  onChange,
  description,
}: {
  id?: string;
  name?: string;
  organs: OrganSummary[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  description?: string;
}) {
  const generatedId = useId();
  const fallback = defaultValue || value || organs[0]?.key || "blood";
  const triggerId = id || `organ-select-${generatedId}`;
  const descriptionId = description ? `${triggerId}-description` : undefined;
  return (
    <Field>
      <FieldLabel htmlFor={triggerId}>{t("intake.result.organSystem")}</FieldLabel>
      <Select name={name} value={value} defaultValue={value === undefined ? fallback : undefined} onValueChange={onChange}>
        <SelectTrigger aria-describedby={descriptionId} className="w-full" id={triggerId}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>{organs.map((organ) => <SelectItem value={organ.key} key={organ.key}>{organ.name}</SelectItem>)}</SelectGroup>
        </SelectContent>
      </Select>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
    </Field>
  );
}
