import test from "node:test";
import assert from "node:assert/strict";
import { summarizeAppleHealthXml } from "../src/apple-health-summary";

test("summarizeAppleHealthXml counts Apple Health records and workouts", () => {
  const summary = summarizeAppleHealthXml(
    `<HealthData>
      <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-07-01 10:00:00 -0700"/>
      <Workout workoutActivityType="HKWorkoutActivityTypeRunning" startDate="2026-07-02 10:00:00 -0700"></Workout>
    </HealthData>`,
    "export.xml",
  );

  assert.equal(summary.recordCount, 1);
  assert.equal(summary.workoutCount, 1);
  assert.equal(summary.startedAt, "2026-07-01");
  assert.equal(summary.endedAt, "2026-07-02");
});

test("summarizeAppleHealthXml ignores commented tags", () => {
  assert.throws(
    function importCommentOnlyXml() {
      summarizeAppleHealthXml(`<!-- <Record startDate="2026-07-01"/> -->`, "export.xml");
    },
    /No Apple Health records/,
  );
});
