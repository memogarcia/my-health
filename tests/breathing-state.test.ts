import assert from "node:assert/strict";
import test from "node:test";
import { advanceBreathingSession, createBreathingSession } from "../src/breathing-state";

const paced = [{ seconds: 4 }, { seconds: 6 }];

test("advanceBreathingSession moves through phases without losing delayed timer time", () => {
  const session = createBreathingSession(paced, "running");
  const next = advanceBreathingSession(session, paced, undefined, 4_500);
  assert.equal(next.phaseIndex, 1);
  assert.equal(next.remainingMs, 5_500);
  assert.equal(next.completedCycles, 0);
});

test("advanceBreathingSession stops a finite technique at its cycle limit", () => {
  const session = createBreathingSession([{ seconds: 2 }, { seconds: 2 }], "running");
  const next = advanceBreathingSession(session, [{ seconds: 2 }, { seconds: 2 }], 2, 8_000);
  assert.equal(next.status, "complete");
  assert.equal(next.completedCycles, 2);
  assert.equal(next.remainingMs, 0);
});

test("advanceBreathingSession leaves paused sessions unchanged", () => {
  const session = { ...createBreathingSession(paced), status: "paused" as const };
  assert.equal(advanceBreathingSession(session, paced, undefined, 8_000), session);
});
