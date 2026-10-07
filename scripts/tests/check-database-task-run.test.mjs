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
const inventory = () => read('../../docs/diagrams/architecture/database-table-inventory.md');
const summaryErrors = (data, markdown) => {
  assert.equal(typeof checker.validateSchemaSummary, 'function', 'Schema summary checker is required');
  return checker.validateSchemaSummary(data, markdown);
};
const countsFor = (data) => [
  [data.tables.length, '張候選表'],
  [data.tables.reduce((count, table) => count + table.columns.length, 0), '欄'],
  [data.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0),
    '個候選單欄 FK'],
];
const incrementCount = (text, count, unit) => {
  const mutated = text.replace(new RegExp(`\\b${count}(?= ${unit})`), String(count + 1));
  assert.notEqual(mutated, text, `Expected a ${unit} count in the summary`);
  return mutated;
};

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

test('task/run parser rejects a Mermaid edge from the private answer table', () => {
  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  assert.ok(checker.parseTaskRunSchema(markdown).tables.length > 0,
    'The real task/run dictionary must parse');
  const finalEdge = '    task_annotation_assignment ||--o| task_annotation_exclusion : assignment_id';
  assert.ok(markdown.includes(finalEdge), 'Expected the real task/run edge list');
  const mutated = markdown.replace(finalEdge,
    `    dataset_item_private ||--o{ task_run_item : hidden_answer\n${finalEdge}`);
  assert.throws(() => checker.parseTaskRunSchema(mutated),
    /(?:Mermaid|FK|relationship|edge).*dataset_item_private|dataset_item_private.*(?:Mermaid|FK|relationship|edge)/i);
});

test('task/run parser rejects a Mermaid edge labeled with a non-FK column', () => {
  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const validEdge = '    task ||--o{ task_config_version : task_id';
  assert.ok(markdown.includes(validEdge), 'Expected task config FK edge');
  const mutated = markdown.replace(validEdge, '    task ||--o{ task_config_version : id');
  assert.throws(() => checker.parseTaskRunSchema(mutated),
    /(?:Mermaid|FK|relationship|edge).*task_config_version|task_config_version.*(?:Mermaid|FK|relationship|edge)/i);
});

test('task/run parser rejects a missing Mermaid edge for a declared single-column FK', () => {
  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const validEdge = '    task ||--o{ task_config_version : task_id\n';
  assert.ok(markdown.includes(validEdge), 'Expected task config FK edge');
  const mutated = markdown.replace(validEdge, '');
  assert.throws(() => checker.parseTaskRunSchema(mutated), /task_config_version/i);
});

test('task/run parser rejects a missing Mermaid FK marker for a dictionary FK', () => {
  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const declaredColumn = '    task_config_version {\n        uuid id PK\n        uuid task_id FK';
  assert.ok(markdown.includes(declaredColumn), 'Expected task config FK marker');
  const mutated = markdown.replace(declaredColumn,
    '    task_config_version {\n        uuid id PK\n        uuid task_id');
  assert.throws(() => checker.parseTaskRunSchema(mutated), /task_config_version\.task_id/i);
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

test('schema summaries match counts derived from the NoteCraft tables', () => {
  assert.deepEqual(summaryErrors(erData(), inventory()), []);
});

test('schema summary checker rejects drift in each NoteCraft metadata count', () => {
  const data = erData();
  const markdown = inventory();
  const mutations = countsFor(data).map(([count, unit]) => {
    const mutated = structuredClone(data);
    mutated.meta.description = incrementCount(mutated.meta.description, count, unit);
    return [unit, mutated];
  });
  for (const [unit, mutated] of mutations) {
    assert.notDeepEqual(summaryErrors(mutated, markdown), [], `Stale metadata ${unit} count must fail`);
  }
});

test('schema summary checker rejects drift in each inventory NoteCraft count', () => {
  const data = erData();
  const markdown = inventory();
  const summary = markdown.split('\n').find((line) => line.startsWith('**NoteCraft 規劃檢視**'));
  assert.ok(summary, 'Inventory NoteCraft summary is required');
  const mutations = countsFor(data).map(([count, unit]) => {
    const mutatedSummary = incrementCount(summary, count, unit);
    return [unit, markdown.replace(summary, mutatedSummary)];
  });
  for (const [unit, mutated] of mutations) {
    assert.notDeepEqual(summaryErrors(data, mutated), [], `Stale inventory ${unit} count must fail`);
  }
});
