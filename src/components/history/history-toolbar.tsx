import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, Search } from "lucide-react";
import { t } from "../../i18n";
import { X } from "../health-icons";
import { type LabView, type OrganFilter, type OrganOption } from "./history-helpers";

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 pl-8 pr-8"
      />
      {value ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={() => onChange("")}
          aria-label={t("history.search.clear")}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}

export function ViewToggle({ view, onChange }: { view: LabView; onChange: (view: LabView) => void }) {
  return (
    <div data-slot="button-group" className="inline-flex items-center rounded-lg border border-input p-0.5">
      <Button size="sm" variant={view === "grouped" ? "secondary" : "ghost"} aria-pressed={view === "grouped"} onClick={() => onChange("grouped")}>
        <LayoutGrid /> {t("history.view.grouped")}
      </Button>
      <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} aria-pressed={view === "list"} onClick={() => onChange("list")}>
        <List /> {t("history.view.list")}
      </Button>
    </div>
  );
}

export function OrganChips({
  options,
  value,
  onChange,
}: {
  options: OrganOption[];
  value: OrganFilter;
  onChange: (value: OrganFilter) => void;
}) {
  const all = value === "all" || !options.some((option) => option.key === value);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" className="rounded-full" variant={all ? "secondary" : "outline"} aria-pressed={all} onClick={() => onChange("all")}>
        {t("history.filter.all")}
      </Button>
      {options.map((option) => (
        <Button
          key={option.key}
          size="sm"
          className="rounded-full"
          variant={value === option.key ? "secondary" : "outline"}
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.name}
          <span className="ml-1 text-muted-foreground tnum">{option.count}</span>
        </Button>
      ))}
    </div>
  );
}
