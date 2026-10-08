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

// Issue #1221: append-only enforcement is fixed by A-01 / ADR-024 amendment.
const annotationRow = (id) => {
  const row = annotationMarkdown().split('\n').find((line) => line.startsWith(`| ${id} |`));
  assert.ok(row, `Expected ${id} rule row`);
  return row;
};

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
  assert.equal(source.tables.reduce((count, table) => count + table.columns.length, 0), 91);
  assert.equal(source.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0), 2);
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

test('history events reference the immutable reviewer revision through a same-unit composite FK', () => {
  const history = annotationSource().tables.find((table) => table.name === 'annotation_history_event');
  assert.ok(history, 'Expected annotation_history_event');
  assert.deepEqual(history.columns.find((column) => column.name === 'review_revision_id'), {
    name: 'review_revision_id', type: 'uuid', nullable: true, pk: false,
  }, 'review_revision_id is a composite FK participant: nullable uuid with no single-column FK');
  assert.equal(history.columns.some((column) => column.name === 'review_submission_id'), false,
    'An event must not point only to the mutable reviewer head');
  const row = annotationRow('H-05');
  assert.match(row, /annotation_review_submission_revision/, 'H-05 must name the immutable revision table');
  assert.match(row, /\(run_id,\s*assignment_id,\s*review_revision_id\)/,
    'H-05 must declare the same-unit composite (run_id,assignment_id,review_revision_id)');
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
    /(    annotation_history_event \{\n[\s\S]*?)(        uuid account_session_id FK)/,
    '$1        text account_session_id FK',
  );
  assert.notEqual(mutated, markdown, 'Expected to mutate the history session Mermaid datatype');
  assert.throws(() => annotationSource(mutated),
    /annotation_history_event\.account_session_id|Mermaid.*type|type.*mismatch/i);
});

test('NoteCraft projection matches every source table, column, type, nullability, PK and FK', () => {
  const source = mergedSource();
  const data = erData();
  assert.deepEqual(countProjection(data), { tables: 40, columns: 351, fks: 34 });
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
    ['FK drift', (copy) => { copy.tables.find((table) => table.name === 'annotation_history_event').columns.find((column) => column.name === 'account_session_id').fk = 'annotation_record'; }],
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
  assert.deepEqual(countProjection(data), { tables: 40, columns: 351, fks: 34 });
  assert.deepEqual(checker.validateSchemaSummary(data, markdown), []);
  const summary = markdown.split('\n').find((line) => line.startsWith('**NoteCraft 規劃檢視**'));
  assert.ok(summary, 'Expected a NoteCraft inventory summary');
  for (const [count, unit] of [[40, '張候選表'], [351, '欄'], [34, '個候選單欄 FK']]) {
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

// Issue #1220: composite same-task / same-unit FKs.
const tableOf = (name) => {
  const table = annotationSource().tables.find((entry) => entry.name === name);
  assert.ok(table, `Expected ${name}`);
  return table;
};
const columnOf = (table, name) => {
  const column = tableOf(table).columns.find((entry) => entry.name === name);
  assert.ok(column, `Expected ${table}.${name}`);
  return column;
};
const unitTables = [
  'annotation_record', 'annotation_review_draft', 'annotation_review_submission',
  'annotation_arbitration_vote', 'annotation_exception_resolution', 'annotation_history_event',
];

test('six unit tables carry a non-PK NOT NULL uuid task_id with no single-column FK', () => {
  for (const name of unitTables) {
    assert.deepEqual(columnOf(name, 'task_id'),
      { name: 'task_id', type: 'uuid', nullable: false, pk: false }, `${name}.task_id`);
  }
});

test('reviewer revision carries run_id and assignment_id as NOT NULL uuid composite-FK participants', () => {
  for (const name of ['run_id', 'assignment_id']) {
    assert.deepEqual(columnOf('annotation_review_submission_revision', name),
      { name, type: 'uuid', nullable: false, pk: false }, `revision.${name}`);
  }
});

test('only two single-column FKs remain and composite participants carry no arrow or Mermaid marker', () => {
  const fks = annotationSource().tables.flatMap((table) => table.columns
    .filter((column) => column.fk).map((column) => `${table.name}.${column.name}->${column.fk}`));
  assert.deepEqual(fks.sort(), [
    'annotation_history_event.account_session_id->account_session',
    'annotation_review_decision.review_submission_id->annotation_review_submission',
  ]);
  const markdown = annotationMarkdown();
  const dropped = [
    ['annotation_record', 'author_membership_id'], ['annotation_review_draft', 'reviewer_membership_id'],
    ['annotation_review_submission', 'reviewer_membership_id'], ['annotation_arbitration_vote', 'arbiter_membership_id'],
    ['annotation_arbitration_vote', 'review_revision_id'], ['annotation_exception_resolution', 'resolved_by_membership_id'],
    ['annotation_exception_resolution', 'arbitration_vote_id'], ['annotation_history_event', 'actor_membership_id'],
    ['annotation_history_event', 'annotation_record_id'], ['annotation_history_event', 'review_revision_id'],
    ['annotation_history_event', 'arbitration_vote_id'], ['annotation_history_event', 'exception_resolution_id'],
    ['annotation_review_submission_revision', 'review_submission_id'],
  ];
  for (const [table, column] of dropped) {
    assert.equal(columnOf(table, column).fk, undefined, `${table}.${column} must lose its single-column FK`);
    const block = markdown.match(new RegExp(`    ${table} \\{\\n([\\s\\S]*?)\\n    \\}`))?.[1] ?? '';
    assert.doesNotMatch(block, new RegExp(`\\b${column} FK\\b`), `${table}.${column} must lose its Mermaid FK marker`);
    const edge = markdown.split('\n').find((line) => line.trim().endsWith(`--o{ ${table} : ${column}`));
    assert.equal(edge, undefined, `${table}.${column} must lose its Mermaid edge`);
  }
  const arrowRows = markdown.split('\n').filter((line) => /^\| `(?:author_membership_id|actor_membership_id|arbiter_membership_id|resolved_by_membership_id|reviewer_membership_id|review_revision_id|arbitration_vote_id|annotation_record_id|exception_resolution_id|review_submission_id)` \|/.test(line));
  assert.equal(arrowRows.length, 14, 'Expected exactly the 14 dictionary rows of the composite participants');
  const remaining = arrowRows.filter((line) => line.includes('→'));
  assert.equal(remaining.length, 1, `Only decision.review_submission_id keeps an arrow, got: ${remaining.join('\n')}`);
  assert.match(remaining[0], /annotation_review_submission(?!_revision)/);
});

test('X-01 declares the three-column task/run/assignment composite FK on the six unit tables', () => {
  const row = annotationRow('X-01');
  assert.match(row, /\(task_id,\s*run_id,\s*assignment_id\)/);
  assert.match(row, /task_annotation_assignment\(task_id,\s*task_run_id,\s*id\)/);
  assert.match(row, /UNIQUE\s*`?\(task_id,\s*task_run_id,\s*id\)`?/, 'X-01 must declare the parent UNIQUE');
  assert.match(row, /RESTRICT/);
  assert.doesNotMatch(row, /task_annotation_assignment\(task_run_id,\s*id\)/, 'old two-column target must be gone');
});

test('X-04 sits between X-03 and R-01 and declares six same-task membership composite FKs', () => {
  const ids = annotationMarkdown().split('\n').map((line) => line.match(/^\| ([A-Z]-\d\d) \|/)?.[1]).filter(Boolean);
  const x04 = ids.indexOf('X-04');
  assert.ok(x04 > 0, 'Expected X-04');
  assert.equal(ids[x04 - 1], 'X-03');
  assert.equal(ids[x04 + 1], 'R-01');
  const row = annotationRow('X-04');
  assert.match(row, /task_membership\(task_id,\s*id\)/);
  assert.match(row, /UNIQUE\s*`?\(task_id,\s*id\)`?/);
  assert.match(row, /RESTRICT/);
  for (const column of ['author_membership_id', 'reviewer_membership_id', 'arbiter_membership_id',
    'resolved_by_membership_id', 'actor_membership_id']) {
    assert.match(row, new RegExp(`\\(task_id,\\s*${column}\\)`), `X-04 must cover (task_id,${column})`);
  }
});

test('A-01 stays the last section 4 row after X-04 is added', () => {
  const lines = annotationMarkdown().split('\n');
  const index = lines.findIndex((line) => line.startsWith('| A-01 |'));
  assert.ok(index > 0);
  assert.ok(!(lines[index + 1] ?? '').startsWith('|'));
});

test('S-01 declares the (run_id,assignment_id,id) parent key and S-02 adds the candidate roster FK', () => {
  assert.match(annotationRow('S-01'), /UNIQUE\s*`?\(run_id,\s*assignment_id,\s*id\)`?/);
  const s02 = annotationRow('S-02');
  assert.match(s02, /\(run_id,\s*reviewer_membership_id\)/);
  assert.match(s02, /task_run_reviewer_candidate\(task_run_id,\s*reviewer_membership_id\)/);
});

test('V-03 exempts arbiters from the candidate roster FK', () => {
  const row = annotationRow('V-03');
  assert.match(row, /(?:豁免|不適用|exempt|不加|不設)[^|]*(?:候選|candidate)|(?:候選|candidate)[^|]*(?:豁免|不適用|exempt|不加|不設)/i);
  assert.match(row, /project[_ ]leader/);
  assert.match(row, /FR-023/);
});

test('V-04 and N-01 chain the vote to the revision to the head on the same unit', () => {
  const v04 = annotationRow('V-04');
  assert.match(v04, /\(run_id,\s*assignment_id,\s*review_revision_id\)/);
  assert.match(v04, /annotation_review_submission_revision\(run_id,\s*assignment_id,\s*id\)/);
  assert.match(annotationRow('N-01'), /\(run_id,\s*assignment_id,\s*review_submission_id\)/);
  assert.match(annotationRow('N-01'), /annotation_review_submission\(run_id,\s*assignment_id,\s*id\)/);
  assert.match(annotationRow('N-01'), /UNIQUE\s*`?\(run_id,\s*assignment_id,\s*id\)`?/, 'N-01 must declare the vote/history parent key');
});

test('V-01, R-01 and E-01 declare the same-unit parent keys; E-02 binds the vote key tuple', () => {
  const sameUnit = /UNIQUE\s*`?\(run_id,\s*assignment_id,\s*id\)`?/;
  assert.match(annotationRow('V-01'), sameUnit);
  assert.match(annotationRow('V-01'), /UNIQUE\s*`?\(run_id,\s*assignment_id,\s*output_key,\s*item_key,\s*id\)`?/);
  assert.match(annotationRow('R-01'), sameUnit);
  assert.match(annotationRow('E-01'), sameUnit);
  const e02 = annotationRow('E-02');
  assert.match(e02, /\(run_id,\s*assignment_id,\s*output_key,\s*item_key,\s*arbitration_vote_id\)/);
  assert.match(e02, /annotation_arbitration_vote\(run_id,\s*assignment_id,\s*output_key,\s*item_key,\s*id\)/);
  assert.doesNotMatch(e02, /若不加 vote 複合候選鍵／FK/, 'E-02 must no longer be conditional');
});

test('H-05 declares four same-unit composite FKs and an exactly-one-source CHECK', () => {
  const row = annotationRow('H-05');
  for (const [column, parent] of [['annotation_record_id', 'annotation_record'],
    ['review_revision_id', 'annotation_review_submission_revision'],
    ['arbitration_vote_id', 'annotation_arbitration_vote'],
    ['exception_resolution_id', 'annotation_exception_resolution']]) {
    assert.match(row, new RegExp(`\\(run_id,\\s*assignment_id,\\s*${column}\\)`), `H-05 composite for ${column}`);
    assert.match(row, new RegExp(`${parent}\\(run_id,\\s*assignment_id,\\s*id\\)`), `H-05 target ${parent}`);
  }
  assert.match(row, /MATCH SIMPLE/);
  assert.match(row, /CHECK/);
  assert.match(row, /恰有一個|exactly one/i);
  assert.doesNotMatch(row, /num_nonnulls/, 'SQLite has no num_nonnulls; the CHECK must be portable (AR §6, ADR-024)');
  for (const column of ['annotation_record_id', 'review_revision_id', 'arbitration_vote_id', 'exception_resolution_id']) {
    assert.match(row, new RegExp(`\\(${column} IS NOT NULL\\)`), `H-05 CHECK must test ${column} IS NOT NULL`);
  }
  assert.doesNotMatch(row, /回填／可空相容策略待 migration 裁決/);
});

test('annotation dictionary footer states 91 columns, 2 single-column FKs and 20 composite FKs', () => {
  const footer = annotationMarkdown().split('\n').find((line) => line.startsWith('**交付狀態'));
  assert.ok(footer, 'Expected the delivery-status footer');
  assert.match(footer, /8 張未部署候選表、91 欄；單欄 FK 2 個，另有 20 組複合 FK/);
});

test('D-02 explains why the draft reviewer has only the X-04 same-task FK and no roster FK', () => {
  const row = annotationRow('D-02');
  assert.match(row, /草稿[^|]*不綁名冊|roster/, 'D-02 must state the draft is not bound to the roster');
  assert.match(row, /S-02/, 'D-02 must point to S-02 where the roster binding is enforced at submission');
});

test('section 5 index contract covers the X-01 reverse lookup and the composite E-02 vote lookup', () => {
  const markdown = annotationMarkdown();
  assert.match(markdown, /X-01[^\n]*\(task_id,\s*run_id,\s*assignment_id\)[^\n]*起首|\(task_id,\s*run_id,\s*assignment_id\)\s*起首/,
    'section 5 must require an index led by (task_id,run_id,assignment_id)');
  assert.doesNotMatch(markdown, /單欄 vote FK/, 'the single-column vote FK wording is obsolete');
});

// Issue #1224: audit retention follows ADR-038.
test('section 7 audit-and-retention item and A-01 follow ADR-038', () => {
  const markdown = annotationMarkdown();
  const item = markdown.split('\n').find((line) => line.startsWith('4. **稽核與保留**'));
  assert.ok(item, 'Missing section 7 item 4');
  for (const token of ['ADR-038', 'A-01', '待定', '#1224']) {
    assert.ok(item.includes(token), `Section 7 item 4 must mention ${token}`);
  }
  assert.doesNotMatch(item, /需先有政策|須在 migration 前裁決/);
  const a01 = markdown.split('\n').find((line) => line.startsWith('| A-01 |'));
  assert.ok(a01, 'Missing A-01 row');
  assert.ok(a01.includes('ADR-038'), 'A-01 must mention ADR-038');
});

// Issue #1223 G3: review/dataset medium-low design fixes.
const annotationRules = () => annotationMarkdown().split('\n').filter((line) => /^\| [A-Z]-\d+ \|/.test(line));
const erTable = (name) => {
  const table = erData().tables.find((candidate) => candidate.name === name);
  assert.ok(table, `Expected ${name} in database-schema.er.json`);
  return table;
};
const compositeSentence = /複合[^。\n]*(?:不畫|未畫|不繪|未繪|不會畫|不會繪)[^。\n]*§4/;

test('one rule names the revision decision_payload as the sole authoritative record of a submitted decision', () => {
  const rows = annotationRules().filter((row) => /annotation_review_submission_revision/.test(row)
    && /annotation_review_draft/.test(row) && /decision_payload/.test(row));
  assert.equal(rows.length, 1, 'Exactly one rule must state the draft/revision single source of truth');
  const [row] = rows;
  assert.match(row, /(?:未提交|unsubmitted)[^|]*annotation_review_draft|annotation_review_draft[^|]*(?:未提交|unsubmitted)/,
    'The draft must be stated to hold only unsubmitted state');
  assert.match(row, /(?:提交|送出|submit)[^|]*(?:清除|失效|invalidat|clear)|(?:清除|失效|invalidat|clear)[^|]*(?:提交|送出|submit)/i,
    'The draft must be cleared or invalidated on submit');
  assert.match(row, /(?:唯一|sole)[^|]*(?:權威|authoritative|source of truth)/i,
    'The revision decision_payload must be the sole authoritative record');
  assert.match(row, /annotation_review_decision[^|]*(?:投影|派生|derived|projection)|(?:投影|派生|derived|projection)[^|]*annotation_review_decision/i,
    'annotation_review_decision (decision/corrected_answer/reason) must be a projection of the payload, not a second copy');
  assert.match(row, /(?:不得|不可|禁止)[^|]*(?:第二份|獨立副本|second copy)|(?:第二份|獨立副本|second copy)[^|]*(?:不得|不可|禁止)/i,
    'The rule must forbid a second authoritative copy');
});

test('the dictionary tables point at the single-source-of-truth rule', () => {
  const markdown = annotationMarkdown();
  const section = (heading) => markdown.split(/^### /m).find((part) => part.startsWith(heading));
  const ruleId = annotationRules().find((row) => /(?:唯一|sole)[^|]*(?:權威|authoritative)/i.test(row)
    && /annotation_review_draft/.test(row))?.match(/^\| ([A-Z]-\d+) \|/)?.[1];
  assert.ok(ruleId, 'Expected the single-source-of-truth rule id');
  for (const heading of ['3.2 annotation_review_draft', '3.4 annotation_review_decision',
    '3.8 annotation_review_submission_revision']) {
    const part = section(heading);
    assert.ok(part, `Expected section ${heading}`);
    assert.match(part, new RegExp(`\\b${ruleId}\\b`), `${heading} must cite ${ruleId}`);
  }
});

test('NoteCraft notes for draft and revision state the single source of truth', () => {
  const revision = erTable('annotation_review_submission_revision').description;
  assert.match(revision, /decision_payload[^。\n]*(?:唯一|sole)[^。\n]*(?:權威|authoritative)|(?:唯一|sole)[^。\n]*(?:權威|authoritative)[^。\n]*decision_payload/i,
    'Revision note must call decision_payload the sole authoritative record');
  assert.match(revision, /annotation_review_decision[^。\n]*(?:投影|派生|derived|projection)/i,
    'Revision note must say the decision rows are a projection');
  const draft = erTable('annotation_review_draft').description;
  assert.match(draft, /未提交[^。\n]*(?:清除|失效)|(?:清除|失效)[^。\n]*未提交/,
    'Draft note must say it holds only unsubmitted state and is cleared or invalidated on submit');
  assert.match(draft, /annotation_review_submission_revision/,
    'Draft note must point to the revision as the submitted record');
});

test('annotation/review dictionary names JSONB at most once and keeps logical json column types', () => {
  const lines = annotationMarkdown().split('\n').filter((line) => /jsonb/i.test(line));
  assert.ok(lines.length <= 1, `Expected at most one jsonb line, got ${lines.length}`);
  assert.equal(lines.length, 1, 'One sentence must state that json maps to PostgreSQL JSONB');
  assert.match(lines[0], /`json`[^。\n]*(?:對應|映射|maps? to)[^。\n]*JSONB/i);
  assert.equal(annotationMarkdown().split('\n').some((line) => /^\s+jsonb /.test(line) || /^\| `[^`]+` \| jsonb /i.test(line)),
    false, 'Column types must stay logical json');
});

test('NoteCraft column order for annotation_history_event equals the dictionary order', () => {
  const dictionary = annotationSource().tables.find((table) => table.name === 'annotation_history_event');
  assert.ok(dictionary, 'Expected annotation_history_event in the dictionary');
  assert.deepEqual(
    erTable('annotation_history_event').columns.map((column) => column.name),
    dictionary.columns.map((column) => column.name),
  );
});

test('every annotation/review note states that composite keys are not drawn and points to section 4', () => {
  for (const name of annotationNames) {
    assert.match(erTable(name).description, compositeSentence,
      `${name} note needs the "複合鍵與複合 FK 未畫在圖上，見各實體字典 §4" sentence`);
  }
});
