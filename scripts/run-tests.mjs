#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
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

let testOutDir = '';
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
if (testOutDir) rmSync(testOutDir, { recursive: true, force: true });
process.exit(result.status ?? 1);

function compileTypeScriptTests() {
  const outDir = path.join(tmpdir(), `me-health-dashboard-tests-${process.pid}`);
  testOutDir = outDir;
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  if (existsSync('node_modules')) symlinkSync(path.resolve('node_modules'), path.join(outDir, 'node_modules'), 'dir');
  const sourceFiles = files.filter((item) => /\.(ts|tsx)$/u.test(item) && !item.endsWith('.d.ts'));
  for (const file of sourceFiles) {
    const output = compiledPath(outDir, file);
    mkdirSync(path.dirname(output), { recursive: true });
    const result = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      fileName: file,
    });
    writeFileSync(output, addJsExtensions(result.outputText));
  }
  for (const file of files.filter((item) => item.endsWith('.json'))) {
    const output = path.join(outDir, file);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, readFileSync(file));
  }
  return tsTests.map((file) => compiledPath(outDir, file));
}

function compiledPath(outDir, file) {
  return path.join(outDir, file).replace(/\.(ts|tsx)$/u, '.js');
}

function addJsExtensions(code) {
  return code.replace(/(from\s+['"]\.{1,2}\/[^'".]+)(['"])/gu, '$1.js$2');
}
