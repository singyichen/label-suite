import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as checker from '../check-database-schema.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const annotationPath = '../../docs/diagrams/architecture/annotation-review-db-schema.md';
const annotationMarkdown = () => read(annotationPath);
const erData = () => JSON.parse(read('../../docs/diagrams/architecture/database-schema.er.json'));
const inventory = () => read('../../docs/diagrams/architecture/database-table-inventory.md');
const annotationNames = [
  'annotation_record', 'annotation_review_draft', 'annotation_review_submission',
  'annotation_review_decision', 'annotation_arbitration_vote',
  'annotation_exception_resolution', 'annotation_history_event',
  'annotation_review_submission_revision',
];
const forbiddenNames = new Set([
  'annotation_review_assignment', 'annotation_review_unit',
  'annotation_dispute_item', 'annotation_gold_record',
]);
const forbiddenAnswerColumns = new Set([
  'hidden_answer', 'declared_split', 'gold_answer', 'is_gold', 'is_test', 'test_split',
]);

function annotationSource(markdown = annotationMarkdown()) {
  assert.equal(typeof checker.parseAnnotationReviewSchema, 'function',
    'A strict annotation/review schema parser is required');
  return checker.parseAnnotationReviewSchema(markdown);
}

function mergedSource() {
  return checker.mergeSchemaSources(
    checker.parseAccountAdminSchema(read('../../docs/diagrams/architecture/account-admin-db-schema.md')),
    checker.parseDatasetSchema(read('../../docs/diagrams/architecture/dataset-db-schema.md')),
    checker.parseTaskRunSchema(read('../../docs/diagrams/architecture/task-run-db-schema.md')),
    annotationSource(),
  );
}

function countProjection(data) {
  return {
    tables: data.tables.length,
    columns: data.tables.reduce((count, table) => count + table.columns.length, 0),
    fks: data.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0),
  };
}

function incrementCount(text, count, unit) {
  const changed = text.replace(new RegExp(`\\b${count}(?= ${unit})`), String(count + 1));
  assert.notEqual(changed, text, `Expected ${count} ${unit} in the summary`);
  return changed;
}

test('annotation/review dictionary has exactly eight physical tables and one non-null UUID PK each', () => {
  const source = annotationSource();
  assert.deepEqual(source.tables.map((table) => table.name), annotationNames);
  assert.equal(source.tables.reduce((count, table) => count + table.columns.length, 0), 82);
  assert.equal(source.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0), 14);
  for (const table of source.tables) {
    assert.deepEqual(table.columns.filter((column) => column.pk), [
      { name: 'id', type: 'uuid', nullable: false, pk: true },
    ], `${table.name} must have exactly one non-null UUID PK`);
    assert.equal(forbiddenNames.has(table.name), false, `${table.name} is a derived view`);
    for (const column of table.columns) {
      assert.equal(forbiddenAnswerColumns.has(column.name), false,
        `${table.name}.${column.name} cannot expose private answer fields`);
      assert.notEqual(column.fk, 'dataset_item_private',
        `${table.name}.${column.name} cannot link to private answers`);
    }
  }
});

test('history events reference the immutable reviewer revision rather than its mutable head', () => {
  const history = annotationSource().tables.find((table) => table.name === 'annotation_history_event');
  assert.ok(history, 'Expected annotation_history_event');
  assert.deepEqual(history.columns.find((column) => column.name === 'review_revision_id'), {
    name: 'review_revision_id', type: 'uuid', nullable: true, pk: false,
    fk: 'annotation_review_submission_revision',
  });
  assert.equal(history.columns.some((column) => column.name === 'review_submission_id'), false,
    'An event must not point only to the mutable reviewer head');
});

test('annotation/review parser rejects a fake edge from the private answer table', () => {
  const markdown = annotationMarkdown();
  const edge = '    annotation_review_submission ||--o{ annotation_review_decision : review_submission_id';
  assert.ok(markdown.includes(edge), 'Expected a stable internal review edge');
  const mutated = markdown.replace(edge,
    `    dataset_item_private ||--o{ annotation_review_decision : corrected_answer\n${edge}`);
  assert.throws(() => annotationSource(mutated), /(?:Mermaid|FK|relationship|edge).*annotation_review_decision|annotation_review_decision.*(?:Mermaid|FK|relationship|edge)/i);
});

test('annotation/review parser rejects an edge labeled with a non-FK column', () => {
  const markdown = annotationMarkdown();
  const edge = '    annotation_review_submission ||--o{ annotation_review_decision : review_submission_id';
  assert.ok(markdown.includes(edge), 'Expected a stable internal review edge');
  const mutated = markdown.replace(edge,
    '    annotation_review_submission ||--o{ annotation_review_decision : id');
  assert.throws(() => annotationSource(mutated), /(?:Mermaid|FK|relationship|edge).*annotation_review_decision|annotation_review_decision.*(?:Mermaid|FK|relationship|edge)/i);
});

test('annotation/review parser rejects a missing internal FK edge', () => {
  const markdown = annotationMarkdown();
  const edge = '    annotation_review_submission ||--o{ annotation_review_decision : review_submission_id\n';
  assert.ok(markdown.includes(edge), 'Expected a stable internal review edge');
  assert.throws(() => annotationSource(markdown.replace(edge, '')),
    /annotation_review_decision\.review_submission_id/i);
});

test('annotation/review parser rejects a missing Mermaid FK marker', () => {
  const markdown = annotationMarkdown();
  const column = '    annotation_review_decision {\n        uuid id PK\n        uuid review_submission_id FK';
  assert.ok(markdown.includes(column), 'Expected review submission FK marker');
  const mutated = markdown.replace(column,
    '    annotation_review_decision {\n        uuid id PK\n        uuid review_submission_id');
  assert.throws(() => annotationSource(mutated), /annotation_review_decision\.review_submission_id/i);
});

test('NoteCraft projection matches every source table, column, type, nullability, PK and FK', () => {
  const source = mergedSource();
  const data = erData();
  assert.deepEqual(countProjection(data), { tables: 35, columns: 288, fks: 41 });
  assert.deepEqual(checker.validateErData(source, data), []);
  const projected = data.tables.filter((table) => annotationNames.includes(table.name));
  assert.deepEqual(projected.map((table) => table.name), annotationNames);
  for (const table of projected) {
    assert.match(table.description, /候選|candidate/i);
    assert.match(table.description, /尚未|未部署|undeployed|not deployed/i);
    assert.ok(table.columns.every((column) => column.type && column.required));
    assert.equal(forbiddenNames.has(table.name), false);
    for (const column of table.columns) {
      assert.equal(forbiddenAnswerColumns.has(column.name), false);
      assert.notEqual(column.fk, 'dataset_item_private');
    }
  }
});

test('projection checker rejects annotation column, type, nullability, PK and FK drift', () => {
  const source = mergedSource();
  const data = erData();
  assert.deepEqual(checker.validateErData(source, data), [], 'The baseline projection must first match');
  const mutations = [
    ['column omission', (copy) => { copy.tables.find((table) => table.name === 'annotation_record').columns.pop(); }],
    ['type drift', (copy) => { copy.tables.find((table) => table.name === 'annotation_record').columns.find((column) => column.name === 'version').type = 'bigint'; }],
    ['nullability drift', (copy) => { copy.tables.find((table) => table.name === 'annotation_record').columns.find((column) => column.name === 'note').required = 'required'; }],
    ['PK drift', (copy) => { copy.tables.find((table) => table.name === 'annotation_record').columns.find((column) => column.name === 'id').pk = false; }],
    ['FK drift', (copy) => { copy.tables.find((table) => table.name === 'annotation_history_event').columns.find((column) => column.name === 'review_revision_id').fk = 'annotation_review_submission'; }],
  ];
  for (const [name, mutate] of mutations) {
    const copy = structuredClone(data);
    mutate(copy);
    assert.notDeepEqual(checker.validateErData(source, copy), [], `${name} must be rejected`);
  }
});

test('schema summary checker rejects stale metadata and inventory counts after annotation projection', () => {
  const data = erData();
  const markdown = inventory();
  assert.deepEqual(countProjection(data), { tables: 35, columns: 288, fks: 41 });
  assert.deepEqual(checker.validateSchemaSummary(data, markdown), []);
  const summary = markdown.split('\n').find((line) => line.startsWith('**NoteCraft 規劃檢視**'));
  assert.ok(summary, 'Expected a NoteCraft inventory summary');
  for (const [count, unit] of [[35, '張候選表'], [288, '欄'], [41, '個候選單欄 FK']]) {
    const staleData = structuredClone(data);
    staleData.meta.description = incrementCount(staleData.meta.description, count, unit);
    assert.notDeepEqual(checker.validateSchemaSummary(staleData, markdown), [],
      `Stale metadata ${unit} count must fail`);
    const staleInventory = markdown.replace(summary, incrementCount(summary, count, unit));
    assert.notDeepEqual(checker.validateSchemaSummary(data, staleInventory), [],
      `Stale inventory ${unit} count must fail`);
  }
});

test('NoteCraft CI runs the annotation/review schema regression', () => {
  const workflow = read('../../.github/workflows/ci.yml');
  const job = workflow.match(/^  database-schema:\n([\s\S]*?)(?=^  [a-z][\w-]*:\n|(?![\s\S]))/m)?.[1];
  assert.ok(job, 'Missing database-schema CI job');
  assert.match(job, /node --test[^\n]*scripts\/tests\/check-database-annotation-review\.test\.mjs\b/,
    'NoteCraft CI must execute check-database-annotation-review.test.mjs');
});
