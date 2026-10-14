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

// Replace comment text with spaces, keeping newlines so line numbers survive.
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function declared(text) {
  return new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

function loadAllowlist(file) {
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bad = entries.filter((e) => typeof e.reason !== 'string' || e.reason.trim() === '');
  if (bad.length > 0) {
    fail(
      bad.map((e) => `allowlist entry ${e.file} ${e.token}: reason must be a non-empty string`).join('\n'),
    );
  }
  return new Set(entries.map((e) => `${e.file}\u0000${e.token}`));
}

const { root, allowlist } = parseArgs(process.argv.slice(2));
const allowed = loadAllowlist(allowlist);
const tokensPath = path.join(root, TOKENS);
const global = fs.existsSync(tokensPath)
  ? declared(stripComments(fs.readFileSync(tokensPath, 'utf8')))
  : new Set();

const violations = [];
for (const abs of walk(path.join(root, PROTOTYPE)).sort()) {
  const rel = path.relative(root, abs).split(path.sep).join('/');
  const text = stripComments(fs.readFileSync(abs, 'utf8'));
  const local = declared(text);
  text.split('\n').forEach((line, idx) => {
    for (const m of line.matchAll(/var\(\s*(--[\w-]+)/g)) {
      const token = m[1];
      if (global.has(token) || local.has(token) || allowed.has(`${rel}\u0000${token}`)) continue;
      violations.push(`${rel}:${idx + 1}: undefined token ${token}`);
    }
  });
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`${violations.length} undefined token usage(s)`);
  process.exit(1);
}
console.log('check-css-tokens: OK');
