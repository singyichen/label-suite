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
const taskDetailSpec = () => read('../../specs/task-management/014-task-detail/spec.md');
const taskNewSpec = () => read('../../specs/task-management/013-task-new/spec.md');
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
  const sourceNames = new Set(source.tables.map((table) => table.name));
  const data = erData();
  data.tables = data.tables.filter((table) => sourceNames.has(table.name));
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

test('committed tasks require both same-task initial versions through deferred composite FKs', () => {
  const task = taskSource().tables.find((table) => table.name === 'task');
  for (const name of ['current_config_version_id', 'current_guideline_version_id']) {
    assert.equal(task.columns.find((column) => column.name === name)?.nullable, false,
      `task.${name} must be NOT NULL at commit`);
  }

  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const taskRule = markdown.split('\n').find((line) => /^\| T-03 \|/.test(line));
  assert.ok(taskRule, 'T-03 must define the initial-version integrity rule');
  assert.ok(/\(task\.id,\s*current_config_version_id\).*task_config_version\(task_id,\s*id\)/.test(taskRule));
  assert.ok(/\(task\.id,\s*current_guideline_version_id\).*task_guideline_version\(task_id,\s*id\)/.test(taskRule));
  assert.ok(/DEFERRABLE INITIALLY DEFERRED/i.test(taskRule),
    'Both circular same-task FKs must be checked at transaction commit');
  assert.ok(/FR-006a[^\n]*預配置[^\n]*UUID/.test(taskNewSpec()),
    'Task creation must preallocate the task and both version IDs in one transaction');
});

test('publication defines reproducible private manifest bytes and SHA-256 receipt', () => {
  const spec = taskDetailSpec();
  for (const token of ['label-suite-run-items-v1', 'UTF-8', 'SHA-256',
    'selection_manifest_ref', 'selected_item_digest', 'task_run_item.list_position']) {
    assert.ok(spec.includes(token), `Publication contract must define ${token}`);
  }
  assert.ok(/label-suite-run-items-v1\\n/.test(spec),
    'The manifest needs its exact versioned first-line bytes');
  assert.ok(/小寫[^\n]*UUID|UUID[^\n]*小寫/.test(spec),
    'The manifest must encode lowercase hyphenated UUIDs');
  assert.ok(/UUID[^\n]*\\n[^\n]*(?:空白|欄位)/.test(spec),
    'Each UUID must end in a newline with no extra whitespace or fields');
  assert.ok(/SHA-256[^\n]*十六進位/.test(spec),
    'The full manifest bytes must have a hexadecimal SHA-256 digest');
  assert.ok(/content.addressed|內容定址/i.test(spec),
    'The receipt reference must address immutable object content');
  assert.ok(/私有[^\n]*不可覆寫|不可覆寫[^\n]*私有/.test(spec),
    'The manifest object must be private and write-once');
  assert.ok(/(?:manifest|清單)[^\n]*(?:hidden answer|答案)[^\n]*(?:declared_split|split)[^\n]*source_ref/i.test(spec),
    'The manifest must exclude answers, split and restricted source references');
});

test('publication retries reuse the committed run and protect receipts during failures', () => {
  const spec = taskDetailSpec();
  assert.ok(/同[^\n]*key[^\n]*(?:摘要|digest)[^\n]*(?:原 run|原有 run)/i.test(spec),
    'The same normalized command and key must return the committed run');
  assert.ok(/(?:重試|重送)[^\n]*不重新抽樣/.test(spec),
    'A publication retry must never sample again');
  assert.ok(/(?:不同|異)[^\n]*(?:摘要|內容)[^\n]*(?:拒絕|衝突)/.test(spec),
    'The same key with a different command must be rejected');
  assert.ok(/(?:讀回|read.back)[^\n]*(?:位元組|bytes)[^\n]*(?:摘要|digest)/i.test(spec),
    'The write-once object must be read back and verified before DB commit');
  assert.ok(/(?:回執|物件)[^\n]*失敗[^\n]*(?:DB|資料庫)[^\n]*(?:不提交|回滾)/.test(spec),
    'Object failure must prevent a visible DB publication');
  assert.ok(/(?:提交結果不明|提交結果未知)[^\n]*(?:冪等鍵|idempotency key)/i.test(spec),
    'Ambiguous commits must be resolved from the committed idempotency key');
  assert.ok(/(?:回執|物件)[^\n]*(?:缺失|摘要不符)[^\n]*(?:拒絕讀取|告警)/.test(spec),
    'A committed run with a missing or mismatched receipt must not be read silently');
  assert.ok(/(?:清理|刪除)[^\n]*(?:租約|lease)[^\n]*(?:無引用|未引用)/i.test(spec),
    'Cleanup must wait for lease expiry and confirm the object is unreferenced');
});

test('assignment display status is derived in exclusion, submission, empty, saved, assigned order', () => {
  const assignment = taskSource().tables.find((table) => table.name === 'task_annotation_assignment');
  assert.equal(assignment.columns.some((column) => column.name === 'status'), false,
    'The assignment must not persist a second status');
  const spec = taskDetailSpec();
  const projection = spec.match(/(?:顯示狀態|狀態投影)[^\n]*(?:已排除|排除)[^\n]*(?:已完成|提交)[^\n]*(?:未指派|空值)[^\n]*(?:草稿中|已儲存)[^\n]*(?:已指派待處理|待處理)/);
  assert.ok(projection,
    'The canonical projection must prioritize exclusion, submitted record, empty assignee, saved draft and assigned slot');
  assert.ok(/(?:saved|已儲存)[^\n]*(?:submitted|已提交)[^\n]*(?:abandoned|已捨棄)/i.test(spec),
    'Annotation record keeps its own lifecycle states');
});

test('NoteCraft and inventory project 38 tables with 327 columns and no assignment status', () => {
  const data = erData();
  const assignment = data.tables.find((table) => table.name === 'task_annotation_assignment');
  assert.equal(assignment.columns.some((column) => column.name === 'status'), false);
  assert.equal(data.tables.length, 38);
  assert.equal(data.tables.reduce((sum, table) => sum + table.columns.length, 0), 327);
  assert.match(data.meta.description, /38 張候選表、327 欄、44 個候選單欄 FK/);
  assert.match(inventory(), /38 張候選表、327 欄與 44 個候選單欄 FK/);
  assert.match(inventory(), /任務／執行資料結構[^\n]*13 張／111 欄／15 單欄 FK/);
});

test('assignment A-01 declares the parent candidate key for six annotation/review FKs', () => {
  const taskMarkdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const constraints = taskMarkdown.split('## 4. 限制清單')[1]?.split('## 5.')[0];
  assert.ok(constraints, 'Task/run §4 constraints are required');
  const assignmentRule = constraints.split('\n').find((line) => /^\| A-01 \|/.test(line));
  assert.ok(assignmentRule, 'Task/run §4 A-01 is required');
  assert.match(assignmentRule, /UNIQUE\s*`\(task_run_id,\s*id\)`/,
    'A-01 must declare the same-order parent candidate key');
  assert.match(assignmentRule, /六張.*`\(run_id,\s*assignment_id\)`.*複合 FK/,
    'A-01 must explain why the six annotation/review child FKs need that key');
});

test('NoteCraft assignment Wiki discloses the undeployed parent candidate key', () => {
  const assignment = erData().tables.find((table) => table.name === 'task_annotation_assignment');
  assert.ok(assignment, 'NoteCraft assignment projection is required');
  assert.match(assignment.description, /候選.*尚未部署/s,
    'NoteCraft must identify this as an undeployed candidate');
  assert.match(assignment.description, /UNIQUE\s*`\(task_run_id,\s*id\)`/,
    'NoteCraft must disclose the assignment parent candidate key');
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
