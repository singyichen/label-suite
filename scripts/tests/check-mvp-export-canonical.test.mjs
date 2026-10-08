import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
