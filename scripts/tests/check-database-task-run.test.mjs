import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as checker from '../check-database-schema.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const taskSource = () => {
  assert.equal(typeof checker.parseTaskRunSchema, 'function', 'Task/run parser is required');
  const path = '../../docs/diagrams/architecture/task-run-db-schema.md';
  assert.ok(existsSync(new URL(path, import.meta.url)), 'Task/run dictionary is required');
  return checker.parseTaskRunSchema(read(path));
};
const erData = () => JSON.parse(read('../../docs/diagrams/architecture/database-schema.er.json'));

test('task/run dictionary contains physical candidates with no derived review assignment table', () => {
  const source = taskSource();
  assert.deepEqual(source.tables.map((table) => table.name), [
    'task', 'task_config_version', 'task_guideline_version', 'task_membership',
    'task_reviewer_roster_member', 'task_run_cycle', 'task_trial_round',
    'task_sample_snapshot', 'task_run', 'task_run_reviewer_candidate',
    'task_run_item', 'task_annotation_assignment', 'task_annotation_exclusion',
  ]);
  assert.ok(source.tables.every((table) => table.columns.some((column) => column.pk)),
    'Every candidate table needs a candidate PK');
  assert.equal(source.tables.some((table) => table.name === 'review_assignment'), false);
  assert.ok(source.tables.every((table) => table.columns.every((column) =>
    !['hidden_answer', 'declared_split'].includes(column.name))));
});

test('task/run NoteCraft projection matches every dictionary table, column, PK, FK and type', () => {
  const source = checker.mergeSchemaSources(
    checker.parseAccountAdminSchema(read('../../docs/diagrams/architecture/account-admin-db-schema.md')),
    checker.parseDatasetSchema(read('../../docs/diagrams/architecture/dataset-db-schema.md')),
    taskSource(),
  );
  const data = erData();
  assert.deepEqual(checker.validateErData(source, data), []);
  const taskNames = new Set(taskSource().tables.map((table) => table.name));
  for (const table of data.tables.filter((entry) => taskNames.has(entry.name))) {
    assert.match(table.description, /候選/);
    assert.match(table.description, /尚未|未部署/);
    assert.ok(table.columns.every((column) => column.type && column.required));
  }
});

test('task/run dictionary records cross-table rules that one-column diagram links cannot express', () => {
  taskSource();
  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const normalizedMarkdown = markdown.replace(/\s*,\s*/g, ',');
  for (const token of [
    '(task_id, user_id, task_role)', '(task_id, cycle_no)',
    '(task_run_cycle_id, round_no)', '(task_run_cycle_id, dataset_item_id)',
    '(task_run_id, dataset_item_id)', 'ReviewAssignment', 'SQLite', 'PostgreSQL',
  ]) assert.ok(normalizedMarkdown.includes(token.replace(/\s*,\s*/g, ',')),
    `Missing task/run constraint or caveat: ${token}`);
});

test('NoteCraft CI runs the task/run schema regression', () => {
  const workflow = read('../../.github/workflows/ci.yml');
  const job = workflow.match(/^  database-schema:\n([\s\S]*?)(?=^  [a-z][\w-]*:\n|(?![\s\S]))/m)?.[1];
  assert.ok(job, 'Missing database-schema CI job');
  assert.match(job, /node --test[^\n]*scripts\/tests\/check-database-task-run\.test\.mjs\b/,
    'NoteCraft CI must execute check-database-task-run.test.mjs');
});
