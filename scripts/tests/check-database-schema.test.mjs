import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  mergeSchemaSources, parseAccountAdminSchema, parseDatasetSchema, parseTaskRunSchema,
  validateErData,
} from '../check-database-schema.mjs';

const sourceMarkdown = `# account 與 admin 資料庫 schema

## 2. ERD

\`\`\`mermaid
erDiagram
    users {
        uuid id PK
        varchar hashed_password
    }
    account_notification_preference {
        uuid user_id PK,FK
        varchar event_key PK
    }
    admin_role_permission {
        varchar role_type PK
    }
    admin_role_permission_version {
        smallint id PK
    }
\`\`\`

## 3. 欄位字典

### 3.1 users：平台帳號

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`id\` | uuid | 否 | ID | 建立時 | — |
| \`hashed_password\` | varchar | **是** | Password hash; null means no local credential | 建立時 | — |

### 3.2 account_notification_preference：通知開關

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`user_id\` | uuid → users | 否 | 所屬帳號 | 建立時 | — |
| \`event_key\` | varchar | 否 | 事件 | 建立時 | — |

### 3.3 admin_role_permission：權限矩陣

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`role_type\` | varchar | 否 | 角色 | 建立時 | — |

### 3.4 admin_role_permission_version：矩陣版本

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`id\` | smallint | 否 | 版本列 | 建立時 | — |

## 4. 限制清單
`;

const validData = {
  tables: [
    {
      name: 'users', description: 'Draft; password nullability resolved', columns: [
        { name: 'id', type: 'uuid', required: 'system', pk: true },
        { name: 'hashed_password', type: 'varchar', required: 'nullable' },
      ],
    },
    {
      name: 'account_notification_preference', description: 'Draft', columns: [
        { name: 'user_id', type: 'uuid', required: 'required', pk: true, fk: 'users' },
        { name: 'event_key', type: 'varchar', required: 'required', pk: true },
      ],
    },
    {
      name: 'admin_role_permission', description: 'Candidate draft; not deployed', columns: [
        { name: 'role_type', type: 'varchar', required: 'required', pk: true },
      ],
    },
    {
      name: 'admin_role_permission_version', description: 'Candidate draft; not deployed', columns: [
        { name: 'id', type: 'smallint', required: 'system', pk: true },
      ],
    },
  ],
};

const cloneData = () => structuredClone(validData);
const errorsFor = (data) => validateErData(parseAccountAdminSchema(sourceMarkdown), data);
const accountData = (source, data) => {
  const names = new Set(source.tables.map((table) => table.name));
  return { ...data, tables: data.tables.filter((table) => names.has(table.name)) };
};
const validateWithTaskParents = (source, data) => {
  const dataset = parseDatasetSchema(readFileSync(
    new URL('../../docs/diagrams/architecture/dataset-db-schema.md', import.meta.url), 'utf8'));
  const task = parseTaskRunSchema(readFileSync(
    new URL('../../docs/diagrams/architecture/task-run-db-schema.md', import.meta.url), 'utf8'))
    .tables.find((table) => table.name === 'task');
  assert.ok(task, 'Task scope parent is required for the audit FK');
  const sourceTables = new Map([...source.tables, ...dataset.tables, task]
    .map((table) => [table.name, table]));
  const withParents = { tables: [...sourceTables.values()] };
  return validateErData(withParents, accountData(withParents, data));
};

test('parsesDictionaryAndMermaidKeys', () => {
  const source = parseAccountAdminSchema(sourceMarkdown);
  assert.deepEqual(source.tables.map((table) => table.name), [
    'users', 'account_notification_preference',
    'admin_role_permission', 'admin_role_permission_version',
  ]);
  assert.deepEqual(source.tables[1].columns.map((column) => [column.name, column.pk, column.fk]), [
    ['user_id', true, 'users'], ['event_key', true, undefined],
  ]);
  assert.equal(source.tables[0].columns[1].nullable, true);
});

test('acceptsMatchingProjection', () => {
  assert.deepEqual(errorsFor(validData), []);
});

test('rejectsTableAndColumnDrift', () => {
  const missingTable = cloneData();
  missingTable.tables.pop();
  assert.match(errorsFor(missingTable).join('\n'), /admin_role_permission_version/);

  const extraTable = cloneData();
  extraTable.tables.push({ name: 'invented_table', columns: [{ name: 'id', type: 'uuid', required: 'required' }] });
  assert.match(errorsFor(extraTable).join('\n'), /invented_table/);

  const missingColumn = cloneData();
  missingColumn.tables[0].columns.pop();
  assert.match(errorsFor(missingColumn).join('\n'), /users\.hashed_password/);

  const extraColumn = cloneData();
  extraColumn.tables[0].columns.push({ name: 'invented', type: 'uuid', required: 'required' });
  assert.match(errorsFor(extraColumn).join('\n'), /users\.invented/);
});

test('rejectsColumnAndKeyDrift', () => {
  for (const [property, value] of [
    ['type', 'bigint'], ['required', 'nullable'], ['pk', false], ['fk', 'wrong_parent'],
  ]) {
    const data = cloneData();
    data.tables[1].columns[0][property] = value;
    assert.match(errorsFor(data).join('\n'), /account_notification_preference\.user_id/, property);
  }
});

test('rejectsDuplicatesAndDanglingFk', () => {
  const duplicateTable = cloneData();
  duplicateTable.tables.push(structuredClone(duplicateTable.tables[0]));
  assert.match(errorsFor(duplicateTable).join('\n'), /duplicate table.*users/i);

  const duplicateColumn = cloneData();
  duplicateColumn.tables[0].columns.push(structuredClone(duplicateColumn.tables[0].columns[0]));
  assert.match(errorsFor(duplicateColumn).join('\n'), /duplicate column.*users\.id/i);

  const dangling = cloneData();
  dangling.tables[1].columns[0].fk = 'missing_parent';
  assert.match(errorsFor(dangling).join('\n'), /account_notification_preference\.user_id.*missing_parent/);
});

test('requiresResolvedPasswordNullabilityAndCandidateTableLabels', () => {
  const stalePassword = cloneData();
  stalePassword.tables[0].columns[1].required = 'pending';
  stalePassword.tables[0].columns[1].note = 'D-1 pending';
  assert.match(errorsFor(stalePassword).join('\n'), /users\.hashed_password/);

  const nonnullablePassword = cloneData();
  nonnullablePassword.tables[0].columns[1].required = 'required';
  assert.match(errorsFor(nonnullablePassword).join('\n'), /users\.hashed_password/);

  for (const name of ['admin_role_permission', 'admin_role_permission_version']) {
    const data = cloneData();
    data.tables.find((table) => table.name === name).description = 'Conditional on D-9';
    assert.match(errorsFor(data).join('\n'), new RegExp(`${name}.*(?:conditional|D-9)`, 'i'));
  }
});

test('admin007Enumerates42ApplicableBooleanCellsAndFixedGrants', () => {
  const spec = readFileSync(new URL('../../specs/admin/007-role-settings/spec.md', import.meta.url), 'utf8');
  const between = (start, end) => {
    const from = spec.indexOf(start);
    assert.notEqual(from, -1, `Missing admin-007 heading: ${start}`);
    const to = spec.indexOf(end, from + start.length);
    assert.notEqual(to, -1, `Missing admin-007 heading: ${end}`);
    return spec.slice(from + start.length, to);
  };
  const keys = [...between('### 權限鍵白名單（V1）', '### 角色 × 權限預設矩陣（V1）')
    .matchAll(/^\|[^\n]*\|\s*`([^`]+)`\s*\|/gm)].map((match) => match[1]);
  const matrixRows = (start, end) => [...between(start, end)
    .matchAll(/^\|\s*`([^`]+)`\s*\|([^\n]+)$/gm)]
    .map((match) => [match[1], match[2].split('|').slice(0, -1).map((cell) => cell.trim())]);
  const system = new Map(matrixRows('#### 系統角色（平台層級）', '#### 任務角色（任務層級）'));
  const task = new Map(matrixRows('#### 任務角色（任務層級）', '#### 授權判斷規則'));

  assert.equal(keys.length, 17, 'V1 has nine system keys and eight task keys');
  assert.deepEqual(new Set([...system.keys(), ...task.keys()]), new Set(keys));
  assert.deepEqual(task.get('task.detail.view'), ['✅', '✅', '❌']);
  assert.deepEqual(task.get('task.detail.edit'), ['✅', '❌', '❌']);
  assert.ok([...task.values()].flat().every((cell) => !cell.includes('⛔')));
  assert.deepEqual(system.get('dashboard.view'), ['✅', '✅']);
  for (const [key, cells] of system) {
    if (task.has(key)) assert.ok(cells.every((cell) => cell.includes('⛔')), `${key} has no system-role rows`);
    if (key.startsWith('admin.')) assert.deepEqual(cells, ['❌', '✅'], `${key} is fixed`);
  }
  assert.equal([...system.values()].flat().filter((cell) => !cell.includes('⛔')).length, 18);
  assert.equal([...task.values()].flat().length, 24);
  assert.equal([...system.values()].flat().filter((cell) => !cell.includes('⛔')).length
    + [...task.values()].flat().length, 42);
  assert.match(spec, /42\s*(?:列|格)/);
});

test('dictionaryAndNoteCraftResolveD9ThroughD13WithoutChangingPhysicalCounts', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  const data = JSON.parse(readFileSync(new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));
  const matrix = markdown.match(/### 3\.8 admin_role_permission[^\n]*\n([\s\S]*?)(?=\n### 3\.9)/)?.[1];
  const rules = markdown.match(/### 4\.7 admin_role_permission[^\n]*\n([\s\S]*?)(?=\n### 4\.8)/)?.[1];
  assert.ok(matrix, 'Missing matrix dictionary');
  assert.ok(rules, 'Missing matrix constraints');
  assert.match(matrix, /42\s*列/);
  assert.match(matrix, /`allowed`\s*\|\s*boolean/);
  assert.doesNotMatch(matrix, /boolean 表達不了|D-10.*(?:待|見 §5)/);
  assert.match(rules, /dashboard\.view/);
  assert.match(rules, /dashboard\.view[^\n]*(?:true|允許|開啟)/);
  assert.match(rules, /(?:缺列|查不到列|不存在的格).*(?:拒絕|不允許)/);
  assert.match(markdown, /\(task_id,\s*user_id,\s*task_role\)/);
  const resolved = markdown.slice(markdown.indexOf('**已裁決**'));
  for (const decision of ['D-9', 'D-10', 'D-11', 'D-12', 'D-13'])
    assert.match(resolved, new RegExp(decision), `${decision} resolution`);
  assert.doesNotMatch(markdown, /^\| D-(?:9|10|11|12|13) \|/gm, 'decisions no longer pending');

  const projectedAccount = accountData(source, data);
  for (const [label, tables] of [['dictionary', source.tables], ['NoteCraft', projectedAccount.tables]]) {
    assert.equal(tables.length, 10, `${label} table count`);
    assert.equal(tables.reduce((sum, table) => sum + table.columns.length, 0), 73, `${label} column count`);
    assert.equal(tables.reduce((sum, table) => sum + table.columns.filter((column) => column.fk).length, 0), 8, `${label} FK count`);
    for (const name of ['admin_role_permission', 'admin_role_permission_version']) {
      const table = tables.find((entry) => entry.name === name);
      assert.ok(table, `${label} retains ${name}`);
      if (label === 'NoteCraft') {
        assert.match(table.description, /候選/);
        assert.match(table.description, /尚未/);
        assert.doesNotMatch(table.description, /有條件候選|D-9.*(?:決定是否|若取消|尚未)/);
      }
    }
  }
  const projectedMatrix = data.tables.find((table) => table.name === 'admin_role_permission');
  assert.deepEqual(projectedMatrix.columns.filter((column) => column.pk).map((column) => column.name),
    ['role_type', 'role_key', 'permission_key']);
  assert.equal(projectedMatrix.columns.find((column) => column.name === 'allowed').type, 'boolean');
  assert.equal(projectedMatrix.columns.find((column) => column.name === 'allowed').required, 'required');
  assert.equal(source.tables.find((table) => table.name === 'audit_events').columns
    .find((column) => column.name === 'task_id').fk, 'task');
  assert.deepEqual(validateWithTaskParents(source, data), []);
});

test('parsesRealAccountAdminDictionary', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  assert.equal(source.tables.length, 10);
  assert.deepEqual(source.tables.find((table) => table.name === 'admin_role_permission').columns
    .filter((column) => column.pk).map((column) => column.name), [
    'role_type', 'role_key', 'permission_key',
  ]);
  const audit = source.tables.find((table) => table.name === 'audit_events');
  assert.ok(audit, 'Missing dictionary table: audit_events');
  assert.equal(audit.columns.find((column) => column.name === 'actor_user_id').fk, 'users');
});

test('realDictionaryAndNoteCraftProjectSharedAuditEventsWithTaskFk', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  const data = JSON.parse(readFileSync(new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));

  const projectedAccount = accountData(source, data);
  for (const [label, tables] of [['dictionary', source.tables], ['NoteCraft', projectedAccount.tables]]) {
    assert.equal(tables.length, 10, `${label} table count`);
    assert.equal(tables.some((table) => table.name === 'audit_event'), false, `${label} retains singular audit_event`);
    const audit = tables.find((table) => table.name === 'audit_events');
    assert.ok(audit, `${label} missing shared audit_events`);
    assert.equal(audit.columns.length, 10, `${label} audit_events column count`);
    const actor = audit.columns.find((column) => column.name === 'actor_user_id');
    assert.ok(actor, `${label} missing audit_events.actor_user_id`);
    assert.equal(actor.fk, 'users', `${label} actor FK`);
    const task = audit.columns.find((column) => column.name === 'task_id');
    assert.ok(task, `${label} missing audit_events.task_id`);
    assert.equal(task.type, 'uuid', `${label} task_id type`);
    assert.equal(task.fk, 'task', `${label} must reference task for non-null scopes`);
  }

  const sourceAudit = source.tables.find((table) => table.name === 'audit_events');
  assert.equal(sourceAudit.columns.find((column) => column.name === 'actor_user_id').nullable, true);
  assert.equal(sourceAudit.columns.find((column) => column.name === 'task_id').nullable, true);
  const projectedAudit = data.tables.find((table) => table.name === 'audit_events');
  assert.equal(projectedAudit.columns.find((column) => column.name === 'actor_user_id').required, 'nullable');
  assert.equal(projectedAudit.columns.find((column) => column.name === 'task_id').required, 'nullable');

  assert.equal(source.tables.reduce((count, table) => count + table.columns.length, 0), 73);
  assert.equal(projectedAccount.tables.reduce((count, table) => count + table.columns.length, 0), 73);
  assert.equal(source.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0), 8);
  assert.equal(projectedAccount.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0), 8);
  assert.deepEqual(validateWithTaskParents(source, data), []);
});

test('realDictionaryModelsAccountSessionsWithoutDuplicatingTheirOwnerOrStartTime', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  const table = (name) => {
    const found = source.tables.find((entry) => entry.name === name);
    assert.ok(found, `Missing candidate table: ${name}`);
    return found;
  };
  const column = (tableName, columnName) => {
    const found = table(tableName).columns.find((entry) => entry.name === columnName);
    assert.ok(found, `Missing column: ${tableName}.${columnName}`);
    return found;
  };

  assert.deepEqual(column('users', 'credential_version'), {
    name: 'credential_version', type: 'integer', nullable: false, pk: false,
  });
  assert.deepEqual(column('account_session', 'id'), {
    name: 'id', type: 'uuid', nullable: false, pk: true,
  });
  assert.deepEqual(column('account_session', 'user_id'), {
    name: 'user_id', type: 'uuid', nullable: false, pk: false, fk: 'users',
  });
  assert.deepEqual(column('account_session', 'started_at'), {
    name: 'started_at', type: 'timestamptz', nullable: false, pk: false,
  });
  assert.equal(column('account_session', 'revoked_at').nullable, true);
  assert.deepEqual(column('account_session', 'logged_out_at'), {
    name: 'logged_out_at', type: 'timestamptz', nullable: true, pk: false,
  });
  assert.deepEqual(column('refresh_tokens', 'session_id'), {
    name: 'session_id', type: 'uuid', nullable: false, pk: false, fk: 'account_session',
  });
  assert.equal(source.tables.some((entry) => entry.name === 'account_token_family'), false);
  assert.equal(table('refresh_tokens').columns.some((entry) => entry.name === 'family_id'), false);
  assert.equal(column('refresh_tokens', 'grace_reissued_at').nullable, true);
  assert.equal(table('refresh_tokens').columns.some((entry) => entry.name === 'user_id'), false);
  assert.equal(table('refresh_tokens').columns.some((entry) => entry.name === 'session_started_at'), false);
  assert.match(markdown, /users\s+\|\|--o\{\s+account_session/);
  assert.match(markdown, /account_session\s+\|\|--o\{\s+refresh_tokens/);
});

test('passwordTokenInvalidationTimeAppearsInDictionaryAndNoteCraftProjection', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  const data = JSON.parse(readFileSync(new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));
  const sourceToken = source.tables.find((table) => table.name === 'account_password_token');
  const projectedToken = data.tables.find((table) => table.name === 'account_password_token');

  assert.ok(sourceToken, 'Missing dictionary table: account_password_token');
  assert.ok(projectedToken, 'Missing NoteCraft table: account_password_token');
  assert.deepEqual(sourceToken.columns.find((column) => column.name === 'invalidated_at'), {
    name: 'invalidated_at', type: 'timestamptz', nullable: true, pk: false,
  });
  const projectedInvalidation = projectedToken.columns.find((column) => column.name === 'invalidated_at');
  assert.ok(projectedInvalidation, 'Missing NoteCraft column: account_password_token.invalidated_at');
  assert.equal(projectedInvalidation.type, 'timestamptz');
  assert.equal(projectedInvalidation.required, 'nullable');
});

test('noteCraftProjectionTracksTheCanonicalAccountSessionDictionaryAndRejectsDrift', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  const data = JSON.parse(readFileSync(new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));
  const session = data.tables.find((table) => table.name === 'account_session');
  assert.ok(session, 'NoteCraft must display account_session');
  assert.deepEqual(validateWithTaskParents(source, data), []);
  assert.equal(data.tables.some((table) => table.name === 'account_token_family'), false);
  assert.equal(session.columns.find((column) => column.name === 'id')?.pk, true);
  assert.equal(session.columns.find((column) => column.name === 'user_id')?.fk, 'users');
  const logout = session.columns.find((column) => column.name === 'logged_out_at');
  assert.ok(logout, 'NoteCraft must display account_session.logged_out_at');
  assert.equal(logout.type, 'timestamptz');
  assert.equal(logout.required, 'nullable');
  assert.equal(data.tables.find((table) => table.name === 'refresh_tokens').columns
    .find((column) => column.name === 'session_id')?.fk, 'account_session');
  assert.equal(data.tables.find((table) => table.name === 'refresh_tokens').columns
    .some((column) => column.name === 'family_id'), false);

  const missingSession = structuredClone(data);
  missingSession.tables = missingSession.tables.filter((table) => table.name !== 'account_session');
  assert.match(validateWithTaskParents(source, missingSession).join('\n'), /Missing table: account_session/);

  const detachedToken = structuredClone(data);
  delete detachedToken.tables.find((table) => table.name === 'refresh_tokens').columns
    .find((column) => column.name === 'session_id').fk;
  assert.match(validateWithTaskParents(source, detachedToken).join('\n'), /refresh_tokens\.session_id: FK/);
});

test('noteCraftProjectionKeepsThe40Table47FkShapeWith342Columns', () => {
  const data = JSON.parse(readFileSync(
    new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));
  assert.deepEqual({
    tables: data.tables.length,
    columns: data.tables.reduce((count, table) => count + table.columns.length, 0),
    fks: data.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0),
  }, { tables: 40, columns: 342, fks: 47 });
});

test('realAccountAndDatasetDictionariesMatchCompleteNoteCraftProjection', () => {
  const account = parseAccountAdminSchema(readFileSync(
    new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8'));
  const dataset = parseDatasetSchema(readFileSync(
    new URL('../../docs/diagrams/architecture/dataset-db-schema.md', import.meta.url), 'utf8'));
  const data = JSON.parse(readFileSync(
    new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));
  const expectedDatasetNames = [
    'dataset', 'dataset_version', 'dataset_import_batch', 'dataset_item', 'dataset_item_private',
  ];

  assert.deepEqual(dataset.tables.map((table) => table.name), expectedDatasetNames);
  const existingModules = mergeSchemaSources(account, dataset);
  assert.deepEqual(validateWithTaskParents(existingModules, data), []);
  assert.deepEqual(data.tables.filter((table) => expectedDatasetNames.includes(table.name))
    .map((table) => table.name), expectedDatasetNames);
});

test('NoteCraft CI runs account, dataset and task/run schema regressions', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const job = workflow.match(/^  database-schema:\n([\s\S]*?)(?=^  [a-z][\w-]*:\n|(?![\s\S]))/m)?.[1];
  assert.ok(job, 'Missing database-schema CI job');
  for (const file of [
    'check-database-schema.test.mjs', 'check-database-dataset.test.mjs',
    'check-database-task-run.test.mjs', 'check-account-session-canonical.test.mjs',
  ]) {
    assert.match(job, new RegExp(`node --test[^\\n]*scripts/tests/${file.replaceAll('.', '\\.')}\\b`),
      `NoteCraft CI must execute ${file}`);
  }
});

test('realDictionaryAndNoteCraftProjectIdempotencyRecordWithNineColumnsAndActorFk', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  const data = JSON.parse(readFileSync(new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));
  const expected = [
    ['id', 'uuid', false, true],
    ['scope', 'varchar(64)', false, false],
    ['actor_user_id', 'uuid', false, false],
    ['idempotency_key', 'varchar(120)', false, false],
    ['request_digest', 'varchar(64)', false, false],
    ['result_resource_type', 'varchar(64)', false, false],
    ['result_resource_id', 'uuid', false, false],
    ['created_at', 'timestamptz', false, false],
    ['expires_at', 'timestamptz', false, false],
  ];

  const sourceTable = source.tables.find((table) => table.name === 'idempotency_record');
  assert.ok(sourceTable, 'Missing dictionary table: idempotency_record');
  assert.deepEqual(sourceTable.columns.map((column) => [column.name, column.type, column.nullable, Boolean(column.pk)]), expected);
  assert.equal(sourceTable.columns.find((column) => column.name === 'actor_user_id').fk, 'users');
  assert.equal(sourceTable.columns.filter((column) => column.fk).length, 1);

  const projected = data.tables.find((table) => table.name === 'idempotency_record');
  assert.ok(projected, 'Missing NoteCraft table: idempotency_record');
  assert.equal(projected.group, 'admin');
  assert.equal(projected.section, '3.10');
  assert.deepEqual(projected.columns.map((column) => [column.name, column.type, Boolean(column.pk)]),
    expected.map(([name, type, , pk]) => [name, type, pk]));
  assert.ok(projected.columns.every((column) => column.required === 'required' || column.required === 'system'),
    'Every idempotency_record column is non-null');
  assert.equal(projected.columns.find((column) => column.name === 'actor_user_id').fk, 'users');
  assert.match(projected.description, /候選/);
  assert.match(projected.description, /尚未/);

  const names = data.tables.map((table) => table.name);
  assert.equal(names.indexOf('idempotency_record'), names.indexOf('admin_role_permission_version') + 1,
    'idempotency_record is the last admin table, right after admin_role_permission_version');
  assert.deepEqual(validateWithTaskParents(source, data), []);
});

test('accountAdminDictionaryDocumentsIdempotencyUniqueRuleAndCitations', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  assert.match(markdown, /### 3\.10 idempotency_record/);
  const rules = markdown.split(/^## 4\. /m)[1];
  assert.ok(rules, 'Missing dictionary section 4');
  const line = rules.split('\n').find((entry) => /UNIQUE\s*\(\s*scope,\s*actor_user_id,\s*idempotency_key\s*\)/.test(entry));
  assert.ok(line, 'Section 4 must carry UNIQUE (scope, actor_user_id, idempotency_key)');
  assert.match(line, /expires_at/);
  assert.match(line, /SQLite/);
  assert.match(line, /PostgreSQL/);
  assert.match(markdown, /IDEMPOTENCY_WINDOW_HOURS/);
  assert.match(markdown, /request_digest/);
  const summary = markdown.split('\n').find((entry) => entry.startsWith('- **NoteCraft 規劃檢視**'));
  assert.match(summary, /10 張候選表（73 欄、8 個候選單欄 FK）/);
  assert.match(summary, /40 張候選表／342 欄／47 個候選單欄 FK/);
});
