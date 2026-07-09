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
  const fallback = defaultValue || value || organs[0]?.key || "blood";
  return (
    <Field>
      <FieldLabel>{t("intake.result.organSystem")}</FieldLabel>
      <Select name={name} value={value} defaultValue={value === undefined ? fallback : undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full" id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>{organs.map((organ) => <SelectItem value={organ.key} key={organ.key}>{organ.name}</SelectItem>)}</SelectGroup>
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}
