#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const BASE_LOCALE = process.env.I18N_BASE_LOCALE || 'en';
const LOCALE_ROOTS = ['src/i18n/locales', 'src/locales', 'locales', 'public/locales'];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function flattenTypes(value, prefix = '', output = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenTypes(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  output[prefix] = Array.isArray(value) ? 'array' : typeof value;
  return output;
}

function flattenStrings(value, prefix = '', output = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenStrings(child, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  if (typeof value === 'string') output[prefix] = value;
  return output;
}

function placeholders(value) {
  const names = new Set();
  const pattern = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=}|,)/g;
  let match;
  while ((match = pattern.exec(value)) !== null) names.add(match[1]);
  return Array.from(names).sort();
}

function sameList(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function listJsonFiles(dir, prefix = '') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      files.push(...listJsonFiles(absolutePath, relativePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) files.push(relativePath);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function mergeLocaleDirectory(dir) {
  const files = listJsonFiles(dir);
  const merged = {};

  for (const file of files) {
    const namespace = file.replace(/\.json$/u, '').split(path.sep).join('.');
    merged[namespace] = readJson(path.join(dir, file));
  }

  return merged;
}

function loadLocaleCatalogs(root) {
  const baseFile = path.join(root, `${BASE_LOCALE}.json`);
  const baseDir = path.join(root, BASE_LOCALE);

  if (existsSync(baseFile)) {
    return readdirSync(root)
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => ({
        locale: fileName.replace(/\.json$/u, ''),
        catalog: readJson(path.join(root, fileName)),
      }));
  }

  if (existsSync(baseDir) && statSync(baseDir).isDirectory()) {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        locale: entry.name,
        catalog: mergeLocaleDirectory(path.join(root, entry.name)),
      }));
  }

  return [];
}

const localeRoot = LOCALE_ROOTS.find((root) => existsSync(root));

if (!localeRoot) {
  console.log('No locale catalog found; skipping locale shape check');
  process.exit(0);
}

const catalogs = loadLocaleCatalogs(localeRoot);
const base = catalogs.find((catalog) => catalog.locale === BASE_LOCALE);

if (!base || catalogs.length <= 1) {
  console.log(`Locale catalog found at ${localeRoot}, but no secondary locales to compare`);
  process.exit(0);
}

const baseTypes = flattenTypes(base.catalog);
const baseStrings = flattenStrings(base.catalog);
const failures = [];

for (const candidate of catalogs.filter((catalog) => catalog.locale !== BASE_LOCALE)) {
  const candidateTypes = flattenTypes(candidate.catalog);
  const candidateStrings = flattenStrings(candidate.catalog);

  for (const key of Object.keys(baseTypes)) {
    if (!(key in candidateTypes)) failures.push(`${candidate.locale}: missing ${key}`);
    else if (candidateTypes[key] !== baseTypes[key]) {
      failures.push(`${candidate.locale}: ${key} type is ${candidateTypes[key]}, expected ${baseTypes[key]}`);
    }
  }

  for (const key of Object.keys(candidateTypes)) {
    if (!(key in baseTypes)) failures.push(`${candidate.locale}: extra ${key}`);
  }

  for (const [key, baseValue] of Object.entries(baseStrings)) {
    if (!(key in candidateStrings)) continue;
    const basePlaceholders = placeholders(baseValue);
    const candidatePlaceholders = placeholders(candidateStrings[key]);
    if (!sameList(basePlaceholders, candidatePlaceholders)) {
      failures.push(
        `${candidate.locale}: ${key} placeholders ${candidatePlaceholders.join(',') || '(none)'}, expected ${basePlaceholders.join(',') || '(none)'}`
      );
    }
  }
}

if (failures.length > 0) {
  console.error('\nLocale catalog mismatch:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('');
  process.exit(1);
}

console.log('Locale shape check passed');
