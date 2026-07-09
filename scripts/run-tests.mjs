#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOTS = ['tests', 'test', 'src'];
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);
const NODE_TEST_PATTERN = /(?:^|[.-])(?:test|spec)\.(?:cjs|mjs|js)$/u;
const TS_TEST_PATTERN = /(?:^|[.-])(?:test|spec)\.(?:ts|tsx|mts|cts)$/u;

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) walk(filePath, files);
      continue;
    }

    if (entry.isFile()) files.push(filePath);
  }

  return files;
}

const files = ROOTS.flatMap((root) => walk(root));
const nodeTests = files.filter((file) => NODE_TEST_PATTERN.test(path.basename(file))).sort();
const tsTests = files.filter((file) => TS_TEST_PATTERN.test(path.basename(file))).sort();

const compiledTsTests = tsTests.length > 0 ? compileTypeScriptTests(tsTests) : [];
const tests = [...nodeTests, ...compiledTsTests];

if (tests.length === 0) {
  console.log('No JavaScript tests found; skipping node --test');
  process.exit(0);
}

for (const file of tests) {
  if (!statSync(file).isFile()) continue;
  console.log(`  ${file}`);
}

const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
process.exit(result.status ?? 1);

function compileTypeScriptTests() {
  const outDir = path.join(tmpdir(), `me-health-dashboard-tests-${process.pid}`);
  rmSync(outDir, { recursive: true, force: true });
  for (const file of files.filter((item) => item.endsWith('.ts') && !item.endsWith('.d.ts'))) {
    const output = path.join(outDir, file).replace(/\.ts$/u, '.js');
    mkdirSync(path.dirname(output), { recursive: true });
    const result = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
      fileName: file,
    });
    writeFileSync(output, addJsExtensions(result.outputText));
  }
  for (const file of files.filter((item) => item.endsWith('.json'))) {
    const output = path.join(outDir, file);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, readFileSync(file));
  }
  return tsTests.map((file) => path.join(outDir, file).replace(/\.ts$/u, '.js'));
}

function addJsExtensions(code) {
  return code.replace(/(from\s+['"]\.{1,2}\/[^'".]+)(['"])/gu, '$1.js$2');
}
