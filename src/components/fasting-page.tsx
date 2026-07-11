import { useEffect, useMemo, useState } from "react";
import { Activity, Play, Square, Target, Pencil } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "../i18n";
import type { DashboardController } from "../use-dashboard-controller";
import { AlertTriangle, Timer } from "./health-icons";
import { FastingHistory } from "./fasting-history";
import { FASTING_STAGES, FastingStagesTimeline } from "./fasting-stages-timeline";
import { formatCompactDuration, formatElapsed } from "./fasting-format";
import { cn } from "@/lib/utils";

export function FastingPage({ controller }: { controller: DashboardController }) {
  const [now, setNow] = useState(Date.now());
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customHoursInput, setCustomHoursInput] = useState("");
  const fasting = controller.userState.fasting;
  const elapsedSeconds = fasting.activeStartedAt ? Math.max(0, Math.floor((now - Date.parse(fasting.activeStartedAt)) / 1000)) : 0;
  const elapsedHours = elapsedSeconds / 3600;
  const currentStage = [...FASTING_STAGES].reverse().find((stage) => elapsedHours >= stage.hours) || FASTING_STAGES[0];
  const progress = fasting.activeStartedAt ? Math.min(1, elapsedHours / fasting.targetHours) : 0;
  const targetRemainingSeconds = Math.max(0, Math.ceil(fasting.targetHours * 3600 - elapsedSeconds));
  const nextStage = FASTING_STAGES.find((stage) => stage.hours > elapsedHours);
  const targetStatus = targetRemainingSeconds === 0
    ? t("fasting.timer.targetReached")
    : t("fasting.timer.remaining", { time: formatCompactDuration(targetRemainingSeconds) });
  const nextZoneStatus = nextStage && nextStage.hours <= fasting.targetHours
    ? t("fasting.timer.nextZone", { zone: t(nextStage.titleKey), time: formatCompactDuration(Math.max(0, Math.ceil(nextStage.hours * 3600 - elapsedSeconds))) })
    : "";

  useEffect(() => {
    if (!fasting.activeStartedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [fasting.activeStartedAt]);

  const recentSessions = useMemo(() => fasting.sessions.slice(0, 5), [fasting.sessions]);
  
  // Format for the large display
  const [hoursStr, minutesStr, secondsStr] = formatElapsed(elapsedSeconds).split(":");

  return (
    <div className="relative grid gap-8 max-w-5xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out z-0">
      {/* Decorative ambient background blobs */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-primary/10 via-transparent to-accent-strong/10 blur-[100px] -z-10 pointer-events-none rounded-full" />
      
      <Alert className="rounded-2xl border-primary/20 bg-primary/5 backdrop-blur-xl shadow-lg ring-1 ring-primary/10">
        <AlertTriangle className="text-primary size-5" />
        <div className="ml-2">
          <AlertTitle className="text-ink font-bold tracking-tight">{t("fasting.safety.title")}</AlertTitle>
          <AlertDescription className="text-muted-ink leading-relaxed mt-1">{t("fasting.safety.description")}</AlertDescription>
        </div>
      </Alert>
      
      <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]" aria-label={t("fasting.timer.label")}>
        
        {/* Left Column: Timer */}
        <div className="flex flex-col gap-6">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-b from-surface/80 to-surface/40 shadow-2xl backdrop-blur-3xl rounded-[2.5rem] transition-all duration-500 hover:shadow-primary/5 ring-1 ring-white/10 dark:ring-white/5">
            <CardHeader className="pb-2 pt-8 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
                <Timer className="size-5 text-primary" />
                {t("fasting.timer.title")}
              </CardTitle>
              {fasting.activeStartedAt && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
                  <div className="size-2 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t("fasting.timer.inProgress")}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-8 pb-8 pt-4 flex flex-col items-center">
              
              {/* SVG Glowing Ring Progress */}
              <div className="relative flex size-64 shrink-0 items-center justify-center my-6 group">
                {fasting.activeStartedAt && (
                  <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full mix-blend-screen transition-opacity duration-1000 group-hover:opacity-80" />
                )}
                <svg className="absolute inset-0 size-full -rotate-90 drop-shadow-xl" viewBox="0 0 200 200">
                  <circle
                    cx="100" cy="100" r="90"
                    className="stroke-surface-soft fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="100" cy="100" r="90"
                    className="stroke-primary fill-none transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 90}
                    strokeDashoffset={(2 * Math.PI * 90) * (1 - progress)}
                    style={{ filter: "drop-shadow(0 0 12px rgba(var(--color-primary-rgb), 0.5))" }}
                  />
                </svg>
                <div className="relative flex flex-col items-center justify-center z-10 transition-transform duration-500 group-hover:scale-105">
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black tracking-tighter text-ink tnum drop-shadow-sm">{hoursStr}</span>
                    <span className="text-3xl font-bold text-muted-ink/50 mb-2">:</span>
                    <span className="text-6xl font-black tracking-tighter text-ink tnum drop-shadow-sm">{minutesStr}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2 text-primary font-bold bg-primary/10 px-3 py-0.5 rounded-full backdrop-blur-sm border border-primary/20">
                    <span className="text-sm tracking-widest">{secondsStr}</span>
                    <span className="text-[10px] uppercase">SEC</span>
                  </div>
                </div>
              </div>
              
              {/* Fasting Info Panel */}
              <div className="w-full flex flex-col gap-4">
                <div className="grid gap-1.5 rounded-2xl bg-canvas/60 p-5 border border-border/50 backdrop-blur-md shadow-inner transition-colors duration-300 hover:bg-canvas/80">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                    <Activity className="size-3.5" />
                    {t("fasting.timer.currentZone")}
                  </span>
                  <strong className="text-xl font-bold tracking-tight text-ink">
                    {fasting.activeStartedAt ? t(currentStage.titleKey) : t("fasting.timer.notStarted")}
                  </strong>
                  <p className="text-sm leading-relaxed text-muted-ink">
                    {fasting.activeStartedAt ? t(currentStage.descriptionKey) : t("fasting.timer.readyDescription")}
                  </p>
                </div>
                
                {fasting.activeStartedAt && (
                  <div className="rounded-2xl bg-surface-soft p-4 border border-border/30 flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-ink uppercase tracking-wider">{t("fasting.target.label")}</span>
                    <div className="flex justify-between items-end">
                      <p className="text-sm font-semibold text-ink shadow-sm" role="status">
                        {nextZoneStatus ? t("fasting.timer.statusWithNext", { status: targetStatus, next: nextZoneStatus }) : targetStatus}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mt-2 w-full">
                  {fasting.activeStartedAt ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-14 rounded-2xl border-border/80 bg-surface/50 text-base font-semibold backdrop-blur-xl transition-all hover:bg-destructive hover:text-white hover:border-destructive hover:shadow-[0_0_20px_rgba(var(--color-attention-rgb),0.4)] active:scale-[0.98]" 
                      onClick={() => void controller.endFasting()}
                    >
                      <Square className="mr-2 size-5 fill-current opacity-70" /> {t("fasting.timer.end")}
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      className="w-full h-14 rounded-2xl text-base font-bold shadow-[0_4px_20px_rgba(var(--color-primary-rgb),0.4)] transition-all hover:shadow-[0_8px_30px_rgba(var(--color-primary-rgb),0.6)] hover:brightness-110 active:scale-[0.98] border border-white/20" 
                      onClick={() => void controller.startFasting(fasting.targetHours)}
                    >
                      <Play className="mr-2 size-5 fill-current" /> {t("fasting.timer.start")}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Target Selection Card */}
          <Card className="overflow-hidden border border-border/50 bg-surface/40 shadow-lg backdrop-blur-xl rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-ink flex items-center gap-2">
                  <Target className="size-4" />
                  {t("fasting.target.label")}
                </p>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{t("fasting.target.selectedHours", { hours: fasting.targetHours })}</span>
              </div>
              {isCustomMode ? (
                <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      min="1" 
                      max="720"
                      value={customHoursInput}
                      onChange={(e) => setCustomHoursInput(e.target.value)}
                      placeholder={t("fasting.target.customPlaceholder")}
                      className="w-full h-14 bg-canvas/50 border border-border/50 rounded-2xl px-4 text-lg font-bold text-ink outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
                      disabled={Boolean(fasting.activeStartedAt)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-widest text-muted-ink">HRS</span>
                  </div>
                  <Button 
                    type="button"
                    disabled={Boolean(fasting.activeStartedAt) || !customHoursInput || isNaN(Number(customHoursInput)) || Number(customHoursInput) <= 0}
                    onClick={() => {
                      const val = Number(customHoursInput);
                      if (val > 0) {
                        void controller.setFastingTarget(val);
                        setIsCustomMode(false);
                        setCustomHoursInput("");
                      }
                    }}
                    className="h-14 rounded-2xl px-6 font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    {t("fasting.target.apply")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCustomMode(false)}
                    className="h-14 rounded-2xl px-4 text-muted-ink hover:text-ink hover:bg-canvas/50"
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {[12, 14, 16, 18, 20, 24, 36, 48, 72].map((hours) => {
                    const isSelected = fasting.targetHours === hours;
                    return (
                      <button 
                        key={hours} 
                        type="button" 
                        disabled={Boolean(fasting.activeStartedAt)} 
                        onClick={() => void controller.setFastingTarget(hours)}
                        className={cn(
                          "relative flex flex-col items-center justify-center py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected 
                            ? "bg-primary text-white shadow-[0_4px_15px_rgba(var(--color-primary-rgb),0.3)] scale-105 z-10" 
                            : "bg-canvas/50 text-muted-ink border border-border/50 hover:bg-surface hover:text-ink hover:shadow-md disabled:opacity-50 disabled:hover:bg-canvas/50 disabled:hover:scale-100 disabled:hover:shadow-none"
                        )}
                      >
                        <span className="text-xl sm:text-2xl font-black tracking-tight">{hours}</span>
                        <span className={cn("text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 sm:mt-1", isSelected ? "text-white/80" : "text-muted-ink/70")}>HRS</span>
                        {isSelected && (
                          <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-white/20" />
                        )}
                      </button>
                    );
                  })}
                  <button 
                    type="button"
                    disabled={Boolean(fasting.activeStartedAt)}
                    onClick={() => setIsCustomMode(true)}
                    className="relative flex flex-col items-center justify-center py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary bg-canvas/50 text-muted-ink border border-border/50 hover:bg-surface hover:text-ink hover:shadow-md disabled:opacity-50 disabled:hover:bg-canvas/50 disabled:hover:shadow-none"
                  >
                    <Pencil className="size-5 sm:size-6 mb-1 opacity-70" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-ink/70">{t("fasting.target.custom")}</span>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column: Stages */}
        <FastingStagesTimeline activeStartedAt={fasting.activeStartedAt} currentStage={currentStage} />
      </section>

      {/* History Section */}
      {recentSessions.length > 0 && (
        <FastingHistory sessions={recentSessions} onDelete={(id) => void controller.deleteFastingSession(id)} />
      )}
    </div>
  );
}


