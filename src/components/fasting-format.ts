import { t } from "../i18n";

export function formatCompactDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.ceil((totalSeconds % 3600) / 60);
  if (hours === 0) return t("fasting.timer.minutes", { minutes });
  if (minutes === 0 || minutes === 60) return t("fasting.timer.hours", { hours: hours + (minutes === 60 ? 1 : 0) });
  return t("fasting.timer.hoursMinutes", { hours, minutes });
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
