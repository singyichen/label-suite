import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('dataset parser rejects duplicate dictionary columns', () => {
  const nameRow = '| `name` | varchar(120) | 否 | Name | Create | — |\n';
  const duplicateColumn = datasetMarkdown.replace(nameRow, nameRow + nameRow);
  assert.throws(() => checker.parseDatasetSchema(duplicateColumn),
    /duplicate.*dataset\.name|dataset\.name.*duplicate/i);
});

test('dataset parser rejects an unquoted dictionary column name', () => {
  const nameRow = '| `name` | varchar(120) | 否 | Name | Create | — |\n';
  const unquotedColumn = datasetMarkdown.replace(nameRow,
    `${nameRow}| orphan_field | varchar(80) | 否 | Undocumented syntax | Create | — |\n`);
  assert.throws(() => checker.parseDatasetSchema(unquotedColumn),
    /(?:backtick|invalid|unquoted).*orphan_field|orphan_field.*(?:backtick|invalid|unquoted)/i);
});

test('Mermaid quoted FK pending note does not declare a foreign key', () => {
  const noteOnly = datasetMarkdown.replace('        varchar name\n',
    '        varchar name "FK pending"\n');
  const source = checker.parseDatasetSchema(noteOnly);
  assert.equal(source.tables.find((table) => table.name === 'dataset').columns
    .find((column) => column.name === 'name').fk, undefined);
});

// Issue #1217: draft manifest correction is limited to public -> protected.
const readCanonical = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const datasetSpec = readCanonical('../../specs/dataset/021-dataset-ingestion-and-lineage/spec.md');
const datasetSchemaDoc = readCanonical('../../docs/diagrams/architecture/dataset-db-schema.md');

function specLine(source, id) {
  const result = source.split('\n').find((candidate) =>
    new RegExp(`^(?:- |\\d+\\. )\\*\\*${id}\\*\\*`).test(candidate));
  assert.ok(result, `Missing current ${id} contract`);
  return result;
}

function tableRow(source, firstCell) {
  const result = source.split('\n').find((candidate) => candidate.startsWith(`| ${firstCell} |`));
  assert.ok(result, `Missing table row ${firstCell}`);
  return result;
}

test('dataset-021 FR-006 limits draft manifest correction to public-to-protected', () => {
  const rule = specLine(datasetSpec, 'FR-006');
  assert.match(rule, /公開改(?:為)?受保護/);
  assert.match(rule, /重新上傳/);
  assert.match(rule, /串流匯入器/);
  assert.doesNotMatch(rule, /draft 修正 manifest 須原子重建/);
});

test('dataset-021 AC-2.6 covers the direction limit and re-upload', () => {
  const ac = specLine(datasetSpec, 'AC-2\\.6');
  assert.match(ac, /公開改(?:為)?受保護/);
  assert.match(ac, /重新上傳/);
});

test('dataset-021 keeps the 1.2.0 Changelog row citing #1217 as history', () => {
  const row = datasetSpec.split('\n').find((candidate) => candidate.startsWith('| 1.2.0 |'));
  assert.ok(row, 'Missing 1.2.0 Changelog row');
  assert.match(row, /#1217/);
  assert.match(row, /維護者\s*裁決/);
});

test('dataset schema doc B-04 states the direction limit and re-upload', () => {
  const row = tableRow(datasetSchemaDoc, 'B-04');
  assert.match(row, /公開改(?:為)?受保護/);
  assert.match(row, /重新上傳/);
  assert.doesNotMatch(row, /draft 修正時原子重建受影響的 public\/private 列/);
});

test('dataset schema doc S-01 keeps scoring-worker-only reads and forbids manifest correction reads', () => {
  const row = tableRow(datasetSchemaDoc, 'S-01');
  assert.match(row, /儲存後任何含答案內容只允許授權 scoring-worker 路徑讀取/);
  assert.match(row, /不讀取已儲存/);
});

test('dataset schema doc classification_manifest row no longer claims unconditional rebuild', () => {
  const row = tableRow(datasetSchemaDoc, '`classification_manifest`');
  assert.doesNotMatch(row, /draft 修正後重建投影/);
});

// Issue #1221: sealed dataset versions are DB-enforced immutable (ADR-024 amendment).
test('dataset schema doc V-07 defines dataset_version immutability triggers', () => {
  const row = tableRow(datasetSchemaDoc, 'V-07');
  const cells = row.split('|').map((cell) => cell.trim());
  assert.equal(cells[2], 'DB', 'V-07 position cell must be DB');
  for (const token of ['BEFORE UPDATE', 'BEFORE DELETE', 'SQLite', 'PostgreSQL', 'FR-008']) {
    assert.ok(row.includes(token), `V-07 must mention ${token}`);
  }
  assert.match(row, /draft\s*→\s*sealed/, 'V-07 must allow draft → sealed');
  assert.match(row, /sealed\s*→\s*draft/, 'V-07 must reject sealed → draft');
});

test('dataset schema doc V-08 defines sealed-version child table guards', () => {
  const row = tableRow(datasetSchemaDoc, 'V-08');
  const cells = row.split('|').map((cell) => cell.trim());
  assert.equal(cells[2], 'DB', 'V-08 position cell must be DB');
  for (const token of ['dataset_import_batch', 'dataset_item', 'dataset_item_private',
    'BEFORE INSERT', 'OLD', 'NEW', 'FOR SHARE', 'TRUNCATE', 'FR-008']) {
    assert.ok(row.includes(token), `V-08 must mention ${token}`);
  }
});

test('dataset schema doc V-06 and the state field rule point at V-07 as DB enforcement', () => {
  assert.match(tableRow(datasetSchemaDoc, 'V-06'), /V-07/, 'V-06 must reference V-07');
  const state = datasetSchemaDoc.split('\n').find((line) => line.startsWith('| `state` |'));
  assert.ok(state, 'Missing state field row');
  assert.match(state, /V-07/, 'state field rule cell must cite V-07');
});

// Issue #1228: dataset_item_private gains a nullable protected_payload JSON column.
const inventoryDoc = readCanonical('../../docs/diagrams/architecture/database-table-inventory.md');
const diagramsReadme = readCanonical('../../docs/diagrams/README.md');
const accountAdminDoc = readCanonical('../../docs/diagrams/architecture/account-admin-db-schema.md');
const erData = JSON.parse(readCanonical('../../docs/diagrams/architecture/database-schema.er.json'));

test('dataset-021 FR-005 defines protected_payload separately from hidden_answer', () => {
  const rule = specLine(datasetSpec, 'FR-005');
  assert.match(rule, /protected_payload/);
  assert.match(rule, /classification_manifest/);
  assert.match(rule, /讀取權與 `hidden_answer` 分開授權/);
  assert.match(rule, /儲存後只允許授權 scoring worker 讀取答案/);
});

test('dataset-021 FR-006 and AC-2.6 land moved values in protected_payload', () => {
  assert.match(specLine(datasetSpec, 'FR-006'), /protected_payload/);
  assert.match(specLine(datasetSpec, 'AC-2\\.6'), /protected_payload/);
});

test('dataset-021 keeps the 1.3.0 Changelog row citing #1228', () => {
  const row = datasetSpec.split('\n').find((candidate) => candidate.startsWith('| 1.3.0 |'));
  assert.ok(row, 'Missing 1.3.0 Changelog row');
  assert.match(row, /#1228/);
  assert.match(row, /維護者\s*裁決/);
});

test('dataset schema doc Mermaid and 3.5 dictionary declare protected_payload', () => {
  const mermaid = datasetSchemaDoc.match(/dataset_item_private \{[^}]*\}/);
  assert.ok(mermaid, 'Missing dataset_item_private Mermaid block');
  assert.match(mermaid[0], /^\s*json protected_payload\b/m);
  const row = tableRow(datasetSchemaDoc, '`protected_payload` | json | 是');
  assert.match(row, /P-04/);
  assert.match(row, /S-01/);
});

test('dataset schema doc P-04 binds protected_payload to classification_manifest, apart from hidden_answer', () => {
  const row = tableRow(datasetSchemaDoc, 'P-04');
  for (const token of ['protected_payload', 'classification_manifest', 'hidden_answer']) {
    assert.ok(row.includes(token), `P-04 must mention ${token}`);
  }
});

test('dataset schema doc B-04, S-01, fairness and permission rows mention protected_payload', () => {
  assert.match(tableRow(datasetSchemaDoc, 'B-04'), /protected_payload/);
  assert.match(tableRow(datasetSchemaDoc, 'S-01'), /protected_payload/);
  assert.match(tableRow(datasetSchemaDoc, '資料公平性'), /protected_payload/);
  assert.match(tableRow(datasetSchemaDoc, '`dataset_item_private`'), /protected_payload/);
});

test('dataset schema doc V-08 still guards dataset_item_private so no new trigger row is needed', () => {
  assert.ok(tableRow(datasetSchemaDoc, 'V-08').includes('dataset_item_private'));
});

test('NoteCraft projection shows protected_payload after hidden_answer and 32 dataset columns', () => {
  const table = erData.tables.find((candidate) => candidate.name === 'dataset_item_private');
  const names = table.columns.map((column) => column.name);
  const column = table.columns.find((candidate) => candidate.name === 'protected_payload');
  assert.ok(column, 'Missing protected_payload in database-schema.er.json');
  assert.equal(column.type, 'json');
  assert.equal(column.required, 'nullable');
  assert.equal(names.indexOf('protected_payload'), names.indexOf('hidden_answer') + 1);
  const datasetColumns = erData.tables.filter((candidate) => candidate.group === 'dataset')
    .reduce((sum, candidate) => sum + candidate.columns.length, 0);
  assert.equal(datasetColumns, 32);
});

test('inventory, README and account-admin doc carry the 351-column totals', () => {
  assert.ok(inventoryDoc.includes('資料集資料結構](./dataset-db-schema.md)：5 張／32 欄／6 單欄 FK'));
  assert.ok(inventoryDoc.includes('351 欄'));
  assert.ok(diagramsReadme.includes('351 欄'));
  assert.ok(accountAdminDoc.includes('351 欄'));
  assert.ok(accountAdminDoc.includes('5 張／32 欄／6 FK'));
});

// Issue #1224: dataset-021 FR-011 v1.4.0 and dictionary deletion wording.
test('dataset-021 canonical FR-011 is defined by ADR-038 at version 1.4.0', () => {
  const spec = readFileSync(new URL('../../specs/dataset/021-dataset-ingestion-and-lineage/spec.md', import.meta.url), 'utf8');
  assert.match(spec, /^版本: 1\.4\.0$/m);
  const fr = spec.split('\n').find((line) => line.startsWith('- **FR-011**'));
  assert.ok(fr, 'Missing FR-011');
  for (const token of ['ADR-038', 'RESTRICT', 'sealed', 'draft', 'protected_payload', '#1224']) {
    assert.ok(fr.includes(token), `FR-011 must mention ${token}`);
  }
  assert.ok(!fr.includes('未定案前不得以無限制 cascade'), 'FR-011 must drop the undecided-cascade wording');
  const changelog = spec.split('\n').find((line) => line.startsWith('| 1.4.0 |'));
  assert.ok(changelog, 'Missing 1.4.0 Changelog row');
  assert.ok(changelog.includes('#1224'), 'Changelog 1.4.0 must cite #1224');
});

test('dataset dictionary deletion-and-retention paragraph follows ADR-038 and FR-011', () => {
  const md = readFileSync(new URL('../../docs/diagrams/architecture/dataset-db-schema.md', import.meta.url), 'utf8');
  const line = md.split('\n').find((l) => l.startsWith('**刪除與保留**'));
  assert.ok(line, 'Missing 刪除與保留 paragraph');
  for (const token of ['ADR-038', 'FR-011', 'draft']) {
    assert.ok(line.includes(token), `刪除與保留 must mention ${token}`);
  }
  assert.ok(!line.includes('須先依 dataset-021 FR-011 補齊'), 'Obsolete 補齊 wording must be removed');
});

// Issue #1223 G3: dataset medium/low design fixes.
const datasetRules = () => datasetSchemaDoc.split('\n').filter((line) => /^\| [A-Z]-\d+ \|/.test(line));

test('dataset rule bars annotator-facing order and cursors from source_row_no and import batch', () => {
  const rows = datasetRules().filter((row) => /(?:排序|游標|cursor)/i.test(row)
    && row.includes('source_row_no') && row.includes('dataset_import_batch'));
  assert.equal(rows.length, 1, 'Exactly one rule must bar annotator ordering/cursors from import provenance');
  const [row] = rows;
  assert.match(row, /(?:標記者|標記端)/, 'The rule must target the annotator-facing side');
  assert.match(row, /(?:不得|禁止)[^|]*(?:source_row_no|dataset_import_batch)|(?:source_row_no|dataset_import_batch)[^|]*(?:不得|禁止)/,
    'The rule must forbid using import provenance');
  assert.match(row, /task_run_item\.list_position/, 'The rule must point to task_run_item.list_position');
});

test('dataset rule revokes dataset_import_batch from the annotator role and allowlists public columns', () => {
  const rows = datasetRules().filter((row) => /REVOKE/.test(row) && row.includes('dataset_import_batch'));
  assert.equal(rows.length, 1, 'Exactly one rule must define the REVOKE on dataset_import_batch');
  const [row] = rows;
  assert.match(row, /標記者/, 'The rule must name the annotator role');
  assert.match(row, /REVOKE (?:ALL|SELECT)/, 'The rule must state an explicit REVOKE ALL or REVOKE SELECT');
  assert.match(row, /(?:default privileges|預設權限)/i, 'The rule must forbid default privileges re-granting access');
  assert.match(row, /(?:allowlist|白名單)[^|]*(?:public_payload|公開欄位)|(?:public_payload|公開欄位)[^|]*(?:allowlist|白名單)/i,
    'The annotator read path must use only allowlisted public columns');
  assert.match(row, /SQLite[^|]*(?:allowlist|白名單|service|服務|repository)/i,
    'The SQLite counterpart must be a service-layer allowlist with no direct table access');
});

test('every dataset note on a composite-key table states composite keys are not drawn and points to section 4', () => {
  // Composite UNIQUE/FK in the dictionary: V-01/V-03 (version), B-02 (batch), I-02 (item).
  const compositeSentence = /複合[^。\n]*(?:不畫|未畫|不繪|未繪|不會畫|不會繪)[^。\n]*§4/;
  for (const name of ['dataset_version', 'dataset_import_batch', 'dataset_item']) {
    const table = erData.tables.find((candidate) => candidate.name === name);
    assert.ok(table, `Expected ${name} in database-schema.er.json`);
    assert.match(table.description, compositeSentence,
      `${name} note needs the "複合鍵與複合 FK 未畫在圖上，見各實體字典 §4" sentence`);
  }
});
