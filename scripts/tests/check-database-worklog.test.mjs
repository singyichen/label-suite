import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as checker from '../check-database-schema.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const workDictionary = () => read('../../docs/diagrams/architecture/task-work-db-schema.md');
const annotationDictionary = () => read('../../docs/diagrams/architecture/annotation-review-db-schema.md');
const accountDictionary = () => read('../../docs/diagrams/architecture/account-admin-db-schema.md');
const erData = () => JSON.parse(read('../../docs/diagrams/architecture/database-schema.er.json'));
const inventory = () => read('../../docs/diagrams/architecture/database-table-inventory.md');
const derivedOrPrivateColumn = /(?:^|_)(?:duration|count|speed|answer|split|payload|role|stage)(?:_|$)/i;

function workSource(markdown = workDictionary()) {
  assert.equal(typeof checker.parseTaskWorkSchema, 'function',
    'The work-interval dictionary needs a strict parser');
  return checker.parseTaskWorkSchema(markdown);
}

function allSources() {
  return checker.mergeSchemaSources(
    checker.parseAccountAdminSchema(accountDictionary()),
    checker.parseDatasetSchema(read('../../docs/diagrams/architecture/dataset-db-schema.md')),
    checker.parseTaskRunSchema(read('../../docs/diagrams/architecture/task-run-db-schema.md')),
    checker.parseAnnotationReviewSchema(annotationDictionary()),
    checker.parseTaskExportSchema(read('../../docs/diagrams/architecture/task-export-db-schema.md')),
    workSource(),
  );
}

test('work dictionary has one 11-column candidate interval and no report-summary table', () => {
  const source = workSource();
  assert.deepEqual(source.tables.map((table) => table.name), ['task_work_interval']);
  const columns = source.tables[0].columns;
  assert.deepEqual(columns.map((column) => column.name), [
    'id', 'user_id', 'account_session_id', 'task_id', 'run_id', 'membership_id',
    'work_kind', 'started_at', 'last_seen_at', 'ended_at', 'close_reason',
  ]);
  assert.deepEqual(columns.map((column) => [column.name, column.type, column.nullable]), [
    ['id', 'uuid', false],
    ['user_id', 'uuid', false],
    ['account_session_id', 'uuid', false],
    ['task_id', 'uuid', false],
    ['run_id', 'uuid', false],
    ['membership_id', 'uuid', false],
    ['work_kind', 'varchar(16)', false],
    ['started_at', 'timestamptz', false],
    ['last_seen_at', 'timestamptz', false],
    ['ended_at', 'timestamptz', true],
    ['close_reason', 'varchar(32)', true],
  ]);
  assert.deepEqual(columns.filter((column) => column.pk).map((column) => column.name), ['id']);
  assert.deepEqual(columns.filter((column) => column.fk), [],
    'Composite relationships must not be projected as false one-column FKs');
  assert.ok(columns.every((column) =>
    !derivedOrPrivateColumn.test(column.name)),
  'The source stores observable intervals, not derived metrics or private answers');
});

test('work dictionary defines same-owner composite FKs and one open interval per user', () => {
  const markdown = workDictionary();
  for (const relationship of [
    /\(task_id,\s*run_id\)[^\n]*?task_run\(task_id,\s*id\)/,
    /\(task_id,\s*membership_id,\s*user_id\)[^\n]*?task_membership\(task_id,\s*id,\s*user_id\)/,
    /\(user_id,\s*account_session_id\)[^\n]*?account_session\(user_id,\s*id\)/,
  ]) assert.match(markdown, relationship);
  assert.match(markdown, /UNIQUE\s*\(?\s*user_id\s*\)?\s*WHERE\s+ended_at\s+IS\s+NULL/i);
  assert.match(markdown, /started_at[^\n]*?last_seen_at[^\n]*?ended_at/);
  assert.match(markdown, /ended_at[^\n]*?close_reason[^\n]*?(?:成對|同有同無|一起)/);
  assert.match(markdown, /annotation\s*\|\s*review\s*\|\s*arbitration/);
  assert.match(markdown, /RESTRICT/);
  assert.match(markdown, /(?:SQLite|PostgreSQL)[\s\S]*?(?:SQLite|PostgreSQL)/);
});

test('work parser rejects a fabricated single-column FK line', () => {
  const markdown = workDictionary();
  const row = markdown.split('\n').find((line) => line.startsWith('| `run_id` |'));
  assert.ok(row, 'Expected the run_id dictionary row');
  assert.match(row, /\| uuid \|/);
  const changed = markdown.replace(row, row.replace('| uuid |', '| uuid → task_run |'));
  assert.throws(() => workSource(changed), /task_work_interval\.run_id|FK|Mermaid/i);
});

test('history event stores nullable verified account session as a real FK', () => {
  const markdown = annotationDictionary();
  const history = checker.parseAnnotationReviewSchema(markdown).tables
    .find((table) => table.name === 'annotation_history_event');
  assert.ok(history);
  assert.deepEqual(history.columns.find((column) => column.name === 'account_session_id'), {
    name: 'account_session_id', type: 'uuid', nullable: true, pk: false, fk: 'account_session',
  });
  assert.match(markdown, /account_session\s+\|\|--o\{\s+annotation_history_event\s*:\s*account_session_id/);
  assert.match(markdown, /`account_session_id`[^\n]*?(?:已驗證|驗證後)[^\n]*?`sid`|`account_session_id`[^\n]*?`sid`[^\n]*?(?:已驗證|驗證後)/);
  assert.match(markdown, /(?:舊|系統)[^\n]*?(?:可空|null)|(?:可空|null)[^\n]*?(?:舊|系統)/);
  assert.match(markdown, /(?:其他|跨人)[^\n]*?(?:session|工作階段)[^\n]*?(?:不|遮蔽|隔離)|(?:session|工作階段)[^\n]*?(?:其他|跨人)[^\n]*?(?:不|遮蔽|隔離)/);
});

test('account session dictionary preserves historical references on ordinary user deletion', () => {
  const markdown = accountDictionary();
  const userId = markdown.split('\n').find((line) => line.startsWith('| `user_id` | uuid → users |'));
  assert.ok(userId, 'Expected account_session.user_id row');
  assert.match(userId, /RESTRICT/);
  assert.doesNotMatch(userId, /CASCADE/);
  assert.match(markdown, /(?:歷程|工時)[^\n]*?RESTRICT|RESTRICT[^\n]*?(?:歷程|工時)/);
  assert.match(markdown, /\(user_id,\s*id\)[^\n]*?UNIQUE|UNIQUE[^\n]*?\(user_id,\s*id\)/);
});

test('NoteCraft projects the interval and history FK without derived or private columns', () => {
  const data = erData();
  const interval = data.tables.find((table) => table.name === 'task_work_interval');
  assert.ok(interval, 'Missing task_work_interval in NoteCraft');
  assert.match(interval.description, /候選/);
  assert.match(interval.description, /未部署|尚未/);
  assert.match(interval.description, /工作區間|工作時段/);
  assert.equal(interval.columns.length, 11);
  assert.deepEqual(interval.columns.filter((column) => column.pk).map((column) => column.name), ['id']);
  assert.ok(interval.columns.every((column) => column.type && column.required && column.note));
  assert.ok(interval.columns.every((column) => !column.fk));
  const history = data.tables.find((table) => table.name === 'annotation_history_event');
  assert.deepEqual(history?.columns.find((column) => column.name === 'account_session_id')?.fk,
    'account_session');
  assert.equal(history.columns.find((column) => column.name === 'account_session_id').required,
    'nullable');
  assert.equal(data.tables.some((table) => table.name === 'WorkLogEntry'), false);
  assert.ok(interval.columns.every((column) =>
    !derivedOrPrivateColumn.test(column.name)));
});

test('all six dictionaries and NoteCraft agree on every projected table and summary', () => {
  const data = erData();
  assert.deepEqual(checker.validateErData(allSources(), data), []);
  assert.deepEqual(checker.validateSchemaSummary(data, inventory()), []);
  assert.deepEqual([
    data.tables.length,
    data.tables.reduce((count, table) => count + table.columns.length, 0),
    data.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0),
  ], [40, 342, 47]);
  assert.match(data.meta.source, /task-work-db-schema\.md/);
  assert.match(data.meta.description, /工作區間|工時/);
  assert.match(inventory(), /task-work-db-schema\.md/);
  assert.match(inventory(), /`WorkLogEntry`[^\n]*?(?:投影|不建表)/);
});

test('projection checker rejects interval omission and the history session FK drift', () => {
  const source = allSources();
  const data = erData();
  const missingInterval = structuredClone(data);
  missingInterval.tables = missingInterval.tables.filter((table) => table.name !== 'task_work_interval');
  assert.match(checker.validateErData(source, missingInterval).join('\n'), /Missing table: task_work_interval/);

  const missingFk = structuredClone(data);
  const history = missingFk.tables.find((table) => table.name === 'annotation_history_event');
  assert.ok(history, 'Expected the history table');
  delete history.columns.find((column) => column.name === 'account_session_id').fk;
  assert.match(checker.validateErData(source, missingFk).join('\n'),
    /annotation_history_event\.account_session_id.*FK/);
});

test('summary checker rejects one-table and one-FK drift', () => {
  const data = erData();
  const staleTables = structuredClone(data);
  staleTables.meta.description = staleTables.meta.description.replace('40 張候選表', '39 張候選表');
  assert.match(checker.validateSchemaSummary(staleTables, inventory()).join('\n'),
    /NoteCraft metadata: tables count/);
  const staleInventory = inventory().replace('47 個候選單欄 FK', '46 個候選單欄 FK');
  assert.match(checker.validateSchemaSummary(data, staleInventory).join('\n'),
    /inventory NoteCraft summary: FKs count/);
});

test('NoteCraft CI includes the WorkLog physical contract test', () => {
  assert.match(read('../../.github/workflows/ci.yml'),
    /node --test[^\n]*scripts\/tests\/check-database-worklog\.test\.mjs/);
});
