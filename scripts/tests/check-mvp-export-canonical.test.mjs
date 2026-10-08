import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const spec = readFileSync(
  new URL('../../specs/task-management/014-task-detail/spec.md', import.meta.url),
  'utf8',
);

function contractLine(id) {
  const line = spec.split('\n').find((candidate) => candidate.startsWith(`- **${id}**`));
  assert.ok(line, `Missing canonical ${id} contract`);
  return line;
}

function constantLine(name) {
  const line = spec.split('\n').find((candidate) => candidate.startsWith(`- \`${name} `));
  assert.ok(line, `Missing canonical ${name} constant`);
  return line;
}

function exportDeltaState() {
  const active = new URL('../../openspec/changes/mvp-export-record-contract/', import.meta.url);
  const archive = new URL('../../openspec/changes/archive/', import.meta.url);
  const beforeArchive = existsSync(active);
  const archivedName = beforeArchive ? undefined : readdirSync(archive)
    .find((name) => name.endsWith('-mvp-export-record-contract'));
  if (!beforeArchive) assert.ok(archivedName, 'Archived export change is required');
  const change = beforeArchive ? active : new URL(`${archivedName}/`, archive);
  const delta = readFileSync(new URL('specs/task-management/014-task-detail/spec.md', change), 'utf8');
  const derived = readFileSync(
    new URL('../../openspec/specs/task-management/014-task-detail/spec.md', import.meta.url), 'utf8');
  const currentHeaders = new Set([...derived.matchAll(/^### Requirement: (.+)$/gm)]
    .map((match) => match[1]));
  return { delta, derived, currentHeaders, beforeArchive };
}

function renamedHeaders(delta) {
  const section = delta.split('## RENAMED Requirements\n')[1]?.split(/^## /m)[0] ?? '';
  return new Map([...section.matchAll(/^- FROM: `### Requirement: (.+)`\n- TO: `### Requirement: (.+)`$/gm)]
    .map((match) => [match[2], match[1]]));
}

test('export OpenSpec delta classifies requirement headers against the current derived spec', () => {
  const { delta, currentHeaders, beforeArchive } = exportDeltaState();
  const renames = renamedHeaders(delta);
  const changed = { MODIFIED: [], ADDED: [] };
  let section;
  for (const line of delta.split('\n')) {
    const category = line.match(/^## (MODIFIED|ADDED) Requirements$/)?.[1];
    if (category) section = category;
    else if (line.startsWith('## ')) section = undefined;
    const heading = line.match(/^### Requirement: (.+)$/)?.[1];
    if (heading && section) changed[section].push(heading);
  }
  assert.ok(changed.MODIFIED.length + changed.ADDED.length > 0, 'Export delta needs requirements');
  for (const header of changed.MODIFIED) {
    assert.ok(currentHeaders.has(header) || (beforeArchive && currentHeaders.has(renames.get(header))),
      `MODIFIED header missing from derived spec or RENAMED FROM: ${header}`);
  }
  for (const header of changed.ADDED) {
    assert.equal(currentHeaders.has(header), !beforeArchive,
      `ADDED header has incorrect ${beforeArchive ? 'pre-archive' : 'archived'} presence: ${header}`);
  }
});

test('FR-021 delta renames the old requirement and archived scenarios use the new contract', () => {
  const { delta, derived, currentHeaders, beforeArchive } = exportDeltaState();
  const oldHeader = 'FR-021 匯出記錄重新下載依條件快照重建且不新增紀錄';
  const newHeader = 'FR-021 歷史重新下載原始位元組';
  assert.equal(renamedHeaders(delta).get(newHeader), oldHeader,
    'FR-021 needs an explicit old-to-new OpenSpec rename');
  assert.equal(currentHeaders.has(oldHeader), beforeArchive,
    'Old FR-021 header must exist only before archive');
  assert.equal(currentHeaders.has(newHeader), !beforeArchive,
    'New FR-021 header must exist only after archive');

  const fr21Delta = delta.match(/^### Requirement: FR-021[^\n]*\n([\s\S]*?)(?=^### Requirement:|^## |(?![\s\S]))/m)?.[1];
  assert.ok(fr21Delta, 'FR-021 delta requirement is required');
  for (const id of ['AC-1.15', 'AC-1.16']) {
    assert.match(fr21Delta, new RegExp(`^#### Scenario: ${id}[^\\n]*$`, 'm'),
      `FR-021 ${id} delta scenario is required`);
  }
  if (!beforeArchive) {
    const fr21Derived = derived.match(/^### Requirement: FR-021[^\n]*\n([\s\S]*?)(?=^### Requirement:|^## |(?![\s\S]))/m)?.[1];
    assert.ok(fr21Derived, 'Archived FR-021 derived requirement is required');
    for (const id of ['AC-1.15', 'AC-1.16']) {
      const title = fr21Derived.match(new RegExp(`^#### Scenario: ${id}[^\\n]*$`, 'm'))?.[0];
      assert.ok(title, `Archived FR-021 ${id} scenario title is required`);
      assert.doesNotMatch(title,
        /快照[^\n]*(?:重建|為準)|切詞引擎不可用[^\n]*(?:不產檔|阻擋|拒絕)/,
        `${id} title must describe the current original-artifact contract`);
    }
  }
});

test('derived OpenSpec Purpose describes canonical v8 and immutable FR-021 downloads', () => {
  const { derived } = exportDeltaState();
  const purpose = derived.match(/^## Purpose\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1];
  assert.ok(purpose, 'Derived task-detail Purpose is required');
  assert.match(purpose, /正典為[^。；\n]*v8\.0\.0/,
    'Purpose must cite canonical task-detail v8.0.0');
  const fr21 = purpose.match(/FR-021[^；。\n]*/)?.[0];
  assert.ok(fr21, 'Purpose must summarize current FR-021');
  for (const term of [/下載/, /不可變/, /原始/, /(?:產物|檔案|位元組)/]) {
    assert.match(fr21, term, 'Purpose must describe an immutable original artifact download');
  }
  assert.doesNotMatch(fr21, /快照[^；。\n]*(?:重建|為準)|依條件快照/,
    'Purpose must not describe snapshot reconstruction as current FR-021 behavior');
});

test('derived FR-021 AC-1.15 and AC-1.16 retain their canonical export coverage', () => {
  const { derived, beforeArchive } = exportDeltaState();
  if (beforeArchive) return;
  const fr21 = derived.match(/^### Requirement: FR-021[^\n]*\n([\s\S]*?)(?=^### Requirement:|^## |(?![\s\S]))/m)?.[1];
  assert.ok(fr21, 'Derived FR-021 requirement is required');
  const scenario = (id) => {
    const body = fr21.match(new RegExp(
      `^#### Scenario: ${id}[^\\n]*\\n([\\s\\S]*?)(?=^#### Scenario:|(?![\\s\\S]))`, 'm'))?.[1];
    assert.ok(body, `Derived FR-021 ${id} body is required`);
    return body;
  };

  const mixed = scenario('AC-1.15');
  for (const [name, pattern] of [
    ['mixed Dry and Official scope', /Dry Run[^\n]*Official Run|Official Run[^\n]*Dry Run/],
    ['zero result rows', /零筆|0\s*筆/],
    ['versioned JSON-MIN envelope', /(?:版本\s*2|v2)/i],
    ['manifest run identities', /manifest\.runs\[\]/],
    ['empty rows collection', /rows\[\]/],
    ['matching original bytes', /(?:原始|原檔)[^\n]*位元組[^\n]*相同|位元組[^\n]*相同/],
    ['matching filename', /檔名[^\n]*相同/],
  ]) assert.match(mixed, pattern, `AC-1.15 must cover ${name}`);

  const invalid = scenario('AC-1.16');
  for (const [name, pattern] of [
    ['expiry', /到期|過期/],
    ['revocation', /撤銷|註銷/],
    ['source deletion', /來源(?:已)?刪除/],
    ['integrity mismatch', /SHA-256[^\n]*不符|校驗[^\n]*不符/],
    ['current permission', /dataset\.export/],
    ['current task scope', /任務範圍/],
    ['valid word artifact', /(?:word|詞級)[^\n]*(?:原檔|產物)/i],
    ['tokenizer unavailable', /切詞引擎[^\n]*不可用/],
    ['valid artifact still downloads', /(?:仍|照)[^\n]*(?:下載|交付)/],
  ]) assert.match(invalid, pattern, `AC-1.16 must cover ${name}`);
});

test('export history redownload serves immutable original bytes without querying current results', () => {
  const contract = contractLine('FR-021');
  assert.match(contract, /(?:原始|首次)[^。；]*?(?:檔案|產物)[^。；]*?(?:位元組|bytes)/i,
    'FR-021 must identify original artifact bytes as the redownload source');
  assert.match(contract, /(?:標記|審核)[^。；]*?(?:後續|變更|修改)[^。；]*?(?:不影響|相同|不得重建)/,
    'Later annotation or review changes must not change a historic download');
  assert.match(contract, /(?:不得|不需)[^。；]*?(?:重新查詢|重算|重新產生|切詞引擎)/,
    'Redownload must not recalculate from mutable results or tokenizer state');
  assert.doesNotMatch(contract, /以該列保存的條件快照[^。；]*?為唯一依據重建匯出結果/,
    'The old snapshot-rebuild contract conflicts with immutable original bytes');
  assert.match(contract, /不得[^。；]*?新增[^。；]*?匯出記錄/,
    'Redownload must not create a second history row');
  assert.match(contract, /(?:原始|首次)[^。；]*?檔名[^。；]*?(?:相同|保留|沿用)/,
    'Redownload must preserve the original filename');
});

test('multi-run export manifest records each run and its pinned versions', () => {
  const metadata = contractLine('FR-010i-1');
  const snapshot = contractLine('FR-010i-2');
  assert.match(metadata, /manifest\.runs\[\]/,
    'FR-010i-1 must define the per-run manifest collection');
  for (const field of [
    'run_id', 'cycle_id', 'dataset_version_id', 'config_version_id',
    'schema_version', 'guideline_version_id', 'sample_snapshot_id',
  ]) {
    assert.ok(metadata.includes(field), `Manifest lacks pinned ${field}`);
  }
  assert.match(snapshot, /(?:逐|每)(?:一|個)?\s*run[^。；]*?(?:順序|關聯|保存|記錄)/i,
    'FR-010i-2 must retain each selected run rather than one task-level version');
});

test('one export may select Dry and Official runs in manifest order', () => {
  for (const id of ['FR-009a', 'FR-015e']) {
    assert.match(contractLine(id),
      /(?:同一(?:次|筆|份)?匯出|同時|混合)[^。；]*?(?:Dry Run|試標)[^。；]*?(?:Official Run|正式標記)/i,
      `${id} must explicitly allow Dry and Official runs in one export`);
  }

  assert.match(contractLine('FR-010i-1'), /有序的\s*`?manifest\.runs\[\]`?/,
    'The manifest must preserve the order of selected runs');
  assert.match(contractLine('FR-010i-2'), /每個 run 的納入關聯及輸出順序須獨立保存/,
    'Each selected run must keep its own membership and output position');
});

test('mixed-stage conditions snapshot records each run stage without a false scalar stage', () => {
  const snapshot = contractLine('FR-010i-2');
  assert.match(snapshot, /runs\[\]\.run_stage/,
    'Each selected run must carry its own Dry or Official stage in the snapshot');
  assert.match(snapshot, /(?:混合|同時[^。；]*?(?:試標|Dry Run)[^。；]*?(?:正式標記|Official Run))[^。；]*?run_stage[^。；]*?(?:all|省略|不填)|run_stage[^。；]*?(?:all|省略|不填)[^。；]*?混合/i,
    'A mixed-stage export must use all or omit scalar run_stage instead of claiming one stage');
});

test('export idempotency key is requester-scoped and hashes a stable canonical command', () => {
  const contract = `${contractLine('FR-009a')} ${contractLine('FR-010i-2')}`;
  assert.match(contract, /(?:冪等(?:鍵|識別)|idempotency)[^。；]*?(?:task_id|任務)[^。；]*?(?:requester|請求者|請求人|requested_by)/i,
    'The same client key must be scoped by task and requester');
  assert.match(contract, /(?:canonical|正規化)[^。；]*?(?:command|命令)[^。；]*?(?:digest|雜湊|摘要)|(?:digest|雜湊|摘要)[^。；]*?(?:canonical|正規化)[^。；]*?(?:command|命令)/i,
    'Retries must compare a digest of the canonical request command');
  for (const field of [
    /task_id|任務/, /requester|請求者|請求人|requested_by/i,
    /export_format|格式/, /export_format_version|格式版本/,
    /(?:有序|順序|排序)[^。；]*?run_id|run_id[^。；]*?(?:有序|順序|排序)/i,
    /filters?|篩選/i, /language|語言/i,
    /(?:tagging_scheme|token_unit|序列)[^。；]*?(?:tokenizer|切詞)|(?:tokenizer|切詞)[^。；]*?(?:tagging_scheme|token_unit|序列)/i,
  ]) assert.match(contract, field, `Canonical command lacks ${field}`);
  assert.match(contract, /(?:排除|不含|不納入)[^。；]*?(?:生成|產生)[^。；]*?(?:時間|timestamp)/i,
    'Generated timestamps must not change the idempotency digest');
  assert.match(contract, /(?:排除|不含|不納入)[^。；]*?(?:產物|artifact|檔案)(?:資料|bytes|內容)?/i,
    'Generated artifact data must not change the idempotency digest');
});

test('JSON-MIN v2 uses a versioned envelope even for zero result rows', () => {
  const shape = constantLine('EXPORT_JSON_MIN_SHAPE');
  const exportRule = contractLine('FR-015h');
  assert.match(shape, /\{\s*manifest\s*,\s*rows\[\]\s*\}/,
    'JSON-MIN must have a manifest and rows[] envelope');
  assert.match(exportRule, /(?:版本|version)[^。；]*?2|(?:v2|v2\.0)/i,
    'The breaking JSON-MIN shape must declare format version 2');
  assert.match(exportRule, /(?:零筆|0\s*筆|空)[^。；]*?manifest/,
    'A zero-row export must still carry manifest metadata');
  assert.match(`${exportRule} ${contractLine('FR-021')}`, /(?:舊版|既有)[^。；]*?(?:原始|不改寫|保留)/,
    'Earlier export files must retain their original bytes');
});

test('export artifacts require permission, integrity, expiry and revocation checks', () => {
  const exportRule = contractLine('FR-009a');
  const download = contractLine('FR-021');
  const authorization = contractLine('FR-024');
  assert.match(exportRule, /(?:原子|完整)[^。；]*?(?:原始|不可變)[^。；]*?(?:產物|檔案)/,
    'Initial export must atomically save its immutable original artifact');
  assert.match(download, /(?:dataset\.export)[^。；]*?(?:當前|有效|active|membership)/i,
    'Every redownload must recheck current export permission and task scope');
  for (const [condition, pattern] of [
    ['expiry', /(?:到期|過期)[^。；]*?(?:拒絕|不得|停止|不可)/],
    ['revocation', /(?:撤銷|註銷)[^。；]*?(?:拒絕|不得|停止|不可)/],
    ['checksum', /(?:SHA-256|checksum|校驗碼|雜湊)[^。；]*?(?:不符|驗證|檢查)/i],
  ]) assert.match(download, pattern, `Redownload must reject ${condition}`);
  assert.match(authorization, /(?:標記者|annotator)[^。；]*?(?:私有答案|未提交審核草稿|blind review)/i,
    'Export authorization must preserve answer and reviewer-draft isolation');
  assert.match(download, /(?:內部|原始)[^。；]*?(?:物件|儲存)[^。；]*?(?:路徑|位置)[^。；]*?(?:不得|不回傳|隱藏)/,
    'Download responses must not expose an internal object-storage path');
});
