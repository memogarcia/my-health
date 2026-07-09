#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const EXCLUDED_DIRS = new Set([
  '.expo',
  '.git',
  '.husky',
  '.impeccable',
  '.next',
  'android',
  'ios',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'target',
]);

const SKIPPED_FILES = new Set(['package-lock.json', 'Cargo.lock']);
const FILE_LIMITS = [
  {
    name: 'UI component',
    limit: 300,
    matches: (filePath) => filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
  },
  {
    name: 'Source/test module',
    limit: 500,
    matches: (filePath) =>
      ['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs', '.css', '.html', '.rs'].includes(
        path.extname(filePath).toLowerCase(),
      ),
  },
];

function isExcludedPath(filePath) {
  const parts = filePath.split(path.sep);
  return parts.some((part) => EXCLUDED_DIRS.has(part)) || SKIPPED_FILES.has(path.basename(filePath));
}

function getLimit(filePath) {
  return FILE_LIMITS.find((config) => config.matches(filePath));
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) walk(filePath, files);
      continue;
    }

    if (!isExcludedPath(filePath)) {
      const relativePath = path.relative('.', filePath);
      if (getLimit(relativePath)) files.push(relativePath);
    }
  }

  return files;
}

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;
}

const violations = [];

for (const filePath of walk('.')) {
  const rule = getLimit(filePath);
  const lines = countLines(filePath);
  if (lines > rule.limit) {
    violations.push({ filePath, lines, ...rule });
  }
}

if (violations.length > 0) {
  console.error('\nFiles exceeding size limits:\n');
  for (const violation of violations) {
    console.error(`  - [${violation.name}] ${violation.filePath}: ${violation.lines} LOC (limit: ${violation.limit})`);
  }
  console.error('\nSplit large files before committing.\n');
  process.exit(1);
}

console.log('File size checks passed');
