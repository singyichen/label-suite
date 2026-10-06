import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { parseAccountAdminSchema, validateErData } from '../check-database-schema.mjs';

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
      name: 'admin_role_permission', description: 'Conditional on D-9', columns: [
        { name: 'role_type', type: 'varchar', required: 'required', pk: true },
      ],
    },
    {
      name: 'admin_role_permission_version', description: 'Conditional on D-9', columns: [
        { name: 'id', type: 'smallint', required: 'system', pk: true },
      ],
    },
  ],
};

const cloneData = () => structuredClone(validData);
const errorsFor = (data) => validateErData(parseAccountAdminSchema(sourceMarkdown), data);

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

test('requiresResolvedPasswordNullabilityAndConditionalTableLabels', () => {
  const stalePassword = cloneData();
  stalePassword.tables[0].columns[1].required = 'pending';
  stalePassword.tables[0].columns[1].note = 'D-1 pending';
  assert.match(errorsFor(stalePassword).join('\n'), /users\.hashed_password/);

  const nonnullablePassword = cloneData();
  nonnullablePassword.tables[0].columns[1].required = 'required';
  assert.match(errorsFor(nonnullablePassword).join('\n'), /users\.hashed_password/);

  for (const name of ['admin_role_permission', 'admin_role_permission_version']) {
    const data = cloneData();
    data.tables.find((table) => table.name === name).description = 'Draft';
    assert.match(errorsFor(data).join('\n'), new RegExp(`${name}.*D-9`));
  }
});

test('parsesRealAccountAdminDictionary', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  assert.equal(source.tables.length, 9);
  assert.deepEqual(source.tables.find((table) => table.name === 'admin_role_permission').columns
    .filter((column) => column.pk).map((column) => column.name), [
    'role_type', 'role_key', 'permission_key',
  ]);
  assert.equal(source.tables.find((table) => table.name === 'audit_event').columns
    .find((column) => column.name === 'actor_user_id').fk, 'users');
});

test('realDictionaryModelsTokenFamiliesWithoutDuplicatingTheirOwnerOrStartTime', () => {
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
  assert.deepEqual(column('account_token_family', 'id'), {
    name: 'id', type: 'uuid', nullable: false, pk: true,
  });
  assert.deepEqual(column('account_token_family', 'user_id'), {
    name: 'user_id', type: 'uuid', nullable: false, pk: false, fk: 'users',
  });
  assert.deepEqual(column('account_token_family', 'started_at'), {
    name: 'started_at', type: 'timestamptz', nullable: false, pk: false,
  });
  assert.equal(column('account_token_family', 'revoked_at').nullable, true);
  assert.equal(column('refresh_tokens', 'family_id').fk, 'account_token_family');
  assert.equal(column('refresh_tokens', 'grace_reissued_at').nullable, true);
  assert.equal(table('refresh_tokens').columns.some((entry) => entry.name === 'user_id'), false);
  assert.equal(table('refresh_tokens').columns.some((entry) => entry.name === 'session_started_at'), false);
  assert.match(markdown, /users\s+\|\|--o\{\s+account_token_family/);
  assert.match(markdown, /account_token_family\s+\|\|--o\{\s+refresh_tokens/);
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

test('noteCraftProjectionTracksTheCanonicalTokenFamilyDictionaryAndRejectsDrift', () => {
  const markdown = readFileSync(new URL('../../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url), 'utf8');
  const source = parseAccountAdminSchema(markdown);
  const data = JSON.parse(readFileSync(new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url), 'utf8'));
  const family = data.tables.find((table) => table.name === 'account_token_family');
  assert.ok(family, 'NoteCraft must display account_token_family');
  assert.deepEqual(validateErData(source, data), []);
  assert.equal(family.columns.find((column) => column.name === 'id')?.pk, true);
  assert.equal(family.columns.find((column) => column.name === 'user_id')?.fk, 'users');
  assert.equal(data.tables.find((table) => table.name === 'refresh_tokens').columns
    .find((column) => column.name === 'family_id')?.fk, 'account_token_family');

  const missingFamily = structuredClone(data);
  missingFamily.tables = missingFamily.tables.filter((table) => table.name !== 'account_token_family');
  assert.match(validateErData(source, missingFamily).join('\n'), /Missing table: account_token_family/);

  const detachedToken = structuredClone(data);
  delete detachedToken.tables.find((table) => table.name === 'refresh_tokens').columns
    .find((column) => column.name === 'family_id').fk;
  assert.match(validateErData(source, detachedToken).join('\n'), /refresh_tokens\.family_id: FK/);
});
