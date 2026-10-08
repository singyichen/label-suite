import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const task = read('../../specs/task-management/014-task-detail/spec.md');
const annotation = read('../../specs/annotation/015-annotation-workspace/spec.md');
const account = read('../../specs/account/020-auth-session-security/spec.md');
const adr = read('../../docs/adr/021-jwt-refresh-token-auth.md');

function line(source, id) {
  const result = source.split('\n').find((candidate) =>
    new RegExp(`^(?:- |\\d+\\. )\\*\\*${id}\\*\\*`).test(candidate));
  assert.ok(result, `Missing current ${id} contract`);
  return result;
}

function entity(source, name) {
  const section = source.match(/^### 關鍵實體[^\n]*\n([\s\S]*?)(?=^### |^## )/m)?.[1];
  assert.ok(section, 'Missing key-entities section');
  const result = section.split('\n').find((candidate) => candidate.startsWith(`- **${name}**`));
  assert.ok(result, `Missing current ${name} entity`);
  return result;
}

test('FR-007b keeps completion units separate and gives each kind its own speed', () => {
  const rule = line(task, 'FR-007b');
  for (const unit of ['標記筆數', '審核筆數', '仲裁筆數']) assert.match(rule, new RegExp(unit));
  assert.match(rule, /各類工作速度|逐類速度|分(?:類|別)速度/);
  assert.match(rule, /標記件\/時|標記[^。]*?件\/時/);
  assert.match(rule, /審核單位\/時|審核[^。]*?單位\/時/);
  assert.match(rule, /仲裁項\/時|仲裁[^。]*?項\/時/);
  assert.doesNotMatch(rule, /加權平均速度|三類筆數總和|每筆平均耗時/);
  assert.match(line(task, 'FR-010u'), /(?:工時|速度)[^。]*?(?:不得相加|不同單位|逐類)/);
});

test('Tab E and SC-036 display per-kind rates and unknown logout without stale totals', () => {
  const tab = task.match(/^- Tab E：[^\n]*\n([\s\S]*?)(?=^- Tab [A-Z]：|^### |^## )/m)?.[1];
  assert.ok(tab, 'Missing current WorkLog tab definition');
  const success = line(task, 'SC-036');
  for (const text of [tab, success]) {
    assert.match(text, /各類工作速度|逐類速度|分(?:類|別)速度/);
    assert.doesNotMatch(text, /加權平均速度|三類筆數總和|每筆平均耗時/);
  }
  assert.match(tab, /`logged_out_at`|明確登出/);
  assert.match(tab, /(?:未知|—)/);
});

test('FR-007d defines observable work intervals, UTC source and Taipei daily projection', () => {
  const rule = line(task, 'FR-007d');
  assert.match(rule, /`task_work_interval`/);
  for (const field of ['account_session_id', 'task_id', 'run_id', 'membership_id', 'work_kind']) {
    assert.match(rule, new RegExp('`' + field + '`'), `${field} must delimit the work-log source`);
  }
  assert.match(rule, /30\s*秒/);
  assert.match(rule, /10\s*分鐘/);
  assert.match(rule, /90\s*秒/);
  assert.match(rule, /`last_seen_at`[^。]*?(?:關閉|結束)|(?:關閉|結束)[^。]*?`last_seen_at`/);
  assert.match(rule, /UTC/);
  assert.match(rule, /Asia\/Taipei/);
  assert.match(rule, /跨日[^。]*?(?:切|裁)|(?:切|裁)[^。]*?跨日/);
  assert.match(rule, /(?:失焦|背景|閒置)/);
});

test('WorkLogEntry remains a session-and-run query projection with honest unknown values', () => {
  const row = entity(task, 'WorkLogEntry');
  assert.match(row, /(?:查詢投影|唯讀投影|不(?:是|建)[^。]*資料表)/);
  for (const field of ['account_session_id', 'task_id', 'run_id', 'membership_id', 'work_kind']) {
    assert.match(row, new RegExp('`' + field + '`'), `${field} must remain in the report key`);
  }
  assert.match(row, /Asia\/Taipei|report_date/);
  assert.match(row, /`logged_out_at`/);
  assert.match(row, /(?:未知|—)/);
  assert.doesNotMatch(row, /`revoked_at`[^。]*?登出時間|`lead_time_ms`[^。]*?工時/);
});

test('AC-1.28 through AC-1.31 cover separate sessions, midnight, loss and event counts', () => {
  const cases = ['AC-1.28', 'AC-1.29', 'AC-1.30', 'AC-1.31'].map((id) => line(task, id));
  for (const result of cases) {
    assert.match(result, /\*\*Given\*\*[^\n]*\*\*When\*\*[^\n]*\*\*Then\*\*/);
    assert.match(result, /FR-007d|FR-007b|FR-010u/);
  }
  const combined = cases.join('\n');
  assert.match(combined, /(?:同日|一天)[^\n]*?(?:兩次|多次)[^\n]*?登入|(?:兩次|多次)[^\n]*?登入[^\n]*?同日/);
  assert.match(combined, /跨日|午夜/);
  assert.match(combined, /失聯|失焦|心跳/);
  assert.match(combined, /(?:多個|多筆)[^\n]*?outKey|outKey[^\n]*?(?:重複|多筆)/);
  assert.match(combined, /(?:未知|—)/);
});

test('SC-057 and SC-058 guard dual-database open intervals and count isolation', () => {
  const rules = [line(task, 'SC-057'), line(task, 'SC-058')].join('\n');
  assert.match(rules, /SQLite/);
  assert.match(rules, /PostgreSQL/);
  assert.match(rules, /(?:雙裝置|兩裝置|同時開工)/);
  assert.match(rules, /(?:唯一|至多一筆)[^\n]*?(?:未結束|開啟|open)|(?:未結束|開啟|open)[^\n]*?(?:唯一|至多一筆)/);
  assert.match(rules, /run_id|run/);
  assert.match(rules, /(?:審核單位|submission)[^\n]*?(?:去重|只算一次|不重複)/);
  assert.match(rules, /(?:私有答案|隱藏答案|gold\/test|dataset_item_private)/);
});

test('015 FR-088 attributes new authenticated history to verified sid without making lead time work time', () => {
  const rule = line(annotation, 'FR-088');
  assert.match(rule, /`annotation_history_event\.account_session_id`/);
  assert.match(rule, /(?:真實 FK|真 FK|外鍵)[^。]*?`account_session\.id`|`account_session\.id`[^。]*?(?:真實 FK|真 FK|外鍵)/);
  assert.match(rule, /(?:已驗證|驗證後)[^。]*?`sid`|`sid`[^。]*?(?:已驗證|驗證後)/);
  assert.match(rule, /(?:舊|系統)[^。]*?(?:可空|null)|(?:可空|null)[^。]*?(?:舊|系統)/);
  assert.match(rule, /(?:新|認證)[^。]*?(?:必填|非空)/);
  assert.match(rule, /`lead_time`|`lead_time_ms`/);
  assert.match(rule, /(?:不得|不可)[^。]*?(?:工時|工作時長)|(?:工時|工作時長)[^。]*?(?:不等於|兩套)/);
  assert.match(rule, /(?:標記員|annotator)[^。]*?(?:不得|不可)[^。]*?(?:其他|私有|session|答案)/);
});

test('account-020 and ADR-021 retain history without reviving revoked credentials', () => {
  const rules = [line(account, 'FR-001'), line(account, 'FR-008')].join('\n');
  assert.match(rules, /(?:歷程|工時|稽核)[^\n]*?(?:保留|RESTRICT)|(?:保留|RESTRICT)[^\n]*?(?:歷程|工時|稽核)/);
  assert.match(rules, /(?:刪除|CASCADE)[^\n]*?(?:限制|不得|RESTRICT)|RESTRICT[^\n]*?(?:刪除|CASCADE)/);
  assert.match(rules, /`logged_out_at`/);
  assert.match(rules, /`revoked_at`/);
  assert.match(adr, /(?:historical|history|audit|work interval)[^\n]*?(?:retain|retention|RESTRICT)/i);
  assert.match(adr, /(?:retention|retained)[^\n]*?(?:not|never)[^\n]*?(?:valid|authorization|reviv)|(?:not|never)[^\n]*?(?:valid|authorization|reviv)[^\n]*?(?:retention|retained)/i);
});

test('WorkLog OpenSpec delta carries canonical task, annotation and account anchors', () => {
  const active = new URL('../../openspec/changes/worklog-observable-interval-contract/', import.meta.url);
  const archiveRoot = new URL('../../openspec/changes/archive/', import.meta.url);
  const archivedName = existsSync(active) ? undefined : readdirSync(archiveRoot)
    .find((name) => name.endsWith('-worklog-observable-interval-contract'));
  assert.ok(existsSync(active) || archivedName, 'Active or archived WorkLog change is required');
  const change = archivedName ? new URL(`${archivedName}/`, archiveRoot) : active;
  for (const [path, ids] of [
    ['task-management/014-task-detail', ['FR-007b', 'FR-007d', 'FR-010u', 'AC-1.28', 'SC-057']],
    ['annotation/015-annotation-workspace', ['FR-088']],
    ['account/020-auth-session-security', ['FR-001', 'FR-008']],
  ]) {
    const delta = readFileSync(new URL(`specs/${path}/spec.md`, change), 'utf8');
    for (const id of ids) assert.match(delta, new RegExp(`^### Requirement: ${id}\\b`, 'm'));
  }
});
