#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['src'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);
const CONSOLE_CALL = /\bconsole\.(?:assert|clear|count|countReset|debug|dir|error|group|groupCollapsed|groupEnd|info|log|table|time|timeEnd|trace|warn)\s*\(/g;
const IGNORE_LINE_MARKER = 'check-console-ignore-line';
const IGNORE_NEXT_LINE_MARKER = 'check-console-ignore-next-line';

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
      continue;
    }

    const filePath = path.join(dir, entry.name);
    if (EXTENSIONS.has(path.extname(filePath))) files.push(filePath);
  }

  return files;
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

const violations = [];

for (const root of ROOTS) {
  for (const filePath of walk(root)) {
    if (!statSync(filePath).isFile()) continue;

    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let match;

    while ((match = CONSOLE_CALL.exec(content)) !== null) {
      const lineNumber = lineNumberForIndex(content, match.index);
      const line = lines[lineNumber - 1] ?? '';
      const previousLine = lines[lineNumber - 2] ?? '';

      if (line.includes(IGNORE_LINE_MARKER) || previousLine.includes(IGNORE_NEXT_LINE_MARKER)) {
        continue;
      }

      violations.push({ filePath, lineNumber, call: match[0].replace(/\s*\($/, '') });
    }
  }
}

if (violations.length > 0) {
  console.error('\nConsole statements found in src/:\n');
  for (const violation of violations) {
    console.error(`  ${violation.filePath}:${violation.lineNumber} ${violation.call}`);
  }
  console.error('\nRemove debug logging before committing, or add a narrow ignore marker with a reason.\n');
  process.exit(1);
}

console.log('Console check passed');
