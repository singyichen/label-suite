#!/usr/bin/env node
/**
 * check-css-tokens.mjs — Fail when a prototype file uses var(--x) for a custom
 * property that is neither defined in design/prototype/assets/tokens.css nor
 * declared in the file itself. A var() fallback does not exempt the usage.
 *
 * Usage:
 *   node scripts/check-css-tokens.mjs [--root <repo-root>] [--allowlist <json>]
 *
 * The allowlist is a JSON array of { file, token, reason }; every entry needs a
 * non-empty reason. Exit codes: 0 clean, 1 violations or invalid allowlist.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROTOTYPE = 'design/prototype';
const TOKENS = `${PROTOTYPE}/assets/tokens.css`;
const SKIP_DIRS = new Set(['node_modules', 'tests', 'tests-node']);

function parseArgs(argv) {
  const opts = {
    root: path.resolve(SCRIPT_DIR, '..'),
    allowlist: path.join(SCRIPT_DIR, 'css-token-allowlist.json'),
  };
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--root') opts.root = path.resolve(argv[i + 1]);
    else if (argv[i] === '--allowlist') opts.allowlist = path.resolve(argv[i + 1]);
    else fail(`unknown argument: ${argv[i]}`);
  }
  return opts;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (/\.(html|css)$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const blank = (m) => m.replace(/[^\n]/g, ' ');

// Replace text with spaces, keeping newlines so line numbers survive.
function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, blank);
}

// The CSS-bearing text of a file. .css is used whole; for .html only <style>
// contents and style="..." values count, so comments, scripts and prose are
// neither scanned for var() nor trusted for `--x:` declarations.
function cssView(text, file) {
  if (file.endsWith('.css')) return stripCssComments(text);
  const html = text.replace(/<!--[\s\S]*?-->/g, blank);
  const keep = Array.from(html, () => false);
  const mark = (re, group) => {
    for (const m of html.matchAll(re)) {
      const start = m.index + m[0].indexOf(m[group]);
      for (let i = start; i < start + m[group].length; i++) keep[i] = true;
    }
  };
  mark(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, 1);
  mark(/\sstyle\s*=\s*"([^"]*)"/gi, 1);
  mark(/\sstyle\s*=\s*'([^']*)'/gi, 1);
  return stripCssComments(Array.from(html, (c, i) => (keep[i] || c === '\n' ? c : ' ')).join(''));
}

function declared(text) {
  return new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

function loadAllowlist(file) {
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(entries)) fail('allowlist must be a JSON array');
  const errors = [];
  const seen = new Set();
  for (const e of entries) {
    const label = `allowlist entry ${e?.file} ${e?.token}`;
    if (typeof e?.file !== 'string' || typeof e?.token !== 'string' || e.file === '' || e.token === '') {
      errors.push(`${label}: file and token must be non-empty strings`);
    } else if (typeof e.reason !== 'string' || e.reason.trim() === '') {
      errors.push(`${label}: reason must be a non-empty string`);
    } else if (seen.has(`${e.file}\u0000${e.token}`)) {
      errors.push(`duplicate ${label}`);
    }
    seen.add(`${e?.file}\u0000${e?.token}`);
  }
  if (errors.length > 0) fail(errors.join('\n'));
  return seen;
}

const { root, allowlist } = parseArgs(process.argv.slice(2));
const allowed = loadAllowlist(allowlist);
const tokensPath = path.join(root, TOKENS);
const global = fs.existsSync(tokensPath)
  ? declared(cssView(fs.readFileSync(tokensPath, 'utf8'), tokensPath))
  : new Set();

const violations = [];
const used = new Set();
for (const abs of walk(path.join(root, PROTOTYPE)).sort()) {
  const rel = path.relative(root, abs).split(path.sep).join('/');
  const text = cssView(fs.readFileSync(abs, 'utf8'), rel);
  const local = declared(text);
  for (const m of text.matchAll(/var\(\s*(--[\w-]+)/gi)) {
    const token = m[1];
    if (local.has(token) || global.has(token)) continue;
    const key = `${rel}\u0000${token}`;
    if (allowed.has(key)) {
      used.add(key);
      continue;
    }
    const line = text.slice(0, m.index).split('\n').length;
    violations.push(`${rel}:${line}: undefined token ${token}`);
  }
}
for (const key of allowed) {
  if (!used.has(key)) {
    const [file, token] = key.split('\u0000');
    violations.push(`stale allowlist entry ${file} ${token}: no longer needed, remove it`);
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`${violations.length} problem(s)`);
  process.exit(1);
}
console.log('check-css-tokens: OK');
