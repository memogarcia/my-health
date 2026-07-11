import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const rustCatalog = readFileSync("src-tauri/src/platform/module_registry.rs", "utf8");
const rendererCatalog = readdirSync("src/modules", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readFileSync(`src/modules/${entry.name}/index.ts`, "utf8"));

function stringsInArray(source: string, name: string): string[] {
  const match = source.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\]`));
  return [...(match?.[1] || "").matchAll(/"([a-z][a-z0-9_-]*)"/g)].map((item) => item[1]);
}

test("renderer and Rust catalogs share module IDs and command ownership", () => {
  const rendererIds = new Set(
    rendererCatalog.map((source) => source.match(/id:\s*"([a-z][a-z0-9-]*)"/)?.[1]).filter(Boolean),
  );
  const rendererCommands = new Set(rendererCatalog.flatMap((source) => stringsInArray(source, "commands")));
  const rustIds = new Set(
    [...rustCatalog.matchAll(/id: crate::modules::([a-z_]+)::MODULE_ID/g)].map((match) => match[1].replaceAll("_", "-")),
  );
  const rustCommands = new Set(
    [...rustCatalog.matchAll(/commands: &\[([\s\S]*?)\]/g)].flatMap((match) =>
      [...match[1].matchAll(/"([a-z][a-z0-9_]*)"/g)].map((command) => command[1]),
    ),
  );

  assert.deepEqual(rendererIds, rustIds);
  assert.deepEqual(rendererCommands, rustCommands);
});
