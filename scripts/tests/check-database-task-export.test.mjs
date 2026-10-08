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

test('NoteCraft records exported_at within the complete 38-table projection', () => {
  const data = erData();
  const record = data.tables.find((table) => table.name === 'task_export');
  assert.ok(record, 'Missing task_export projection');
  const exportedAt = record.columns.find((column) => column.name === 'exported_at');
  assert.ok(exportedAt, 'NoteCraft must show task_export.exported_at');
  assert.equal(exportedAt.type, 'timestamptz');
  assert.equal(exportedAt.required, 'nullable');
  assert.deepEqual(summaryCounts(data).map(([count]) => count), [38, 327, 44]);
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
  assert.equal(data.tables.length, 38);
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
