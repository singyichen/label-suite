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
 * Stage 3 model (GitHub issue #906):
 *   A matching fingerprint only proves the screen/view ID list is unchanged,
 *   so the map is additionally held to the claims it makes about the sources
 *   it names: every "<file>:<line>" citation in its body must still resolve,
 *   and every count it states as the output of a `grep` must still be
 *   reproducible when recomputed here. Stage 3 runs only after Stage 2 has
 *   passed, and like Stage 2 it never consults `git`, file mtimes or any
 *   timestamp -- every criterion is recomputed from the cited source itself.
 *
 * Exit codes:
 *   0  --help, or a proven-fresh path map (PATH_MAP_FRESH)
 *   1  a proven-stale path map (PATH_MAP_STALE_FINGERPRINT,
 *      PATH_MAP_CITATION_UNRESOLVED, PATH_MAP_CLAIM_COUNT_MISMATCH)
 *   2  usage or configuration failure, including any undecidable state
 *      (PATH_MAP_CLAIM_UNDECIDABLE)
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
  'Stage 3 (GitHub issue #906) additionally recomputes the claims the map',
  'makes about the sources it names: cited <file>:<line> pairs must still',
  'resolve, and stated grep counts must still reproduce.',
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

// --- Stage 3: cited-source integrity (GitHub issue #906) -------------------
// Stage 2 proves only that the screen/view ID list is unchanged, so a
// prototype behaviour fix that neither adds nor removes an ID leaves the
// recorded fingerprint untouched while the map's walkthrough prose silently
// goes wrong. Stage 3 recomputes, from the very sources the map itself names,
// every claim the map makes about them. It still never consults `git`, file
// mtimes or any timestamp.
const CITED_EXT = 'ts|tsx|js|mjs|cjs|html|css|md|json|sh|yml|yaml';
// Prefixes a citation may be written relative to, in resolution order.
const CITATION_BASE_ROOTS = ['', 'design/prototype/', 'design/prototype/pages/', 'design/system/'];
// Trees scanned to build the basename index used for shorthand citations.
const CITATION_INDEX_ROOTS = ['design/prototype/pages', 'design/prototype/tests', 'design/system'];
// Block-level tags whose boundaries end one claim's scope and start the next.
const BLOCK_SPLIT_RE =
  /<\/?(?:p|td|th|div|li|h[1-6]|caption|section|tr|table|ul|ol|body|head|nav|main)\b[^>]*>/gi;
// Either "<path>.<ext>" optionally followed by ":<line>", or a bare ":<line>"
// continuation that inherits the most recent path in the same block.
const CITATION_TOKEN_RE = new RegExp(
  `(?:^|[^A-Za-z0-9_@./-])((?:[A-Za-z0-9_@.-]+/)*[A-Za-z0-9_@.-]+\\.(?:${CITED_EXT}))(?::(\\d+))?` +
    `|(?:^|[\\s(])(?::(\\d+))(?![0-9])`,
  'g',
);
const GREP_COMMAND_RE =
  /(?:\/usr\/bin\/)?grep\s+-([A-Za-z]+)\s+(?:"([^"]*)"|'([^']*)'|([A-Za-z0-9_@.-]+))/g;
const FILE_COUNT_CLAIM_RE = new RegExp(
  `((?:[A-Za-z0-9_@.-]+/)*[A-Za-z0-9_@.-]+\\.(?:${CITED_EXT}))\\s*=\\s*(\\d+)`,
  'g',
);
const TREE_COUNT_CLAIM_RE = /((?:[A-Za-z0-9_@.-]+\/)+)\s*(?:→|->)\s*(\d+)\s*行/g;

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// Flattens the path map into block-level plain-text runs. Script and style
// bodies are dropped so the map's own tooling never reads as a claim.
function textBlocks(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .split(BLOCK_SPLIT_RE)
    .map((chunk) => decodeEntities(chunk.replace(/<[^>]*>/g, ' ')))
    .map((text) => text.replace(/＝/g, '=').replace(/：/g, ':').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function walkFiles(root, rel, out) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const next = path.join(rel, entry.name);
    if (entry.isDirectory()) walkFiles(root, next, out);
    else if (entry.isFile()) out.push(next);
  }
}

function buildBasenameIndex(root) {
  const files = [];
  for (const rel of CITATION_INDEX_ROOTS) walkFiles(root, rel, files);
  const index = new Map();
  for (const rel of files) {
    const base = path.basename(rel);
    if (!index.has(base)) index.set(base, []);
    index.get(base).push(rel);
  }
  return index;
}

function resolveCitedPath(root, token) {
  for (const base of CITATION_BASE_ROOTS) {
    const abs = path.join(root, base, token);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return path.posix.join(base, token);
  }
  return null;
}

// ponytail: a bare basename is only honoured when it names exactly one file in
// the indexed trees; zero or several matches are read as prose shorthand
// (the map writes "config.js:33" for annotation-workspace.config.js) and
// skipped rather than reported. Index every tree the map may cite to narrow it.
function resolveClaimTarget(root, token, index) {
  if (token.includes('/')) return resolveCitedPath(root, token);
  const hits = index.get(token) || [];
  return hits.length === 1 ? hits[0] : null;
}

function lineCountOf(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).length;
}

function countInFile(root, rel, pattern) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  return text.split(/\r?\n/).filter((line) => line.includes(pattern)).length;
}

function countInTree(root, rel, pattern) {
  const files = [];
  walkFiles(root, rel, files);
  files.sort();
  let total = 0;
  for (const file of files) total += countInFile(root, file, pattern);
  return total;
}

// S3-A: every "<file>:<line>" the map states must still resolve to a file, and
// the line must still exist in it.
function auditCitations(root, blocks, index) {
  const findings = [];
  for (const block of blocks) {
    let current = null;
    CITATION_TOKEN_RE.lastIndex = 0;
    let match;
    while ((match = CITATION_TOKEN_RE.exec(block)) !== null) {
      const token = match[1];
      if (!token) {
        if (!match[3] || !current) continue;
        const line = Number(match[3]);
        const total = lineCountOf(root, current);
        if (line < 1 || line > total) findings.push({ token: `${current}:${line}`, line, total });
        continue;
      }
      const raw = block.slice(Math.max(0, match.index), CITATION_TOKEN_RE.lastIndex);
      // URLs and explicitly relative hyperlinks are navigation, not citations.
      if (/^(?:https?:|www\.)/i.test(token) || /(?:^|[^A-Za-z0-9])\.{1,2}\//.test(raw)) {
        current = null;
        continue;
      }
      let rel;
      if (token.includes('/')) {
        rel = resolveCitedPath(root, token);
        if (rel === null) {
          findings.push({ token, line: null, total: null });
          current = null;
          continue;
        }
      } else {
        const hits = index.get(token) || [];
        if (hits.length !== 1) {
          current = null;
          continue;
        }
        rel = hits[0];
      }
      current = rel;
      if (match[2]) {
        const line = Number(match[2]);
        const total = lineCountOf(root, rel);
        if (line < 1 || line > total) findings.push({ token: `${rel}:${line}`, line, total });
      }
    }
  }
  return findings;
}

// S3-B: every count the map states as the output of a `grep` must still be
// reproducible. A `grep` command that carries no parseable count, or whose
// target cannot be resolved, is undecidable and fails closed per FR-003 --
// that also stops a stale claim from being hidden by rewording it as prose.
function auditClaims(root, blocks, index) {
  const findings = [];
  for (const block of blocks) {
    GREP_COMMAND_RE.lastIndex = 0;
    const commands = [];
    let match;
    while ((match = GREP_COMMAND_RE.exec(block)) !== null) {
      commands.push({
        flags: match[1],
        pattern: match[2] ?? match[3] ?? match[4],
        start: match.index,
        end: GREP_COMMAND_RE.lastIndex,
      });
    }
    for (let i = 0; i < commands.length; i += 1) {
      const command = commands[i];
      const spanEnd = i + 1 < commands.length ? commands[i + 1].start : block.length;
      const span = block.slice(command.start, spanEnd);
      const label = `grep -${command.flags} ${command.pattern}`;
      let parsed = 0;

      if (command.flags.includes('c')) {
        FILE_COUNT_CLAIM_RE.lastIndex = 0;
        let claim;
        while ((claim = FILE_COUNT_CLAIM_RE.exec(span)) !== null) {
          parsed += 1;
          const target = claim[1];
          const rel = resolveClaimTarget(root, target, index);
          if (rel === null) {
            findings.push({ undecidable: true, detail: `${label} ${target}: target cannot be resolved to a file` });
            continue;
          }
          const claimed = Number(claim[2]);
          const actual = countInFile(root, rel, command.pattern);
          if (actual !== claimed) findings.push({ label: `${label} ${rel}`, claimed, actual });
        }
      }

      if (command.flags.includes('r')) {
        TREE_COUNT_CLAIM_RE.lastIndex = 0;
        let claim;
        while ((claim = TREE_COUNT_CLAIM_RE.exec(span)) !== null) {
          parsed += 1;
          const dir = claim[1].replace(/\/+$/, '');
          const abs = path.join(root, dir);
          if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
            findings.push({ undecidable: true, detail: `${label} ${dir}: target cannot be resolved to a directory` });
            continue;
          }
          const claimed = Number(claim[2]);
          const actual = countInTree(root, dir, command.pattern);
          if (actual !== claimed) findings.push({ label: `${label} ${dir}`, claimed, actual });
        }
      }

      if (parsed === 0) {
        findings.push({
          undecidable: true,
          detail: `${label}: states no recomputable count ("<file> = <n>" or "<dir>/ → <n> 行"); near "${span.slice(0, 80).trim()}"`,
        });
      }
    }
  }
  return findings;
}

// Returns null when every cited source still backs the map, otherwise the
// exit status to report.
// ponytail: counts use literal substring matching, not grep's BRE semantics;
// swap in a real regex engine if the map ever states a metacharacter pattern.
function auditCitedSources(root) {
  const html = fs.readFileSync(path.join(root, PATH_MAP), 'utf8');
  const blocks = textBlocks(html);
  const index = buildBasenameIndex(root);

  const claims = auditClaims(root, blocks, index);
  const undecidable = claims.filter((finding) => finding.undecidable);
  if (undecidable.length > 0) {
    for (const finding of undecidable) fail('PATH_MAP_CLAIM_UNDECIDABLE', PATH_MAP, finding.detail);
    return EXIT_CONFIG;
  }

  const citations = auditCitations(root, blocks, index);
  let status = null;

  for (const finding of citations) {
    const reason =
      finding.total === null
        ? 'cited path no longer resolves to a file in this checkout'
        : `cited line ${finding.line} is outside 1..${finding.total}`;
    console.error(`PATH_MAP_CITATION_UNRESOLVED ${PATH_MAP}: ${finding.token} — ${reason}; re-walk the citation and update the path map`);
    status = EXIT_STALE;
  }

  for (const finding of claims) {
    console.error(
      `PATH_MAP_CLAIM_COUNT_MISMATCH ${PATH_MAP}: ${finding.label} claimed ${finding.claimed}, recomputed ${finding.actual}; ` +
        'the cited source moved on — re-walk that claim and update the path map',
    );
    status = EXIT_STALE;
  }

  return status;
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
    // Stage 3 runs only once Stage 2 has proven the screen list unchanged, so
    // a fingerprint mismatch is still reported on its own and Stage 2 keeps
    // its exact pre-#906 behaviour.
    const citedStatus = auditCitedSources(root);
    if (citedStatus !== null) return citedStatus;
    console.log(
      `PATH_MAP_FRESH ${PATH_MAP}: screen-list fingerprint ${recorded} matches ${SCREEN_INVENTORY}, ` +
        "and every cited path and grep count in its body still reproduces",
    );
    return EXIT_OK;
  }

  console.error(
    `PATH_MAP_STALE_FINGERPRINT ${PATH_MAP}: recorded ${recorded} does not match recomputed ${recomputed}; ` +
      `re-walk the path map per GitHub issue #645 and update its <meta name="${FINGERPRINT_META_NAME}"> value`,
  );
  return EXIT_STALE;
}

process.exit(main(process.argv.slice(2)));
