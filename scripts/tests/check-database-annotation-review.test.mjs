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
    checker.parseTaskExportSchema(read('../../docs/diagrams/architecture/task-export-db-schema.md')),
    checker.parseTaskWorkSchema(read('../../docs/diagrams/architecture/task-work-db-schema.md')),
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
  assert.equal(source.tables.reduce((count, table) => count + table.columns.length, 0), 83);
  assert.equal(source.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0), 15);
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

test('every arbitration choice stores a non-null reason', () => {
  const vote = annotationSource().tables.find((table) => table.name === 'annotation_arbitration_vote');
  assert.ok(vote, 'Expected annotation_arbitration_vote');
  assert.deepEqual(vote.columns.find((column) => column.name === 'reason'), {
    name: 'reason', type: 'text', nullable: false, pk: false,
  }, 'FR-089 requires a reason for every adjudicated choice');
});

test('arbitration reason constraint rejects blank text for every choice', () => {
  const rule = annotationMarkdown().split('\n').find((line) => line.startsWith('| V-05 |'));
  assert.ok(rule, 'Expected V-05 arbitration rule');
  assert.match(rule, /(?:所有|全部|每(?:筆|張)|三種)[^|]*(?:choice|選項|裁定|票)[^|]*(?:reason|理由)|(?:reason|理由)[^|]*(?:所有|全部|每(?:筆|張)|三種)[^|]*(?:choice|選項|裁定|票)/,
    'V-05 must cover adopt_a, adopt_b and reject, not reject alone');
  assert.match(rule, /CHECK[^|]*trim\s*\(\s*reason\s*\)[^|]*(?:<>|!=|>|非空白)/i,
    'V-05 must specify a database CHECK that rejects a blank reason');
});

test('one reviewer submission records its timing pair exactly once across per-key history events', () => {
  const rule = annotationMarkdown().split('\n').find((line) => line.startsWith('| H-04 |'));
  assert.ok(rule, 'Expected H-04 history rule');
  assert.match(rule, /review_revision_id/,
    'FR-088 timing must be scoped to one immutable reviewer submission revision');
  assert.match(rule, /(?:第一筆|首筆|first)[^|]*(?:started_at)[^|]*(?:lead_time_ms)|(?:started_at)[^|]*(?:lead_time_ms)[^|]*(?:第一筆|首筆|first)/i,
    'The first per-key decision event must carry both timing fields');
  assert.match(rule, /(?:其餘|其他|後續|sibling)[^|]*(?:started_at|lead_time_ms)[^|]*NULL/i,
    'Sibling per-key decision events must leave both timing fields NULL');
});

test('answer-changing history actions keep a complete private-data-free output snapshot', () => {
  const rule = annotationMarkdown().split('\n').find((line) => line.startsWith('| H-04 |'));
  assert.ok(rule, 'Expected H-04 history rule');
  for (const action of ['submitted', 'modified', 'adjudicated']) {
    assert.match(rule, new RegExp(`\\b${action}\\b`), `${action} must require a result snapshot`);
  }
  assert.match(rule, /result_snapshot[^|]*(?:非空|必填|NOT NULL)|(?:非空|必填|NOT NULL)[^|]*result_snapshot/i,
    'FR-087 requires a non-null result_snapshot for answer-changing actions');
  assert.match(rule, /(?:完整|full)[^|]*outputs\[\]|outputs\[\][^|]*(?:完整|full)/i,
    'The snapshot must contain the complete outputs[]');
  assert.match(rule, /(?:排除|不得包含|exclude)[^|]*(?:原始文本|input text|資料集欄位|dataset fields)/i,
    'The snapshot must exclude input text and dataset fields');
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

test('annotation/review parser rejects a Mermaid datatype that contradicts the dictionary', () => {
  const markdown = annotationMarkdown();
  const mutated = markdown.replace(
    /(    annotation_history_event \{\n[\s\S]*?)(        uuid review_revision_id FK)/,
    '$1        text review_revision_id FK',
  );
  assert.notEqual(mutated, markdown, 'Expected to mutate the history revision Mermaid datatype');
  assert.throws(() => annotationSource(mutated),
    /annotation_history_event\.review_revision_id|Mermaid.*type|type.*mismatch/i);
});

test('NoteCraft projection matches every source table, column, type, nullability, PK and FK', () => {
  const source = mergedSource();
  const data = erData();
  assert.deepEqual(countProjection(data), { tables: 40, columns: 342, fks: 47 });
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
  assert.deepEqual(countProjection(data), { tables: 40, columns: 342, fks: 47 });
  assert.deepEqual(checker.validateSchemaSummary(data, markdown), []);
  const summary = markdown.split('\n').find((line) => line.startsWith('**NoteCraft 規劃檢視**'));
  assert.ok(summary, 'Expected a NoteCraft inventory summary');
  for (const [count, unit] of [[40, '張候選表'], [342, '欄'], [47, '個候選單欄 FK']]) {
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

// Issue #1221: append-only enforcement is fixed by A-01 / ADR-024 amendment.
const annotationRow = (id) => {
  const row = annotationMarkdown().split('\n').find((line) => line.startsWith(`| ${id} |`));
  assert.ok(row, `Expected ${id} rule row`);
  return row;
};

test('annotation dictionary A-01 is the last section 4 row and defines append-only triggers', () => {
  const lines = annotationMarkdown().split('\n');
  const index = lines.findIndex((line) => line.startsWith('| A-01 |'));
  assert.ok(index >= 0, 'Expected A-01 append-only rule row');
  assert.ok(!(lines[index + 1] ?? '').startsWith('|'), 'A-01 must be the last row of the section 4 table');
  const row = lines[index];
  assert.equal(row.split('|').map((cell) => cell.trim())[2], 'DB', 'A-01 position cell must be DB');
  for (const token of ['annotation_history_event', 'annotation_arbitration_vote',
    'annotation_review_submission_revision', 'BEFORE UPDATE', 'BEFORE DELETE', 'SQLite',
    'PostgreSQL', 'REVOKE UPDATE, DELETE, TRUNCATE', 'ADR-024']) {
    assert.ok(row.includes(token), `A-01 must mention ${token}`);
  }
});

test('annotation dictionary V-05 delegates vote immutability to A-01', () => {
  const row = annotationRow('V-05');
  assert.doesNotMatch(row, /待 migration 決定/, 'V-05 must not defer immutability to the migration');
  assert.match(row, /A-01/, 'V-05 must reference A-01');
});

test('annotation dictionary H-01 and N-01 reference A-01', () => {
  assert.match(annotationRow('H-01'), /A-01/, 'H-01 must reference A-01');
  assert.match(annotationRow('N-01'), /A-01/, 'N-01 must reference A-01');
});

test('annotation dictionary section 7 item 4 no longer defers append-only triggers', () => {
  const item = annotationMarkdown().split('\n').find((line) => line.startsWith('4. **稽核與保留**'));
  assert.ok(item, 'Expected section 7 item 4');
  assert.doesNotMatch(item, /append-only 的 DB trigger[^\n]*migration PR 決定/);
  assert.match(item, /A-01/, 'Item 4 must reference A-01');
});

test('annotation history H-03 ties draft_saved to annotators and writes no event for reviewer drafts', () => {
  const row = annotationMarkdown().split('\n').find((line) => line.startsWith('| H-03 |'));
  assert.ok(row, 'Expected the H-03 row');
  assert.match(row,
    /draft_saved[^|]*actor_task_role[^|]*annotator|actor_task_role[^|]*annotator[^|]*draft_saved/,
    'H-03 must CHECK draft_saved against the annotator actor_task_role snapshot');
  assert.match(row, /審核員草稿[^|]*(?:不寫|不得產生|不產生)[^|]*(?:事件|history)/,
    'H-03 must state reviewer drafts write no history event');
  assert.match(row, /FR-014S/, 'H-03 must cite FR-014S');
});
