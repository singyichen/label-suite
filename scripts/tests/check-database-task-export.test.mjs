import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as checker from '../check-database-schema.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const exportMarkdown = () => read('../../docs/diagrams/architecture/task-export-db-schema.md');
const erData = () => JSON.parse(read('../../docs/diagrams/architecture/database-schema.er.json'));
const inventory = () => read('../../docs/diagrams/architecture/database-table-inventory.md');
const exportSource = (markdown = exportMarkdown()) => {
  assert.equal(typeof checker.parseTaskExportSchema, 'function',
    'The export dictionary needs a strict checker parser');
  return checker.parseTaskExportSchema(markdown);
};
const allSources = () => checker.mergeSchemaSources(
  checker.parseAccountAdminSchema(read('../../docs/diagrams/architecture/account-admin-db-schema.md')),
  checker.parseDatasetSchema(read('../../docs/diagrams/architecture/dataset-db-schema.md')),
  checker.parseTaskRunSchema(read('../../docs/diagrams/architecture/task-run-db-schema.md')),
  checker.parseAnnotationReviewSchema(read('../../docs/diagrams/architecture/annotation-review-db-schema.md')),
  exportSource(),
  checker.parseTaskWorkSchema(read('../../docs/diagrams/architecture/task-work-db-schema.md')),
);
const summaryCounts = (data) => [
  [data.tables.length, '張候選表'],
  [data.tables.reduce((count, table) => count + table.columns.length, 0), '欄'],
  [data.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0),
    '個候選單欄 FK'],
];
const incrementCount = (text, count, unit) => {
  const mutated = text.replace(new RegExp(`\\b${count}(?= ${unit})`), String(count + 1));
  assert.notEqual(mutated, text, `Expected ${unit} in the summary`);
  return mutated;
};

test('export dictionary defines two candidate tables with their complete primary keys', () => {
  const source = exportSource();
  assert.deepEqual(source.tables.map((table) => table.name), ['task_export', 'task_export_run']);
  assert.deepEqual(source.tables.map((table) => [
    table.name,
    table.columns.filter((column) => column.pk).map((column) => column.name),
  ]), [
    ['task_export', ['id']],
    ['task_export_run', ['export_id', 'run_id']],
  ]);
  assert.deepEqual(source.tables.flatMap((table) => table.columns
    .filter((column) => column.fk).map((column) => `${table.name}.${column.name}->${column.fk}`)), [
    'task_export.task_id->task',
    'task_export.requested_by_user_id->users',
  ]);
  assert.ok(source.tables.every((table) => table.columns.every((column) =>
    !/(?:hidden_answer|private_payload|declared_split|review_draft)/i.test(column.name))),
  'Export history must not store hidden answers, private payloads, splits or draft reviews');
});

test('export parser rejects a Mermaid edge that does not match a declared FK', () => {
  const markdown = exportMarkdown();
  const edge = '    task ||--o{ task_export : task_id';
  assert.ok(markdown.includes(edge), 'Expected the task export FK edge');
  assert.ok(exportSource().tables.length > 0, 'The real export dictionary must parse');
  assert.throws(() => exportSource(markdown.replace(edge,
    '    task ||--o{ task_export : request_digest')),
  /(?:Mermaid|FK|relationship|edge).*task_export|task_export.*(?:Mermaid|FK|relationship|edge)/i);
});

test('export parser rejects a missing Mermaid edge for a declared single-column FK', () => {
  const markdown = exportMarkdown();
  const edge = '    users ||--o{ task_export : requested_by_user_id\n';
  assert.ok(markdown.includes(edge), 'Expected the requester FK edge');
  assert.throws(() => exportSource(markdown.replace(edge, '')), /task_export\.requested_by_user_id/i);
});

test('export parser rejects a Mermaid FK marker that is absent from the dictionary', () => {
  const markdown = exportMarkdown();
  const column = '        uuid requested_by_user_id FK';
  assert.ok(markdown.includes(column), 'Expected the requester Mermaid FK marker');
  assert.throws(() => exportSource(markdown.replace(column,
    '        uuid requested_by_user_id')),
  /task_export\.requested_by_user_id/i);
});

test('export parser rejects an edge from the private answer table', () => {
  const markdown = exportMarkdown();
  const edge = '    users ||--o{ task_export : requested_by_user_id';
  assert.ok(markdown.includes(edge), 'Expected the requester FK edge');
  assert.throws(() => exportSource(markdown.replace(edge,
    `    dataset_item_private ||--o{ task_export : hidden_answer\n${edge}`)),
  /(?:Mermaid|FK|relationship|edge).*dataset_item_private|dataset_item_private.*(?:Mermaid|FK|relationship|edge)/i);
});

test('export parser rejects an existing but out-of-scope FK target without an edge', () => {
  const markdown = exportMarkdown();
  const dictionaryColumn = '| `task_id` | uuid → task |';
  const edge = '    task ||--o{ task_export : task_id\n';
  assert.ok(markdown.includes(dictionaryColumn), 'Expected the task_id dictionary FK');
  assert.ok(markdown.includes(edge), 'Expected the task_id Mermaid FK edge');
  assert.ok(allSources().tables.some((table) => table.name === 'dataset'),
    'dataset is a real parent elsewhere, not an allowed export parent');
  const invalid = markdown.replace(dictionaryColumn, '| `task_id` | uuid → dataset |')
    .replace(edge, '');
  assert.throws(() => exportSource(invalid), /task_export\.task_id.*dataset|dataset.*task_export\.task_id/i);
});

test('export dictionary separates request acceptance from the finalized result time', () => {
  const markdown = exportMarkdown();
  const source = exportSource();
  const record = source.tables.find((table) => table.name === 'task_export');
  assert.ok(record, 'Missing task_export dictionary table');
  assert.deepEqual(record.columns.find((column) => column.name === 'requested_at'), {
    name: 'requested_at', type: 'timestamptz', nullable: false, pk: false,
  });
  assert.deepEqual(record.columns.find((column) => column.name === 'exported_at'), {
    name: 'exported_at', type: 'timestamptz', nullable: true, pk: false,
  });
  const row = (name) => markdown.split('\n').find((line) => line.startsWith(`| \`${name}\` |`));
  assert.match(row('requested_at'), /(?:接受|請求)/);
  assert.doesNotMatch(row('requested_at'), /`exported_at`/,
    'The request timestamp must not be projected as result time');
  assert.match(row('exported_at'), /(?:結果|資料)(?:讀取)?快照/,
    'The persisted result timestamp must describe the actual snapshot');
  const e02 = markdown.split('\n').find((line) => line.startsWith('| E-02 |'));
  assert.match(e02, /`exported_at`/);
  assert.match(e02, /(?:結果|資料)(?:讀取)?快照/);
  assert.match(e02, /(?:manifest|檔名)/);
  const e04 = markdown.split('\n').find((line) => line.startsWith('| E-04 |'));
  assert.match(e04, /`ready`[^|]*`exported_at`|`exported_at`[^|]*`ready`/);
  assert.match(e04, /(?:原子|同一交易)[^|]*(?:原始|不可變)[^|]*(?:產物|檔案)/);
  const e05 = markdown.split('\n').find((line) => line.startsWith('| E-05 |'));
  assert.match(e05, /(?:未|尚未)[^|]*`ready`[^|]*(?:重試|重新執行)[^|]*(?:較晚|新的|重新)[^|]*(?:結果|資料)快照/);
  assert.match(e05, /`ready`[^|]*(?:重試|冪等)[^|]*(?:原始|同一|既有)[^|]*(?:產物|檔案)/);
  assert.match(markdown, /`conditions_snapshot`[^。；\n]*?(?:不含|排除|不寫入)[^。；\n]*?`exported_at`/,
    'Accepted conditions must not embed the later result timestamp');
});

test('NoteCraft records exported_at within the complete 40-table projection', () => {
  const data = erData();
  const record = data.tables.find((table) => table.name === 'task_export');
  assert.ok(record, 'Missing task_export projection');
  const exportedAt = record.columns.find((column) => column.name === 'exported_at');
  assert.ok(exportedAt, 'NoteCraft must show task_export.exported_at');
  assert.equal(exportedAt.type, 'timestamptz');
  assert.equal(exportedAt.required, 'nullable');
  assert.deepEqual(summaryCounts(data).map(([count]) => count), [40, 351, 34]);
});

test('NoteCraft projection matches export dictionary tables, columns, types and keys', () => {
  const source = allSources();
  const data = erData();
  assert.deepEqual(checker.validateErData(source, data), []);
  const exportTables = data.tables.filter((table) =>
    ['task_export', 'task_export_run'].includes(table.name));
  assert.equal(exportTables.length, 2, 'Both export tables must appear in NoteCraft');
  for (const table of exportTables) {
    assert.match(table.description, /候選/);
    assert.match(table.description, /尚未|未部署/);
    assert.ok(table.columns.every((column) => column.type && column.required));
    assert.ok(table.columns.every((column) =>
      !/(?:hidden_answer|private_payload|declared_split|review_draft)/i.test(column.name)));
  }
  const mutated = structuredClone(data);
  const digest = mutated.tables.find((table) => table.name === 'task_export')
    .columns.find((column) => column.name === 'request_digest');
  digest.type = 'varchar(64)';
  assert.match(checker.validateErData(source, mutated).join('\n'), /task_export\.request_digest: type/);
});

test('NoteCraft and inventory counts include export tables and reject stale summaries', () => {
  const data = erData();
  const markdown = inventory();
  assert.deepEqual(checker.validateSchemaSummary(data, markdown), []);
  const meta = data.meta.description;
  const inventorySummary = markdown.split('\n')
    .find((line) => line.startsWith('**NoteCraft 規劃檢視**'));
  assert.ok(inventorySummary, 'Inventory NoteCraft summary is required');
  for (const [count, unit] of summaryCounts(data)) {
    const staleData = structuredClone(data);
    staleData.meta.description = incrementCount(meta, count, unit);
    assert.notDeepEqual(checker.validateSchemaSummary(staleData, markdown), [],
      `Stale NoteCraft metadata ${unit} must fail`);
    const staleSummary = incrementCount(inventorySummary, count, unit);
    assert.notDeepEqual(checker.validateSchemaSummary(data,
      markdown.replace(inventorySummary, staleSummary)), [],
    `Stale inventory ${unit} must fail`);
  }
});

test('account/admin NoteCraft summary includes every projected group and the export dictionary', () => {
  const summary = read('../../docs/diagrams/architecture/account-admin-db-schema.md')
    .split('\n').find((line) => line.startsWith('- **NoteCraft 規劃檢視**'));
  assert.ok(summary, 'Account/admin NoteCraft summary is required');

  const data = erData();
  assert.equal(data.tables.length, 40);
  for (const [count, unit] of summaryCounts(data)) {
    const unitPattern = unit === '張候選表' ? '張(?:候選)?表?' :
      unit === '個候選單欄 FK' ? '(?:個)?候選單欄 FK' : unit;
    assert.match(summary, new RegExp(`${count}\\s*${unitPattern}`),
      `Account/admin NoteCraft summary must report ${count} ${unit}`);
  }
  assert.match(summary, /account\/admin|帳號[／/]管理/, 'Account/admin group must appear');
  for (const dictionary of [
    'dataset-db-schema.md', 'task-run-db-schema.md', 'annotation-review-db-schema.md',
    'task-work-db-schema.md',
  ]) assert.ok(summary.includes(dictionary), `${dictionary} link`);
  assert.match(summary, /\[[^\]]*匯出[^\]]*\]\(\.\/task-export-db-schema\.md\)/,
    'Export dictionary link must appear in the NoteCraft summary');
  assert.match(summary, /\b2\s*張(?:候選)?表?/,
    'Export dictionary must contribute two tables');
});

test('task/run pending-items note points to decided annotation and export table dictionaries', () => {
  const section = read('../../docs/diagrams/architecture/task-run-db-schema.md')
    .split('## 7. 待決與不得推測事項')[1];
  assert.ok(section, 'Task/run pending-items section is required');
  const item = section.split('\n').find((line) => line.startsWith('4. '));
  assert.ok(item, 'Task/run pending item 4 is required');
  for (const dictionary of ['annotation-review-db-schema.md', 'task-export-db-schema.md']) {
    assert.ok(item.includes(`(./${dictionary})`), `${dictionary} cross-reference`);
  }
  assert.doesNotMatch(item,
    /(?:annotation[／/]review|標記[／/]審核|export|匯出)[^。；\n]*表形[^。；\n]*(?:另行裁決|待(?:裁決|定案|決定)|尚未(?:裁決|定案|決定))/i,
    'Annotation/review and export table shapes have candidate dictionaries');
});

test('retryable failed export reuses its row and preserves the accepted command', () => {
  const dictionary = readFileSync(new URL('../../docs/diagrams/architecture/task-export-db-schema.md', import.meta.url), 'utf8');
  const e04 = dictionary.match(/^\| E-04 \|[^\n]*$/m)?.[0];
  const e05 = dictionary.match(/^\| E-05 \|[^\n]*$/m)?.[0];
  assert.ok(e04 && e05, 'Export lifecycle and idempotency rules are required');
  assert.match(e04, /failed → processing/);
  assert.match(e04, /ready.*(?:終態|不可逆)/);
  assert.match(e04, /failure_code/);
  assert.match(e05, /conditions_snapshot/);
});

test('NoteCraft CI runs export dictionary regression tests', () => {
  const workflow = read('../../.github/workflows/ci.yml');
  const job = workflow.match(/^  database-schema:\n([\s\S]*?)(?=^  [a-z][\w-]*:\n|(?![\s\S]))/m)?.[1];
  assert.ok(job, 'Missing database-schema CI job');
  assert.match(job, /node --test[^\n]*scripts\/tests\/check-database-task-export\.test\.mjs\b/);
});

// Issue #1224: export retention follows ADR-038.
test('export dictionary E-09 and section 7 item 3 follow ADR-038', () => {
  const markdown = exportMarkdown();
  const e09 = markdown.split('\n').find((line) => line.startsWith('| E-09 |'));
  assert.ok(e09, 'Missing E-09 row');
  assert.ok(e09.includes('ADR-038'), 'E-09 must mention ADR-038');
  assert.ok(e09.includes('實體刪除'), 'E-09 must mention 實體刪除');
  const item = markdown.split('\n').find((line) => line.startsWith('3. '));
  assert.ok(item, 'Missing section 7 item 3');
  assert.ok(item.includes('ADR-038'), 'Section 7 item 3 must mention ADR-038');
  assert.ok(!item.includes('總體資料保留政策協調'), 'Obsolete 協調 wording must be removed');
});

// Issue #1223 G2: export index coverage, header version drift, json convention, composite-key notes.
const accountMarkdown = () => read('../../docs/diagrams/architecture/account-admin-db-schema.md');
const section = (markdown, from, to) => {
  const start = markdown.indexOf(from);
  assert.ok(start >= 0, `Missing ${from}`);
  const end = markdown.indexOf(to, start + from.length);
  return markdown.slice(start, end < 0 ? undefined : end);
};

test('export indexes cover the expiry sweep and orphan-object reconciliation without pinning a cadence', () => {
  const indexes = section(exportMarkdown(), '## 5. 索引與查詢成本', '\n## 6.');
  const rows = indexes.split('\n').filter((line) => line.startsWith('|'));
  assert.ok(rows.some((row) => /`task_export\(\s*(?:status\s*,\s*)?expires_at/.test(row)),
    'Missing task_export expires_at covering index for the expiry sweep');
  assert.ok(rows.some((row) => /`task_export\(\s*artifact_ref/.test(row)),
    'Missing task_export artifact_ref covering index for orphan-object reconciliation');
});

test('export rules describe the expiry sweep and orphan-object reconciliation without a cadence', () => {
  const rules = section(exportMarkdown(), '## 4. 鍵、限制與生命週期', '\n## 5.');
  const sweep = rules.split('\n').find((line) => /(?:清掃|掃描)/.test(line) && /`expires_at`/.test(line) && /`ready`/.test(line));
  assert.ok(sweep, 'Missing expiry sweep rule mentioning `ready` rows past `expires_at`');
  const orphan = rules.split('\n').find((line) => /孤兒/.test(line) && /對帳/.test(line) && /`artifact_ref`/.test(line));
  assert.ok(orphan, 'Missing orphan-object reconciliation rule mentioning `artifact_ref`');
  assert.match(orphan, /(?:無列|沒有列|缺列)/, 'Reconciliation must cover objects without a row');
  assert.match(orphan, /(?:無物件|缺物件|物件缺失)/, 'Reconciliation must cover rows without an object');
  for (const line of [sweep, orphan]) assert.doesNotMatch(line, /\d+\s*(?:秒|分鐘|小時)/, 'Do not pin a cadence');
});

test('export dictionary header does not pin a stale 014 version', () => {
  const header = exportMarkdown().split('\n')[2];
  const spec = read('../../specs/task-management/014-task-detail/spec.md');
  const current = spec.match(/^版本: (\d+\.\d+\.\d+)/m)?.[1];
  assert.ok(current, 'Expected 014 spec version');
  for (const [, version] of header.matchAll(/v(\d+\.\d+\.\d+)/g)) {
    assert.equal(version, current, `Header pins stale 014 version v${version}`);
  }
  assert.match(header, /(?:以正典 Changelog 為準|目前版本)/);
});

test('audit payload_summary uses the logical json type everywhere, with PostgreSQL JSONB mapping stated once', () => {
  const markdown = accountMarkdown();
  const dictionaryType = checker.parseAccountAdminSchema(markdown).tables
    .find((table) => table.name === 'audit_events').columns.find((column) => column.name === 'payload_summary').type;
  const erType = erData().tables.find((table) => table.name === 'audit_events')
    .columns.find((column) => column.name === 'payload_summary').type;
  assert.equal(dictionaryType, 'json');
  assert.equal(erType, dictionaryType);
  assert.match(markdown, /^\s+json payload_summary/m);
  const mapping = /`json`[^。\n]*PostgreSQL[^。\n]*JSONB/;
  const jsonbLines = markdown.split('\n').filter((line) => /jsonb/i.test(line));
  assert.equal(jsonbLines.length, 1, 'JSONB is named only in the single shared mapping sentence');
  assert.match(jsonbLines[0], mapping);
});

test('composite-key tables in account-admin and export domains disclose unplotted composite keys in the ER description', () => {
  const tables = erData().tables;
  for (const name of ['account_session', 'account_notification_preference', 'admin_role_permission', 'task_export', 'task_export_run']) {
    const table = tables.find((candidate) => candidate.name === name);
    assert.ok(table, `Missing ${name}`);
    assert.match(table.description, /複合[^。\n]*(?:不畫|未畫|不繪|未繪|不會畫|不會繪)[^。\n]*§4/, `${name} description needs the composite-not-drawn sentence`);
  }
});
