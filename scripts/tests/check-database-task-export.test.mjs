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
  assert.equal(data.tables.length, 37);
  for (const [count, unit] of summaryCounts(data)) {
    const unitPattern = unit === '張候選表' ? '張(?:候選)?表?' :
      unit === '個候選單欄 FK' ? '(?:個)?候選單欄 FK' : unit;
    assert.match(summary, new RegExp(`${count}\\s*${unitPattern}`),
      `Account/admin NoteCraft summary must report ${count} ${unit}`);
  }
  assert.match(summary, /account\/admin|帳號[／/]管理/, 'Account/admin group must appear');
  for (const dictionary of [
    'dataset-db-schema.md', 'task-run-db-schema.md', 'annotation-review-db-schema.md',
  ]) assert.ok(summary.includes(dictionary), `${dictionary} link`);
  assert.match(summary, /\[[^\]]*匯出[^\]]*\]\(\.\/task-export-db-schema\.md\)/,
    'Export dictionary link must appear in the NoteCraft summary');
  assert.match(summary, /\b2\s*張(?:候選)?表?/,
    'Export dictionary must contribute two tables');
});

test('NoteCraft CI runs export dictionary regression tests', () => {
  const workflow = read('../../.github/workflows/ci.yml');
  const job = workflow.match(/^  database-schema:\n([\s\S]*?)(?=^  [a-z][\w-]*:\n|(?![\s\S]))/m)?.[1];
  assert.ok(job, 'Missing database-schema CI job');
  assert.match(job, /node --test[^\n]*scripts\/tests\/check-database-task-export\.test\.mjs\b/);
});
