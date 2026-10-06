import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as checker from '../check-database-schema.mjs';

const datasetMarkdown = `# Dataset physical candidate

## 2. ERD

\`\`\`mermaid
erDiagram
    dataset {
        uuid id PK
        uuid created_by_user_id FK
        varchar name
    }
    dataset_version {
        uuid id PK
        uuid dataset_id FK
        uuid parent_version_id FK
    }
    dataset_import_batch {
        uuid id PK
        uuid dataset_version_id FK
        varchar preprocessing_version
    }
    dataset_item {
        uuid id PK
        uuid dataset_import_batch_id FK
        json public_payload
    }
    dataset_item_private {
        uuid dataset_item_id PK,FK
        json hidden_answer
        varchar declared_split
    }
\`\`\`

## 3. 欄位字典

### 3.1 dataset：logical dataset

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`id\` | uuid | 否 | ID | Create | PK |
| \`created_by_user_id\` | uuid → users | 否 | Owner | Create | FK |
| \`name\` | varchar(120) | 否 | Name | Create | — |

### 3.2 dataset_version：immutable version

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`id\` | uuid | 否 | ID | Create | PK |
| \`dataset_id\` | uuid → dataset | 否 | Dataset | Create | FK |
| \`parent_version_id\` | uuid → dataset_version | 是 | Parent | Create | FK |

### 3.3 dataset_import_batch：source batch

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`id\` | uuid | 否 | ID | Create | PK |
| \`dataset_version_id\` | uuid → dataset_version | 否 | Version | Create | FK |
| \`preprocessing_version\` | varchar(80) | 否 | Pipeline version | Create | — |

### 3.4 dataset_item：safe item

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`id\` | uuid | 否 | ID | Create | PK |
| \`dataset_import_batch_id\` | uuid → dataset_import_batch | 否 | Batch | Create | FK |
| \`public_payload\` | json | 否 | Safe fields only | Create | — |

### 3.5 dataset_item_private：restricted answer

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`dataset_item_id\` | uuid → dataset_item | 否 | Item | Create | PK and FK |
| \`hidden_answer\` | json | 是 | Restricted answer | Create | — |
| \`declared_split\` | varchar(16) | 是 | Restricted split | Create | — |

## 4. Constraints
`;

const accountMarkdown = `# Account parent

## 2. ERD

\`\`\`mermaid
erDiagram
    users {
        uuid id PK
    }
\`\`\`

## 3. 欄位字典

### 3.1 users：account

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`id\` | uuid | 否 | ID | Create | PK |

## 4. Constraints
`;

const datasetNames = [
  'dataset', 'dataset_version', 'dataset_import_batch', 'dataset_item', 'dataset_item_private',
];

const datasetProjection = {
  tables: [
    { name: 'users', columns: [{ name: 'id', type: 'uuid', required: 'system', pk: true }] },
    { name: 'dataset', description: 'Candidate; not deployed', columns: [
      { name: 'id', type: 'uuid', required: 'system', pk: true },
      { name: 'created_by_user_id', type: 'uuid', required: 'required', fk: 'users' },
      { name: 'name', type: 'varchar(120)', required: 'required' },
    ] },
    { name: 'dataset_version', description: 'Candidate; not deployed', columns: [
      { name: 'id', type: 'uuid', required: 'system', pk: true },
      { name: 'dataset_id', type: 'uuid', required: 'required', fk: 'dataset' },
      { name: 'parent_version_id', type: 'uuid', required: 'nullable', fk: 'dataset_version' },
    ] },
    { name: 'dataset_import_batch', description: 'Candidate; not deployed', columns: [
      { name: 'id', type: 'uuid', required: 'system', pk: true },
      { name: 'dataset_version_id', type: 'uuid', required: 'required', fk: 'dataset_version' },
      { name: 'preprocessing_version', type: 'varchar(80)', required: 'required' },
    ] },
    { name: 'dataset_item', description: 'Candidate; not deployed', columns: [
      { name: 'id', type: 'uuid', required: 'system', pk: true },
      { name: 'dataset_import_batch_id', type: 'uuid', required: 'required', fk: 'dataset_import_batch' },
      { name: 'public_payload', type: 'json', required: 'required' },
    ] },
    { name: 'dataset_item_private', description: 'Candidate; not deployed', columns: [
      { name: 'dataset_item_id', type: 'uuid', required: 'required', pk: true, fk: 'dataset_item' },
      { name: 'hidden_answer', type: 'json', required: 'nullable' },
      { name: 'declared_split', type: 'varchar(16)', required: 'nullable' },
    ] },
  ],
};

function parseDataset() {
  assert.equal(typeof checker.parseDatasetSchema, 'function', 'dataset parser is required');
  return checker.parseDatasetSchema(datasetMarkdown);
}

function mergedSource() {
  assert.equal(typeof checker.mergeSchemaSources, 'function', 'source merger is required');
  return checker.mergeSchemaSources(checker.parseAccountAdminSchema(accountMarkdown), parseDataset());
}

test('dataset parser retains all five tables and their field contracts', () => {
  const source = parseDataset();
  assert.deepEqual(source.tables.map((table) => table.name), datasetNames);
  assert.equal(source.tables.reduce((count, table) => count + table.columns.length, 0), 15);
  assert.deepEqual(source.tables.find((table) => table.name === 'dataset_item_private').columns, [
    { name: 'dataset_item_id', type: 'uuid', nullable: false, pk: true, fk: 'dataset_item' },
    { name: 'hidden_answer', type: 'json', nullable: true, pk: false },
    { name: 'declared_split', type: 'varchar(16)', nullable: true, pk: false },
  ]);
  assert.equal(source.tables.find((table) => table.name === 'dataset_version').columns
    .find((column) => column.name === 'parent_version_id').fk, 'dataset_version');
});

test('merged account and dataset sources accept the complete FK chain', () => {
  const source = mergedSource();
  assert.equal(source.tables.length, 6);
  assert.deepEqual(checker.validateErData(source, datasetProjection), []);
});

test('merged sources reject table and column omissions or inventions', () => {
  const source = mergedSource();
  const missingTable = structuredClone(datasetProjection);
  missingTable.tables = missingTable.tables.filter((table) => table.name !== 'dataset_import_batch');
  assert.match(checker.validateErData(source, missingTable).join('\n'), /Missing table: dataset_import_batch/);

  const extraTable = structuredClone(datasetProjection);
  extraTable.tables.push({ name: 'dataset_ghost', columns: [] });
  assert.match(checker.validateErData(source, extraTable).join('\n'), /Extra table: dataset_ghost/);

  const missingColumn = structuredClone(datasetProjection);
  missingColumn.tables.find((table) => table.name === 'dataset_item').columns.pop();
  assert.match(checker.validateErData(source, missingColumn).join('\n'), /Missing column: dataset_item\.public_payload/);

  const extraColumn = structuredClone(datasetProjection);
  extraColumn.tables.find((table) => table.name === 'dataset_item').columns
    .push({ name: 'raw_answer', type: 'json', required: 'nullable' });
  assert.match(checker.validateErData(source, extraColumn).join('\n'), /Extra column: dataset_item\.raw_answer/);
});

test('merged source rejects type, nullability, PK, and FK drift', () => {
  const source = mergedSource();
  for (const [tableName, columnName, property, value] of [
    ['dataset_item', 'public_payload', 'type', 'text'],
    ['dataset_item_private', 'hidden_answer', 'required', 'required'],
    ['dataset_item_private', 'dataset_item_id', 'pk', false],
    ['dataset_item', 'dataset_import_batch_id', 'fk', 'missing_batch'],
  ]) {
    const data = structuredClone(datasetProjection);
    data.tables.find((table) => table.name === tableName).columns
      .find((column) => column.name === columnName)[property] = value;
    assert.match(checker.validateErData(source, data).join('\n'),
      new RegExp(`${tableName}\\.${columnName}`), `${property} drift`);
  }
});

test('source merger rejects a table defined in both inventories', () => {
  assert.equal(typeof checker.mergeSchemaSources, 'function', 'source merger is required');
  const account = checker.parseAccountAdminSchema(accountMarkdown);
  assert.throws(() => checker.mergeSchemaSources(account, account), /duplicate.*users/i);
});

test('dataset projection requires candidate and undeployed status on every table', () => {
  const source = { tables: datasetProjection.tables.map((table) => ({
    name: table.name,
    columns: table.columns.map((column) => ({
      name: column.name, type: column.type, nullable: column.required === 'nullable',
      pk: Boolean(column.pk), ...(column.fk ? { fk: column.fk } : {}),
    })),
  })) };
  assert.deepEqual(checker.validateErData(source, datasetProjection), []);
  for (const name of datasetNames) {
    const data = structuredClone(datasetProjection);
    data.tables.find((table) => table.name === name).description = 'Already deployed';
    assert.match(checker.validateErData(source, data).join('\n'),
      new RegExp(`${name}.*(?:candidate|undeployed)`, 'i'), `${name} status`);
  }
});

test('dataset parser rejects a Mermaid table without a dictionary entry', () => {
  const extraMermaidTable = datasetMarkdown.replace('erDiagram\n', `erDiagram
    dataset_ghost {
        uuid id PK
    }
`);
  assert.throws(() => checker.parseDatasetSchema(extraMermaidTable),
    /dataset_ghost.*(?:dictionary|§3)|(?:dictionary|§3).*dataset_ghost/i);
});

test('dataset parser rejects a Mermaid column absent from the dictionary', () => {
  const extraMermaidColumn = datasetMarkdown.replace(
    '        varchar name\n', '        varchar name\n        text undocumented_field\n');
  assert.throws(() => checker.parseDatasetSchema(extraMermaidColumn),
    /dataset\.undocumented_field.*(?:dictionary|§3)|(?:dictionary|§3).*dataset\.undocumented_field/i);
});

test('dataset parser rejects duplicate dictionary table headings', () => {
  const duplicateDictionary = datasetMarkdown.replace('## 4. Constraints', `### 3.6 dataset_item_private：duplicate

| 欄位 | 型別 | 可空 | 代表什麼 | 何時寫入／改變 | 規則 |
|---|---|---|---|---|---|
| \`dataset_item_id\` | uuid → dataset_item | 否 | Item | Create | PK and FK |

## 4. Constraints`);
  assert.throws(() => checker.parseDatasetSchema(duplicateDictionary),
    /duplicate.*dataset_item_private/i);
});
