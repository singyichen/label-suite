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
const taskAuditRequirement = () => taskDetailSpec().split('- **FR-025**')[1]
  ?.split('\n### 使用者流程')[0];
const accountSource = () => checker.parseAccountAdminSchema(
  read('../../docs/diagrams/architecture/account-admin-db-schema.md'));
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
    'task_trial_iaa_result', 'task_sample_snapshot', 'task_run', 'task_run_reviewer_candidate',
    'task_run_item', 'task_annotation_assignment', 'task_annotation_exclusion',
  ]);
  assert.ok(source.tables.every((table) => table.columns.some((column) => column.pk)),
    'Every candidate table needs a candidate PK');
  assert.equal(source.tables.some((table) => table.name === 'review_assignment'), false);
  assert.ok(source.tables.every((table) => table.columns.every((column) =>
    !['hidden_answer', 'declared_split'].includes(column.name))));
});

test('trial IAA result has one complete six-column candidate per trial round', () => {
  const result = taskSource().tables.find((table) => table.name === 'task_trial_iaa_result');
  assert.ok(result, 'Each completed trial round needs durable IAA result evidence');
  assert.deepEqual(result.columns.map((column) => column.name), [
    'trial_round_id', 'result_schema_version', 'algorithm_version',
    'input_digest', 'result_payload', 'computed_at',
  ]);
  assert.deepEqual(result.columns.filter((column) => column.pk).map((column) => column.name),
    ['trial_round_id']);
  assert.equal(result.columns.find((column) => column.name === 'trial_round_id')?.fk,
    'task_trial_round');
  assert.ok(result.columns.every((column) => !column.nullable),
    'A successful IAA result cannot leave provenance or a required result missing');
  assert.match(result.columns.find((column) => column.name === 'result_payload')?.type ?? '',
    /^jsonb?$/i, 'Per-output results must use a validated JSON payload');
});

test('trial IAA done requires a complete durable result in the same transaction', () => {
  const spec = taskDetailSpec();
  const requirement = spec.split('- **FR-010o-5**')[1]?.split('\n- **FR-')[0];
  assert.ok(requirement, 'FR-010o-5 must own durable per-round IAA evidence');
  for (const token of ['task_trial_iaa_result', 'IAA_GATE_EXCLUDED_TYPES', 'De = 0',
    'pending', 'failed', 'done']) {
    assert.ok(requirement.includes(token), `FR-010o-5 must cover ${token}`);
  }
  assert.match(requirement, /(?:同一|單一)[^\n]*(?:DB|資料庫)[^\n]*交易/,
    'Writing the complete result and changing the status to done must be atomic');
  assert.match(requirement, /(?:開始正式標記|正式發布)[^\n]*(?:新增試標回合|下一試標回合)/,
    'Both outgoing transition gates must verify the result, not just a done flag');
  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const rule = markdown.split('\n').find((line) => /^\| Q-06 \|/.test(line));
  assert.match(rule ?? '', /task_trial_iaa_result/,
    'The physical candidate must describe the done-to-result integrity rule');
});

test('task state and isolation history are projections of typed shared audit events', () => {
  const spec = taskDetailSpec();
  const requirement = spec.split('- **FR-025**')[1]?.split('\n- **FR-')[0];
  assert.ok(requirement, 'FR-025 must own the task audit event contract');
  for (const token of ['audit_events', 'task.status_changed', 'task.isolation_changed',
    'RunStateTransition', 'IsolationAuditLog']) {
    assert.ok(requirement.includes(token), `FR-025 must define ${token}`);
  }
  assert.match(requirement, /(?:同一|單一)[^\n]*(?:DB|資料庫)[^\n]*交易/,
    'A changed task and its one audit event must commit atomically');
  assert.match(requirement, /(?:無變更|值未變)[^\n]*(?:不|不得)[^\n]*(?:事件|稽核)/,
    'A no-op must not create an audit event');
  const taskTables = taskSource().tables.map((table) => table.name);
  assert.equal(taskTables.includes('task_status_transition'), false,
    'The audit timeline must not duplicate persisted state-transition rows');
  assert.equal(taskTables.includes('task_isolation_audit_log'), false,
    'The isolation timeline must not duplicate persisted audit rows');
});

test('task-scoped audit events use a nullable real task FK', () => {
  const audit = accountSource().tables.find((table) => table.name === 'audit_events');
  const taskId = audit?.columns.find((column) => column.name === 'task_id');
  assert.equal(taskId?.type, 'uuid');
  assert.equal(taskId?.nullable, true, 'System-wide audit events may have no task');
  assert.equal(taskId?.fk, 'task', 'A non-null task scope must reference a real task');
  const erTaskId = erData().tables.find((table) => table.name === 'audit_events')
    ?.columns.find((column) => column.name === 'task_id');
  assert.equal(erTaskId?.fk, 'task', 'NoteCraft must draw the same real task FK');
});

test('typed task audit target must identify the same task as the scoped FK', () => {
  const requirement = taskAuditRequirement();
  assert.ok(requirement, 'FR-025 is required');
  for (const token of ['task.status_changed', 'task.isolation_changed',
    'target_type', 'target_id', 'task_id']) {
    assert.ok(requirement.includes(token), `FR-025 must bind ${token}`);
  }
  assert.ok(/target_type[^\n]*['`]?task['`]?/.test(requirement),
    'Both typed task actions must target task objects');
  assert.ok(/target_id[^\n]*(?:正規化|標準化)[^\n]*(?:相等|一致)[^\n]*task_id|target_id[^\n]*task_id[^\n]*(?:正規化|標準化)[^\n]*(?:相等|一致)/.test(requirement),
    'A valid but different task target must be rejected after UUID normalization');

  const adr = read('../../docs/adr/032-user-action-audit-trail.md');
  assert.ok(/task\.status_changed[^\n]*task\.isolation_changed[^\n]*(?:target_type|target_id)|(?:target_type|target_id)[^\n]*task\.status_changed[^\n]*task\.isolation_changed/.test(adr),
    'ADR-032 must make the target/scope invariant action-specific');
  assert.ok(/target_id[^\n]*(?:normali[sz]ed|canonical)[^\n]*(?:equal|match)[^\n]*task_id|target_id[^\n]*task_id[^\n]*(?:normali[sz]ed|canonical)[^\n]*(?:equal|match)/i.test(adr),
    'ADR-032 must reject a cross-task target after UUID normalization');

  const account = read('../../docs/diagrams/architecture/account-admin-db-schema.md');
  const rule = account.split('\n').find((line) => /^\| A-08 \|/.test(line));
  assert.ok(rule, 'A-08 must cover typed task audit writes');
  assert.ok(/target_type[^\n]*target_id[^\n]*task_id/.test(rule),
    'The physical candidate must connect both target fields to task scope');
  assert.ok(/SQLite[^\n]*PG[^\n]*(?:錯配|不一致|不同)[^\n]*(?:拒絕|失敗)|(?:錯配|不一致|不同)[^\n]*(?:拒絕|失敗)[^\n]*SQLite[^\n]*PG/.test(rule),
    'The future SQLite and PostgreSQL runtime plan must reject mismatched task IDs');
});

test('isolation audit requires second confirmation only for disabling', () => {
  const requirement = taskAuditRequirement();
  assert.ok(requirement, 'FR-025 is required');
  assert.ok(/(?:關閉|停用)[^。\n]*(?:二次確認|第二次確認)/.test(requirement),
    'Disabling isolation must keep the verified second confirmation');
  assert.ok(/(?:重新啟用|啟用|重新開啟)[^。\n]*(?:固定|獨立)[^。\n]*原因碼/.test(requirement),
    'Re-enabling isolation needs its distinct fixed reason code');
  assert.ok(/(?:重新啟用|啟用|重新開啟)[^。\n]*(?:不需|無需|不要求)[^。\n]*(?:二次確認|第二次確認)/.test(requirement),
    'Re-enabling must not inherit the disable-only confirmation gate');

  const adr = read('../../docs/adr/032-user-action-audit-trail.md');
  assert.ok(/disabl[^\n]*(?:second.confirm|second confirm)/i.test(adr),
    'ADR-032 must bind second confirmation to disabling only');
  assert.ok(/(?:re.enabl|enabl)[^\n]*(?:distinct|separate)[^\n]*fixed reason/i.test(adr),
    'ADR-032 must give re-enabling a distinct fixed reason');
  assert.ok(/(?:re.enabl|enabl)[^\n]*(?:without|no|does not require)[^\n]*(?:second.confirm|second confirm)/i.test(adr),
    'ADR-032 must avoid a new confirmation prompt on re-enable');
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

test('publication idempotency is unique per Dry round and per Official task', () => {
  const markdown = read('../../docs/diagrams/architecture/task-run-db-schema.md');
  const rule = markdown.split('\n').find((line) => /^\| U-06 \|/.test(line));
  assert.ok(rule, 'U-06 must define publication idempotency uniqueness');
  assert.match(rule,
    /UNIQUE\s*`?\(task_id,\s*trial_round_id,\s*publication_idempotency_key\)`?[^|]*WHERE\s+run_type\s*=\s*['`]?dry_run['`]?/i,
    'Dry retries must address one task and one trial round');
  assert.match(rule,
    /UNIQUE\s*`?\(task_id,\s*publication_idempotency_key\)`?[^|]*WHERE\s+run_type\s*=\s*['`]?official_run['`]?/i,
    'Official retries must address the task-wide singleton publication');
  assert.doesNotMatch(rule,
    /UNIQUE\s*`?\(task_id,\s*publication_idempotency_key\)`?\s*[；;]/i,
    'A blanket task/key UNIQUE would reject a valid Dry key reused in another round');
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

test('NoteCraft and inventory project 40 tables with 342 columns and no assignment status', () => {
  const data = erData();
  const assignment = data.tables.find((table) => table.name === 'task_annotation_assignment');
  assert.equal(assignment.columns.some((column) => column.name === 'status'), false);
  assert.equal(data.tables.length, 40);
  assert.equal(data.tables.reduce((sum, table) => sum + table.columns.length, 0), 342);
  assert.equal(data.tables.reduce((sum, table) => sum + table.columns.filter((column) => column.fk).length, 0), 47);
  assert.match(data.meta.description, /40 張候選表、342 欄、47 個候選單欄 FK/);
  assert.match(inventory(), /40 張候選表、342 欄與 47 個候選單欄 FK/);
  assert.match(inventory(), /任務／執行資料結構[^\n]*14 張／117 欄／16 單欄 FK/);
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
