import test from "node:test";
import assert from "node:assert/strict";
import { resolveTheme } from "../src/theme";

test("system theme follows the platform color scheme", () => {
  assert.deepEqual(resolveTheme("system", { prefersDark: true, prefersContrast: false }), {
    colorScheme: "dark",
    contrast: false,
    dark: true,
  });
  assert.equal(resolveTheme("system", { prefersDark: false, prefersContrast: false }).colorScheme, "light");
});

test("an explicit theme overrides only the platform color scheme", () => {
  assert.equal(resolveTheme("light", { prefersDark: true, prefersContrast: false }).dark, false);
  assert.equal(resolveTheme("dark", { prefersDark: false, prefersContrast: false }).dark, true);
});

test("contrast follows either increased-contrast or forced-color preferences", () => {
  assert.equal(resolveTheme("light", { prefersDark: false, prefersContrast: true }).contrast, true);
  assert.equal(resolveTheme("dark", { prefersDark: true, prefersContrast: false, forcedColors: true }).contrast, true);
});
