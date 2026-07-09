#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOTS = ['src', 'index.html'];
const BASELINE_PATH = 'scripts/i18n-baseline.json';
const EXTENSIONS = new Set(['.html', '.js', '.jsx', '.ts', '.tsx']);
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'src-tauri', 'i18n']);
const TRANSLATABLE_ATTRIBUTES = new Set(['aria-label', 'aria-description', 'placeholder', 'title', 'alt']);
const IGNORED_STRINGS = new Set(['true', 'false', 'null', 'undefined', 'button', 'dialog', 'img', 'input', 'label', 'main', 'nav', 'section', 'span']);

function isExcludedPath(filePath) {
  return filePath.split(path.sep).some((part) => EXCLUDED_DIRS.has(part));
}

function walk(entryPath, files = []) {
  if (!existsSync(entryPath) || isExcludedPath(entryPath)) return files;
  const stats = statSync(entryPath);
  if (stats.isFile()) {
    if (EXTENSIONS.has(path.extname(entryPath))) files.push(entryPath);
    return files;
  }
  for (const entry of readdirSync(entryPath, { withFileTypes: true })) walk(path.join(entryPath, entry.name), files);
  return files;
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (content.charCodeAt(i) === 10) line += 1;
  return line;
}

function normalizeText(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\$\{[^}]*\}/g, '{value}')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTranslatable(value) {
  const text = normalizeText(value);
  if (!text || text.length < 2) return false;
  if (IGNORED_STRINGS.has(text)) return false;
  if (!/[a-zA-Z]/.test(text)) return false;
  if (/^(https?:\/\/|\/|\.\/|\.\.\/|#)/.test(text)) return false;
  if (/^[\d.,:%$€£¥+\-/\s]+$/.test(text)) return false;
  if (/^[A-Z0-9_]+$/.test(text)) return false;
  if (/^[a-z][a-z0-9-]*$/i.test(text) && text.length <= 3) return false;
  return true;
}

function addViolation(violations, file, content, index, type) {
  const normalized = normalizeText(content);
  if (!isTranslatable(normalized)) return;
  violations.push({ file, line: lineNumberForIndex(readFileSync(file, 'utf8'), index), type, content: normalized });
}

function tagName(node) {
  return ts.isIdentifier(node) ? node.text : node.getText();
}

function isCodeText(node) {
  const parent = node.parent;
  return ts.isJsxElement(parent) && tagName(parent.openingElement.tagName) === 'code';
}

function templateText(node) {
  return [node.head.text, ...node.templateSpans.map((span) => `{${span.expression.getText()}}${span.literal.text}`)].join('');
}

function expressionStrings(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) return [templateText(node)];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return expressionStrings(node.expression);
  if (ts.isConditionalExpression(node)) return [...expressionStrings(node.whenTrue), ...expressionStrings(node.whenFalse)];
  if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.BarBarToken || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) {
    return [...expressionStrings(node.left), ...expressionStrings(node.right)];
  }
  return [];
}

function scanJsxFile(file) {
  const content = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations = [];

  function visit(node) {
    if (ts.isJsxText(node) && !isCodeText(node)) addViolation(violations, file, node.getFullText(source), node.getStart(source), 'jsx-text');
    if (ts.isJsxAttribute(node) && TRANSLATABLE_ATTRIBUTES.has(node.name.text) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) addViolation(violations, file, node.initializer.text, node.initializer.getStart(source), 'attribute');
      if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        for (const value of expressionStrings(node.initializer.expression)) addViolation(violations, file, value, node.initializer.getStart(source), 'attribute');
      }
    }
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      for (const value of expressionStrings(node.expression)) addViolation(violations, file, value, node.getStart(source), 'jsx-expression');
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left)) {
      const name = node.left.name.text;
      if (name === 'textContent' || name === 'innerText') {
        for (const value of expressionStrings(node.right)) addViolation(violations, file, value, node.right.getStart(source), 'dom-text');
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return violations;
}

function scanHtmlFile(file) {
  const content = readFileSync(file, 'utf8');
  const violations = [];
  const attrPattern = /\b(aria-label|aria-description|placeholder|title|alt)\s*=\s*(["'`])([\s\S]*?)\2/g;
  let match;
  while ((match = attrPattern.exec(content)) !== null) addViolation(violations, file, match[3], match.index, 'attribute');
  const textPattern = />([^<>{}]*[a-zA-Z][^<>{}]*)</g;
  while ((match = textPattern.exec(content)) !== null) addViolation(violations, file, match[1], match.index, 'html-text');
  return violations;
}

function scanFile(file) {
  return path.extname(file) === '.html' ? scanHtmlFile(file) : scanJsxFile(file);
}

const violations = ROOTS.flatMap((root) => walk(root)).flatMap((file) => scanFile(file));

if (process.env.I18N_WRITE_BASELINE === '1') {
  mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), note: 'No hardcoded user-facing UI strings are allowed.', total: violations.length, violations }, null, 2)}\n`);
  console.log(`Wrote i18n baseline with ${violations.length} violation(s) to ${BASELINE_PATH}`);
  process.exit(0);
}

if (violations.length > 0) {
  console.error('\nHardcoded UI strings detected:\n');
  for (const violation of violations) console.error(`  - ${violation.file}:${violation.line} ${violation.type}: "${violation.content}"`);
  console.error('\nMove user-facing copy into src/i18n/locales/en.json and render it with t().\n');
  process.exit(1);
}

console.log('No hardcoded UI strings detected');
