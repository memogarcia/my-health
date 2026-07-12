import type { DisplaySnapshot, UserState } from "./dashboard-model";

/**
 * The complete structured health history available to an AI request. Keep this
 * limited to health records: diagnostics and raw report files stay local.
 */
export function buildHealthContext(display: DisplaySnapshot, userState: UserState) {
  return {
    profile: userState.profile,
    labs: display.latestLabResults.map((lab) => ({
      date: lab.measuredAt,
      organKey: lab.organKey,
      marker: lab.marker,
      value: lab.value,
      unit: lab.unit,
      referenceRange: lab.referenceRange,
      referenceLow: lab.referenceLow,
      referenceHigh: lab.referenceHigh,
      flag: lab.flag,
      followUpStatus: lab.status,
      notes: lab.notes,
      reportSourceName: lab.reportSourceName,
    })),
    symptoms: display.recentSymptoms.map((symptom) => ({
      date: symptom.observedAt,
      organKey: symptom.organKey,
      name: symptom.name,
      severity: symptom.severity,
      notes: symptom.notes,
    })),
    conditions: display.conditions.map((condition) => ({
      diagnosedAt: condition.diagnosedAt,
      organKey: condition.organKey,
      name: condition.name,
      status: condition.status,
      notes: condition.notes,
    })),
    regimen: display.regimenItems.map((item) => ({
      kind: item.kind,
      name: item.name,
      dose: item.dose,
      unit: item.unit,
      frequency: item.frequency,
      startDate: item.startDate,
      stopDate: item.stopDate,
      active: item.active,
      reason: item.reason,
      notes: item.notes,
    })),
    activityHistory: userState.activityEntries.map((entry) => ({
      date: entry.loggedAt,
      activityName: entry.activityName,
      durationMinutes: entry.durationMinutes,
      cigarettes: entry.cigarettes,
      drinks: entry.drinks,
      notes: entry.notes,
    })),
    dietHistory: userState.dietEntries.map((entry) => ({
      date: entry.loggedAt,
      meal: entry.meal,
      food: entry.title,
      notes: entry.notes,
    })),
    fasting: {
      activeStartedAt: userState.fasting.activeStartedAt,
      targetHours: userState.fasting.targetHours,
      history: userState.fasting.sessions.map((session) => ({
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        targetHours: session.targetHours,
      })),
    },
    bodyNotes: userState.bodyNotes.map((note) => ({
      area: note.area,
      angle: note.angle,
      x: note.x,
      y: note.y,
      note: note.note,
      createdAt: note.createdAt,
    })),
    appleHealthImports: userState.appleHealthImports.map((entry) => ({
      sourceName: entry.sourceName,
      importedAt: entry.importedAt,
      recordCount: entry.recordCount,
      workoutCount: entry.workoutCount,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
    })),
    labReports: display.labReports.map((report) => ({
      sourceName: report.sourceName,
      fileType: report.fileType,
      resultCount: report.resultCount,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    })),
    organStatuses: display.organs.map((organ) => ({
      key: organ.key,
      name: organ.name,
      system: organ.system,
      status: organ.status,
    })),
    savedRecommendations: display.aiRecommendations,
  };
}
