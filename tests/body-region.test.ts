import test from "node:test";
import assert from "node:assert/strict";
import { bodyRegionAt } from "../src/body-region";

test("bodyRegionAt covers head, limbs, and feet in any view", () => {
  assert.deepEqual(bodyRegionAt(50, 8, 0), { region: "head", view: "front", angle: 0 });
  assert.deepEqual(bodyRegionAt(10, 30, 90), { region: "upperArm", view: "right", angle: 90 });
  assert.deepEqual(bodyRegionAt(50, 97, 180), { region: "foot", view: "back", angle: 180 });
  assert.deepEqual(bodyRegionAt(50, 47, -90), { region: "abdomen", view: "left", angle: 270 });
});
