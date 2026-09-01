#!/usr/bin/env node
/**
 * gen-screen-inventory.mjs — Render design/system/screen-inventory.md from
 * design/system/inventory-manifest.json plus the prototype on disk.
 *
 * Usage:
 *   node scripts/gen-screen-inventory.mjs            # write the file
 *   node scripts/gen-screen-inventory.mjs --check    # fail if the file is stale
 *   node scripts/gen-screen-inventory.mjs --stdout   # print, write nothing
 *
 * IMPORTANT — when to use this script:
 *   Run after editing the manifest and after adding, removing, or renaming any
 *   design/prototype/pages/** screen. `--check` is the stale gate: it fails when
 *   the committed markdown no longer matches a fresh render, which happens both
 *   when the manifest changes and when the prototype moves ahead of it.
 *
 * What is derived (never hand-written in the manifest):
 *   - FR / SC ids, read from each linked canonical spec.md
 *   - data-testid counts, read from each screen's own prototype sources
 *   - component occurrence counts, computed from the per-screen component keys
 *   - Storybook scope, from the ADR-016 rule "shared once used on >= 6 screens"
 *   - the prototype source commit and its date, read from git
 *
 * What is validated (the generator refuses to render on any of these):
 *   - every manifest page, page design doc and spec directory exists
 *   - every test glob matches at least one file
 *   - every component key exists in the registry
 *   - the manifest screen set equals the screen files on disk
 *   - a non-null routeKey exists in frontend/src/routes/paths.ts
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTOTYPE = path.join(ROOT, 'design/prototype');
const MANIFEST_PATH = path.join(ROOT, 'design/system/inventory-manifest.json');
const OUTPUT_PATH = path.join(ROOT, 'design/system/screen-inventory.md');
const ROUTE_PATHS_FILE = path.join(ROOT, 'frontend/src/routes/paths.ts');

/** ADR-016: a component used on this many screens or more belongs in shared/. */
const SHARED_THRESHOLD = 6;

/** Paths whose last commit defines "how fresh is this inventory". */
const PROTOTYPE_SOURCES = ['design/prototype/pages', 'design/prototype/index.html'];

const errors = [];
const fail = (message) => errors.push(message);
const rel = (absolute) => path.relative(ROOT, absolute);

function readText(absolute) {
  return fs.readFileSync(absolute, 'utf8');
}

/** Minimal glob: one or more `*` wildcards inside the final path segment. */
function expandGlob(pattern) {
  const dir = path.join(ROOT, path.dirname(pattern));
  const base = path.basename(pattern);
  if (!base.includes('*')) {
    return fs.existsSync(path.join(dir, base)) ? [path.join(dir, base)] : [];
  }
  if (!fs.existsSync(dir)) return [];
  const matcher = new RegExp(`^${base.split('*').map(escapeRegExp).join('[^/]*')}$`);
  return fs
    .readdirSync(dir)
    .filter((name) => matcher.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "05, 06, 07" -> "05–07"; keeps the widest rows readable. */
function collapseRuns(ids) {
  const runs = [];
  for (const id of ids) {
    const last = runs[runs.length - 1];
    if (last && Number(id) === Number(last[last.length - 1]) + 1) last.push(id);
    else runs.push([id]);
  }
  return runs
    .map((run) => (run.length >= 3 ? `${run[0]}–${run[run.length - 1]}` : run.join(', ')))
    .join(', ');
}

/** Top-level screen files: pages/<module>/<name>.html, excluding partial/panel fragments. */
function findScreenFiles() {
  const pagesDir = path.join(PROTOTYPE, 'pages');
  const found = [];
  for (const moduleName of fs.readdirSync(pagesDir).sort()) {
    const moduleDir = path.join(pagesDir, moduleName);
    if (!fs.statSync(moduleDir).isDirectory()) continue;
    for (const name of fs.readdirSync(moduleDir).sort()) {
      if (name.endsWith('.html')) found.push(`pages/${moduleName}/${name}`);
    }
  }
  return found;
}

/** Every prototype file that belongs to one screen: the page, its siblings, its fragments. */
function screenSourceFiles(pageRelative) {
  const pageAbsolute = path.join(PROTOTYPE, pageRelative);
  const dir = path.dirname(pageAbsolute);
  const base = path.basename(pageAbsolute, '.html');
  const files = fs.existsSync(pageAbsolute) ? [pageAbsolute] : [];
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir).sort()) {
    const entry = path.join(dir, name);
    if (name.startsWith(`${base}.`) && fs.statSync(entry).isFile() && name !== `${base}.html`) {
      files.push(entry);
    }
    if ((name === `${base}.partials` || name === `${base}.panels`) && fs.statSync(entry).isDirectory()) {
      for (const child of fs.readdirSync(entry).sort()) files.push(path.join(entry, child));
    }
  }
  return files;
}

function screenTestIds(pageRelative) {
  const ids = new Set();
  for (const file of screenSourceFiles(pageRelative)) {
    for (const match of readText(file).matchAll(/data-testid="([^"]+)"/g)) ids.add(match[1]);
  }
  return ids;
}

/** Every data-testid anywhere under pages/, so unattributed ones can be reported. */
function allPageTestIds() {
  const ids = new Set();
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const entry = path.join(dir, name);
      if (fs.statSync(entry).isDirectory()) walk(entry);
      else if (/\.(html|js)$/.test(name)) {
        for (const match of readText(entry).matchAll(/data-testid="([^"]+)"/g)) ids.add(match[1]);
      }
    }
  };
  walk(path.join(PROTOTYPE, 'pages'));
  return ids;
}

/** Ids a spec *defines* (`- **FR-001**：…`), not ids it merely mentions in prose. */
function specIds(specDirRelative) {
  const specFile = path.join(ROOT, specDirRelative, 'spec.md');
  if (!fs.existsSync(specFile)) return null;
  const ids = { FR: [], SC: [] };
  for (const match of readText(specFile).matchAll(/^\s*-\s*\*\*(FR|SC)-(\d{3}[A-Z]?)\*\*/gm)) {
    const id = `${match[1]}-${match[2]}`;
    if (!ids[match[1]].includes(id)) ids[match[1]].push(id);
  }
  return ids;
}

/**
 * Counts only, deliberately: ids carry letter suffixes (FR-013A) inserted out of
 * numeric order, so a "first…last" range reads as a range that does not exist.
 */
function summariseIds(list) {
  return list.length === 0 ? '—' : `×${list.length}`;
}

/**
 * Abbreviate here rather than with %h: git's own abbreviation length tracks the
 * local object database, so the same commit renders as 7 characters in one clone
 * and 8 in another. The freshness gate compares this file byte-for-byte.
 */
const COMMIT_ABBREV_LENGTH = 12;

function prototypeSource() {
  const out = execFileSync(
    'git',
    ['log', '-1', '--format=%H|%ad', '--date=short', '--', ...PROTOTYPE_SOURCES],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();
  const [fullCommit, date] = out.split('|');
  if (!fullCommit || !date) throw new Error('cannot resolve the prototype source commit from git');
  return { commit: fullCommit.slice(0, COMMIT_ABBREV_LENGTH), date };
}

function validate(manifest) {
  const registry = manifest.componentRegistry;
  const seenIds = new Set();
  const seenViewIds = new Set();

  for (const view of manifest.entry.views) seenViewIds.add(view.id);

  for (const screen of manifest.screens) {
    const where = `screen ${screen.id} (${screen.page})`;
    if (seenIds.has(screen.id)) fail(`duplicate screen id: ${screen.id}`);
    seenIds.add(screen.id);

    if (!fs.existsSync(path.join(PROTOTYPE, screen.page))) fail(`${where}: page file not found`);
    if (!fs.existsSync(path.join(ROOT, screen.design))) fail(`${where}: page design doc not found — ${screen.design}`);

    for (const specDir of screen.specs) {
      if (!fs.existsSync(path.join(ROOT, specDir, 'spec.md'))) fail(`${where}: spec not found — ${specDir}/spec.md`);
    }
    for (const glob of screen.tests) {
      if (expandGlob(glob).length === 0) fail(`${where}: test glob matches no file — ${glob}`);
    }
    for (const key of screen.components) {
      if (!(key in registry)) fail(`${where}: unknown component key — ${key}`);
    }
    if (screen.routeKey !== null && !readText(ROUTE_PATHS_FILE).includes(`${screen.routeKey}:`)) {
      fail(`${where}: routeKey not found in ${rel(ROUTE_PATHS_FILE)} — ${screen.routeKey}`);
    }
    for (const view of (manifest.screenViews[screen.id]?.views ?? [])) {
      if (seenViewIds.has(view.id)) fail(`duplicate view id: ${view.id}`);
      seenViewIds.add(view.id);
    }
  }

  for (const screenId of Object.keys(manifest.screenViews)) {
    if (!seenIds.has(screenId)) fail(`screenViews references an unknown screen id: ${screenId}`);
  }

  // Coverage both ways: the manifest and the prototype must describe the same screen set.
  const onDisk = new Set(findScreenFiles());
  const listed = new Set(manifest.screens.map((screen) => screen.page));
  const excluded = new Set(Object.keys(manifest.excludedPages).map((name) => `pages/${name}`));
  for (const page of onDisk) {
    if (!listed.has(page) && !excluded.has(page)) {
      fail(`prototype screen is missing from the manifest: ${page}`);
    }
  }
  for (const page of listed) {
    if (!onDisk.has(page)) fail(`manifest lists a screen that is not on disk: ${page}`);
  }
}

function render(manifest) {
  const { commit, date } = prototypeSource();
  const screens = manifest.screens;
  const registry = manifest.componentRegistry;

  const usage = new Map(Object.keys(registry).map((key) => [key, []]));
  for (const screen of screens) {
    for (const key of screen.components) usage.get(key).push(screen.id);
  }
  const ranked = [...usage.entries()]
    .map(([key, ids], index) => ({ key, ids, index }))
    .sort((a, b) => b.ids.length - a.ids.length || a.index - b.index);
  const sharedKeys = new Set(ranked.filter((row) => row.ids.length >= SHARED_THRESHOLD).map((row) => row.key));

  const attributed = new Set();
  for (const screen of screens) for (const id of screenTestIds(screen.page)) attributed.add(id);
  const unattributedTestIds = [...allPageTestIds()].filter((id) => !attributed.has(id)).length;

  const totalViews = manifest.entry.views.length
    + Object.values(manifest.screenViews).reduce((sum, group) => sum + group.views.length, 0);

  const lines = [];
  const push = (...text) => lines.push(...text);

  push(
    '# Screen Inventory（頁面 → 元件反向索引）',
    '',
    '> **用途：** 以「頁面」為主鍵列出每頁使用的元件，與 [inventory.md](inventory.md)（「元件 → 出現頁面」）互為反向索引，作為前端 feature 開發時的元件 checklist、前端交接矩陣與路由／權限／狀態測試矩陣依據。',
    '>',
    '> **本檔為 generated view——請勿手動編輯。** 唯一生成來源是 [inventory-manifest.json](inventory-manifest.json)；改完 manifest 後執行 `node scripts/gen-screen-inventory.mjs` 重新產生，並以 `bash scripts/inventory-tests.sh` 驗證。元件規格唯一正典是 [MASTER.md](MASTER.md)；行為規格在 `specs/<module>/`；token 實作在 `design/prototype/assets/tokens.css`。',
    '>',
    `> **Prototype 來源 commit：** \`${commit}\`（${date}）——`
      + `${PROTOTYPE_SOURCES.map((p) => `\`${p}\``).join(' · ')} 的最後一次變更。`,
    '> 本檔若落後於該 commit，`node scripts/gen-screen-inventory.mjs --check` 會失敗。',
    '',
    '---',
    '',
    '## 維護時機',
    '',
    '所有變更一律改 `inventory-manifest.json` 後重新產生，不得直接編輯本檔。',
    '',
    '| 觸發 | 動作 |',
    '|------|------|',
    '| Prototype 新增／移除畫面 | 在 manifest `screens` 增刪該筆（漏了會被覆蓋率檢查擋下） |',
    '| 既有畫面新增／移除元件 | 更新該畫面 `components`；出現次數統計會自動重算 |',
    '| 頁面新增 URL 參數視圖 | 在 manifest `screenViews` 加入該視圖 |',
    '| Spec、page design、prototype 測試路徑異動 | 更新 `specs` / `design` / `tests`（失效引用會被驗證擋下） |',
    '| 路由於 `routes/paths.ts` 落地 | 將該畫面 `routeKey` 由 `null` 改為對應鍵 |',
    '',
    '## 前端開發用法',
    '',
    `1. **元件建置優先序**＝「出現次數統計」的降冪排序——出現在 ${SHARED_THRESHOLD} 個以上畫面者進 \`frontend/src/shared/\`，先補 Storybook story 再開頁面（ADR-016）。`,
    '2. **Feature 元件 checklist**＝「畫面 × 元件」表中該頁的列——每開一個 `frontend/src/features/<module>/`，以該頁元件清單為 checklist，缺的元件先補 story。',
    '3. **前端交接矩陣**＝下方「前端交接矩陣」表——spec/FR/SC、page design、prototype 測試、route、角色、UI 狀態、`data-testid` 數、React ownership 與 Storybook scope 一列到底。',
    `4. **路由 × 權限 × 狀態測試矩陣**＝「同頁多重視圖」表——${totalViews} 個視圖可直接轉成正式 e2e 的 Playwright spec 清單（目錄位置見 ADR-034）。`,
    '',
    '---',
    '',
    '## 元件出現次數統計（建置優先序）',
    '',
    `依 manifest 的 ${screens.length} 個畫面計算：`,
    '',
    '| 出現頁數 | 元件 | 出現頁面（編號） |',
    '|:---:|------|------|',
  );

  for (const row of ranked) {
    const pages = row.ids.length === screens.length ? '全部' : collapseRuns(row.ids);
    push(`| ${row.ids.length} | ${registry[row.key]} | ${pages} |`);
  }

  push(
    '',
    `> 建議第一批（\`frontend/src/shared/\`）：${[...sharedKeys].map((key) => registry[key]).join('、')}——出現 ${SHARED_THRESHOLD} 頁以上的元件全數在列。`,
    '',
    `## 畫面 × 元件（${screens.length} 頁）`,
    '',
    '| # | 頁面 | Module | 使用元件 | 備註 |',
    '|---|------|--------|----------|------|',
  );

  for (const screen of screens) {
    const components = screen.components.map((key) => registry[key]).join('、');
    push(`| ${screen.id} | ${screen.title} \`${screen.page.replace(/^pages\//, '')}\` | ${screen.module} | ${components} | ${screen.note ?? '—'} |`);
  }

  push(
    '',
    '## 前端交接矩陣',
    '',
    '每列即一個畫面的實作契約。`FR` / `SC` 數量由所連 canonical spec 直接讀出（點連結看完整條列），`data-testid` 由該畫面的 prototype 原始檔統計，Storybook scope 由出現次數推導——三者皆不可手寫。',
    '',
    '| # | 畫面 | Spec（FR / SC） | Page design | Prototype 測試 | Route | 角色 | UI 狀態 | `data-testid`（自有） | React ownership | Storybook scope |',
    '|---|------|-----------------|-------------|----------------|-------|------|---------|:---:|-----------------|-----------------|',
  );

  for (const screen of screens) {
    const specCells = screen.specs.map((specDir) => {
      const ids = specIds(specDir);
      return `[\`${path.basename(specDir)}\`](../../${specDir}/spec.md) FR ${summariseIds(ids.FR)} · SC ${summariseIds(ids.SC)}`;
    });
    const testCount = screen.tests.reduce((sum, glob) => sum + expandGlob(glob).length, 0);
    const testCell = `${screen.tests.map((glob) => `\`${glob.replace('design/prototype/tests/', '')}\``).join('<br>')}（${testCount} 檔）`;
    const route = screen.routeKey ? `\`ROUTE_PATHS.${screen.routeKey}\`` : '⚠ 未定義';
    const shared = screen.components.filter((key) => sharedKeys.has(key));
    const feature = screen.components.filter((key) => !sharedKeys.has(key));
    const storybook = [
      shared.length ? `\`shared/\`：${shared.length}` : null,
      feature.length ? `\`features/${screen.module}/\`：${feature.length}` : null,
    ].filter(Boolean).join(' · ');

    push(
      `| ${screen.id} | ${screen.title} | ${specCells.join('<br>')} | [\`${screen.design.replace('design/system/', '')}\`](${screen.design.replace('design/system/', '')}) `
      + `| ${testCell} | ${route} | ${screen.roles.join(' / ')} | ${screen.states.join('、')} | ${screenTestIds(screen.page).size} | \`${screen.reactOwnership}\` | ${storybook} |`,
    );
  }

  push(
    '',
    `> Route 欄全數為「⚠ 未定義」代表 \`frontend/src/routes/paths.ts\` 目前只有 foundation 的 \`healthCheck\`；每個畫面的路由在該 feature 落地時回填 manifest \`routeKey\`，生成器會驗證該鍵確實存在。`,
    '>',
    `> \`data-testid\` 欄只計該畫面自有原始檔（頁面 HTML、\`<畫面>.*\` 同名資產、\`.partials/\`／\`.panels/\`）；另有 ${unattributedTestIds} 個 testid 位於不屬於單一畫面的共用檔（\`pages/shared/\`、\`task-config.*\`）。計為 0 的畫面代表其 prototype 測試目前以 id／role 選取，尚未具備穩定 \`data-testid\`——依 Frontend Ready Gate 應在該 feature 實作前補齊。`,
    '',
    `## 同頁多重視圖（${totalViews} 視圖）`,
    '',
    '同一 HTML 依 URL 參數／頁內狀態切換的視圖清單。每列可直接對應一條正式 e2e 測試（路由 × 權限 × 狀態）。',
    '',
    `### 入口 \`${manifest.entry.page}\``,
    '',
  );

  const viewTable = (views) => {
    push('| # | 視圖 | URL 參數 | 說明 |', '|---|------|----------|------|');
    for (const view of views) push(`| ${view.id} | ${view.name} | ${view.params} | ${view.note} |`);
    push('');
  };

  viewTable(manifest.entry.views);
  for (const screen of screens) {
    const group = manifest.screenViews[screen.id];
    if (!group) continue;
    push(`### ${group.heading}`, '');
    viewTable(group.views);
  }

  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const manifest = JSON.parse(readText(MANIFEST_PATH));

  validate(manifest);
  if (errors.length > 0) {
    console.error('inventory manifest validation failed:');
    for (const message of errors) console.error(`  - ${message}`);
    process.exit(2);
  }

  const rendered = render(manifest);

  if (args.has('--stdout')) {
    process.stdout.write(rendered);
    return;
  }
  if (args.has('--check')) {
    const current = fs.existsSync(OUTPUT_PATH) ? readText(OUTPUT_PATH) : '';
    if (current !== rendered) {
      console.error(`${rel(OUTPUT_PATH)} is stale — run: node scripts/gen-screen-inventory.mjs`);
      process.exit(1);
    }
    console.log(`${rel(OUTPUT_PATH)} is up to date.`);
    return;
  }
  fs.writeFileSync(OUTPUT_PATH, rendered);
  console.log(`wrote ${rel(OUTPUT_PATH)}`);
}

main();
