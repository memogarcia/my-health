import { t } from "../../i18n";

export type DataCoverageItem = { key: string; label: string; count: number };

export function DataCoverageBars({ items }: { items: DataCoverageItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="coverage-bars" aria-label={t("charts.coverage.title")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("charts.coverage.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("charts.coverage.description")}</p>
        </div>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div className="coverage-row" key={item.key}>
            <span className="truncate text-xs text-muted-foreground">{item.label}</span>
            <span className="coverage-track"><span className="coverage-fill" style={{ width: `${item.count === 0 ? 0 : Math.max(4, (item.count / max) * 100)}%` }} /></span>
            <strong className="text-xs tnum">{item.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
