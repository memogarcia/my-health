import { useId } from "react";
import type { BiologicalAgeReport } from "../../genetics-model";
import { biologicalAgeSystems, formatAge, systemLabel } from "../../genetics-model";
import { t } from "../../i18n";

const WIDTH = 720;
const LEFT = 156;
const RIGHT = 28;
const TOP = 54;
const ROW_HEIGHT = 38;

export function BiologicalAgeChart({ report }: { report: BiologicalAgeReport }) {
  const titleId = useId();
  const scoreByKey = new Map(report.systemScores.map((score) => [score.systemKey, score.age]));
  const scores = biologicalAgeSystems.flatMap((system) => {
    const age = scoreByKey.get(system.key);
    return age === undefined ? [] : [{ ...system, age }];
  });
  const values = [report.chronologicalAge, report.overallAge, ...scores.map((score) => score.age)];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(2, (rawMax - rawMin) * 0.12);
  const min = Math.max(0, Math.floor(rawMin - padding));
  const max = Math.max(min + 1, Math.ceil(rawMax + padding));
  const plotWidth = WIDTH - LEFT - RIGHT;
  const height = TOP + scores.length * ROW_HEIGHT + 34;
  const scaleX = (value: number) => LEFT + ((value - min) / (max - min)) * plotWidth;
  const chronologicalX = scaleX(report.chronologicalAge);
  const overallX = scaleX(report.overallAge);
  const lowest = scores.reduce((current, score) => score.age < current.age ? score : current, scores[0]);
  const highest = scores.reduce((current, score) => score.age > current.age ? score : current, scores[0]);

  return (
    <figure className="grid gap-3" aria-labelledby={`${titleId}-title ${titleId}-description`}>
      <div>
        <h3 className="text-sm font-semibold" id={`${titleId}-title`}>{t("genetics.chart.title")}</h3>
        <p className="text-sm text-muted-foreground" id={`${titleId}-description`}>{t("genetics.chart.description")}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card p-3">
        <svg
          className="min-w-[620px]"
          role="img"
          aria-label={t("genetics.chart.label")}
          viewBox={`0 0 ${WIDTH} ${height}`}
        >
          <line x1={chronologicalX} x2={chronologicalX} y1={30} y2={height - 18} stroke="var(--muted-foreground)" strokeDasharray="5 5" />
          <line x1={overallX} x2={overallX} y1={30} y2={height - 18} stroke="var(--primary)" strokeWidth="2" />
          <text x={chronologicalX} y={17} textAnchor="middle" fill="var(--muted-foreground)" fontSize="12">
            {formatAge(report.chronologicalAge)}
          </text>
          <text x={overallX} y={17} textAnchor="middle" fill="var(--primary)" fontSize="12" fontWeight="600">
            {formatAge(report.overallAge)}
          </text>
          {scores.map((score, index) => {
            const y = TOP + index * ROW_HEIGHT;
            return (
              <g key={score.key}>
                <text x={LEFT - 12} y={y + 4} textAnchor="end" fill="var(--foreground)" fontSize="12">{score.label}</text>
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} stroke="var(--border)" />
                <circle cx={scaleX(score.age)} cy={y} r="13" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
                <text x={scaleX(score.age)} y={y + 4} textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="600">
                  {formatAge(score.age)}
                </text>
              </g>
            );
          })}
          <text x={LEFT} y={height - 4} textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">{min}</text>
          <text x={WIDTH - RIGHT} y={height - 4} textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">{max}</text>
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><i className="h-px w-5 border-t border-dashed border-muted-foreground" />{t("genetics.chart.chronological")}: {formatAge(report.chronologicalAge)}</span>
        <span className="inline-flex items-center gap-2"><i className="h-0.5 w-5 bg-primary" />{t("genetics.chart.overall")}: {formatAge(report.overallAge)}</span>
      </div>
      {lowest && highest ? (
        <p className="text-sm text-muted-foreground">
          {t("genetics.chart.summary", {
            lowestSystem: systemLabel(lowest.key),
            lowestAge: formatAge(lowest.age),
            highestSystem: systemLabel(highest.key),
            highestAge: formatAge(highest.age),
          })}
        </p>
      ) : null}
    </figure>
  );
}
