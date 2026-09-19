#!/usr/bin/env node
/**
 * check-user-path-map-freshness.mjs — Report whether
 * design/system/user-path-map.html is still current with respect to the
 * screen-list fingerprint recorded in its <head>.
 *
 * Usage:
 *   node scripts/check-user-path-map-freshness.mjs           # check this repository
 *   node scripts/check-user-path-map-freshness.mjs <root>    # check another checkout
 *   node scripts/check-user-path-map-freshness.mjs --help    # print this usage
 *
 * Stage 2 model (GitHub issue #665, design.md "Stage 2 Design Amendment —
 * Screen-List Fingerprint Model"):
 *   The path map's <head> must carry exactly one
 *   <meta name="path-map-screen-fingerprint" content="sha256:<64 lowercase
 *   hex>">. This command recomputes the same sha256 from the screen IDs
 *   (`## 畫面 × 元件`) and view IDs (`## 同頁多重視圖`) currently rendered in
 *   design/system/screen-inventory.md and compares it byte-for-byte against
 *   the recorded value. It never derives the recorded value from `HEAD`,
 *   file mtimes, a fixed date, or `design/prototype/pages/**` directly, and
 *   it never runs `git`.
 *
 *   If neither a fingerprint meta nor a parseable screen inventory exists at
 *   all, the authoritative source metadata contract delivered by GitHub
 *   issue #645 is treated as not yet settled — the pre-#645 placeholder
 *   state — rather than as a specific configuration mistake.
 *
 * Exit codes:
 *   0  --help, or a proven-fresh path map (PATH_MAP_FRESH)
 *   1  a proven-stale path map (PATH_MAP_STALE_FINGERPRINT)
 *   2  usage or configuration failure, including any undecidable state
 *
 * The command is read-only: it never writes to the repository.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATH_MAP = 'design/system/user-path-map.html';
const SCREEN_INVENTORY = 'design/system/screen-inventory.md';
const FINGERPRINT_META_NAME = 'path-map-screen-fingerprint';
const FINGERPRINT_RE = /^sha256:[0-9a-f]{64}$/;

const EXIT_OK = 0;
const EXIT_STALE = 1;
const EXIT_CONFIG = 2;

const USAGE = [
  'usage: node scripts/check-user-path-map-freshness.mjs [--help] [repository-root]',
  '',
  `Checks whether ${PATH_MAP} is still current with respect to the`,
  'screen/view ID lists rendered in design/system/screen-inventory.md, by',
  'comparing the recorded <meta name="path-map-screen-fingerprint"> sha256',
  'against one recomputed from those IDs. This is the metadata contract',
  'delivered by GitHub issue #645; if it is not settled at all yet (no',
  'fingerprint meta and no parseable inventory), the check fails closed',
  'instead of guessing.',
  '',
  'Exit codes:',
  '  0  --help, or a proven-fresh path map',
  '  1  a proven-stale path map',
  '  2  usage or configuration failure, including any undecidable state',
].join('\n');

function fail(rule, subject, message) {
  console.error(`ERROR [${rule}] ${subject}: ${message}`);
  return EXIT_CONFIG;
}

function failUsage(message) {
  const status = fail('PATH_MAP_USAGE', 'scripts/check-user-path-map-freshness.mjs', message);
  console.error(USAGE);
  return status;
}

// Returns the <head>...</head> contents, or the whole document when no
// explicit <head> element exists (the fixture and real-repo artifacts
// predating issue #645 have no <html>/<head>/<body> wrapper at all).
function headRegion(html) {
  const match = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1] : html;
}

// Finds every <meta name="path-map-screen-fingerprint" content="..."> tag's
// content value within the head region, in document order.
function findFingerprintMetaValues(html) {
  const region = headRegion(html);
  const values = [];
  const metaTagRe = /<meta\b[^>]*>/gi;
  let match;
  while ((match = metaTagRe.exec(region)) !== null) {
    const tag = match[0];
    const nameMatch = tag.match(/\bname\s*=\s*"([^"]*)"/i) || tag.match(/\bname\s*=\s*'([^']*)'/i);
    if (!nameMatch || nameMatch[1] !== FINGERPRINT_META_NAME) {
      continue;
    }
    const contentMatch = tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || tag.match(/\bcontent\s*=\s*'([^']*)'/i);
    values.push(contentMatch ? contentMatch[1] : '');
  }
  return values;
}

// Returns the markdown lines strictly between a "## <headingPrefix>..."
// heading and the next top-level "## " heading (or end of file), or null if
// no heading starts with headingPrefix.
function sectionLines(markdown, headingPrefix) {
  const lines = markdown.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ') && line.slice(3).trim().startsWith(headingPrefix)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith('## ')) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

// Extracts the first column of every markdown table data row within the
// given lines (skipping header rows whose first cell is "#" and separator
// rows made only of dashes/colons), across any number of sub-tables.
function tableIds(lines) {
  const ids = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('|') || !line.endsWith('|')) {
      continue;
    }
    const first = line.slice(1, -1).split('|')[0].trim();
    if (first === '' || first === '#' || /^:?-+:?$/.test(first)) {
      continue;
    }
    ids.push(first);
  }
  return ids;
}

// Reads design/system/screen-inventory.md and extracts the screen IDs
// ("## 畫面 × 元件") and view IDs ("## 同頁多重視圖"). Returns { ok: false }
// when the file is missing or either ID list cannot be parsed.
function parseScreenInventory(root) {
  const filePath = path.join(root, SCREEN_INVENTORY);
  if (!fs.existsSync(filePath)) {
    return { ok: false };
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const screenLines = sectionLines(content, '畫面 × 元件');
  const viewLines = sectionLines(content, '同頁多重視圖');
  const screenIds = screenLines ? tableIds(screenLines) : [];
  const viewIds = viewLines ? tableIds(viewLines) : [];
  if (screenIds.length === 0 || viewIds.length === 0) {
    return { ok: false };
  }
  return { ok: true, screenIds, viewIds };
}

// design.md "Fingerprint 演算法": trim, ordinal-sort each ID list, serialize
// as "screens:<csv>\nviews:<csv>", then sha256 the UTF-8 bytes.
// ponytail: ordinal sort assumes fixed-width zero-padded IDs (current 01~15,
// V00~V35); switch to numeric sort if the ID count ever exceeds two digits.
function computeFingerprint(screenIds, viewIds) {
  const sortedScreens = screenIds.map((id) => id.trim()).sort();
  const sortedViews = viewIds.map((id) => id.trim()).sort();
  const serialized = `screens:${sortedScreens.join(',')}\nviews:${sortedViews.join(',')}`;
  const digest = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
  return `sha256:${digest}`;
}

function main(argv) {
  const positional = [];

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      console.log(USAGE);
      return EXIT_OK;
    }
    if (arg.startsWith('-')) {
      return failUsage(`unsupported argument: ${arg}`);
    }
    positional.push(arg);
  }

  if (positional.length > 1) {
    return failUsage(`expected at most one repository root, got ${positional.length}`);
  }

  const requested = positional.length === 1 ? positional[0] : DEFAULT_ROOT;
  if (requested.trim() === '') {
    return fail('PATH_MAP_ROOT', '(empty)', 'repository root cannot be resolved from an empty argument');
  }

  const root = path.resolve(requested);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return fail('PATH_MAP_ROOT', requested, 'repository root cannot be resolved to an existing directory');
  }

  const pathMapFile = path.join(root, PATH_MAP);
  if (!fs.existsSync(pathMapFile)) {
    return fail(
      'PATH_MAP_ARTIFACT_MISSING',
      PATH_MAP,
      'the path map is missing, so freshness cannot be determined; GitHub issue #645 owns this artifact',
    );
  }

  const html = fs.readFileSync(pathMapFile, 'utf8');
  const fingerprintValues = findFingerprintMetaValues(html);
  const inventory = parseScreenInventory(root);

  if (fingerprintValues.length === 0 && !inventory.ok) {
    return fail(
      'PATH_MAP_AUTHORITY_UNSETTLED',
      PATH_MAP,
      'the authoritative source metadata contract from GitHub issue #645 is not settled, so freshness cannot be determined',
    );
  }

  if (fingerprintValues.length === 0) {
    return fail(
      'PATH_MAP_META_MISSING',
      PATH_MAP,
      `<head> has no <meta name="${FINGERPRINT_META_NAME}"> fingerprint locator`,
    );
  }

  if (fingerprintValues.length > 1) {
    return fail(
      'PATH_MAP_META_DUPLICATE',
      PATH_MAP,
      `<head> has ${fingerprintValues.length} <meta name="${FINGERPRINT_META_NAME}"> tags, expected exactly 1`,
    );
  }

  const recorded = fingerprintValues[0];
  if (!FINGERPRINT_RE.test(recorded)) {
    return fail(
      'PATH_MAP_META_MALFORMED',
      PATH_MAP,
      `<meta name="${FINGERPRINT_META_NAME}"> content "${recorded}" does not match sha256:[0-9a-f]{64}`,
    );
  }

  if (!inventory.ok) {
    return fail(
      'PATH_MAP_INVENTORY_UNREADABLE',
      SCREEN_INVENTORY,
      'the screen (## 畫面 × 元件) or view (## 同頁多重視圖) ID table could not be parsed',
    );
  }

  const recomputed = computeFingerprint(inventory.screenIds, inventory.viewIds);

  if (recomputed === recorded) {
    console.log(`PATH_MAP_FRESH ${PATH_MAP}: screen-list fingerprint ${recorded} matches ${SCREEN_INVENTORY}`);
    return EXIT_OK;
  }

  console.error(
    `PATH_MAP_STALE_FINGERPRINT ${PATH_MAP}: recorded ${recorded} does not match recomputed ${recomputed}; ` +
      `re-walk the path map per GitHub issue #645 and update its <meta name="${FINGERPRINT_META_NAME}"> value`,
  );
  return EXIT_STALE;
}

process.exit(main(process.argv.slice(2)));
