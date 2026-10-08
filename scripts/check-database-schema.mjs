import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const accountSourceUrl = new URL('../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url);
const datasetSourceUrl = new URL('../docs/diagrams/architecture/dataset-db-schema.md', import.meta.url);
const taskRunSourceUrl = new URL('../docs/diagrams/architecture/task-run-db-schema.md', import.meta.url);
const annotationReviewSourceUrl = new URL('../docs/diagrams/architecture/annotation-review-db-schema.md', import.meta.url);
const taskExportSourceUrl = new URL('../docs/diagrams/architecture/task-export-db-schema.md', import.meta.url);
const dataUrl = new URL('../docs/diagrams/architecture/database-schema.er.json', import.meta.url);
const inventoryUrl = new URL('../docs/diagrams/architecture/database-table-inventory.md', import.meta.url);

function parsePhysicalSchema(markdown, { strictEdges = false, externalParents = [] } = {}) {
  const mermaid = markdown.match(/## 2\. ERD\s*\n[\s\S]*?```mermaid\s*\n([\s\S]*?)\n```/)?.[1];
  const dictionary = markdown.match(/## 3\. 欄位字典\s*\n([\s\S]*?)(?=\n## 4\.|$)/)?.[1];
  if (!mermaid || !dictionary) {
    throw new Error('Source must contain §2 Mermaid ERD and §3 column dictionary');
  }

  const mermaidTables = new Map();
  for (const match of mermaid.matchAll(/^\s{4}([A-Za-z_]\w*)\s*\{\s*\n([\s\S]*?)^\s{4}\}/gm)) {
    const name = match[1];
    if (mermaidTables.has(name)) throw new Error(`Duplicate Mermaid table: ${name}`);
    const columns = new Map();
    for (const line of match[2].split('\n')) {
      const column = line.match(/^\s+(\S+)\s+([A-Za-z_]\w*)(?:\s+([A-Za-z_,]+))?(?:\s+"[^"]*")?\s*$/);
      if (!column) {
        if (line.trim()) throw new Error(`Invalid Mermaid column: ${name}: ${line.trim()}`);
        continue;
      }
      if (columns.has(column[2])) throw new Error(`Duplicate Mermaid column: ${name}.${column[2]}`);
      const markers = (column[3] ?? '').split(',');
      columns.set(column[2], { type: column[1], pk: markers.includes('PK'), fk: markers.includes('FK') });
    }
    mermaidTables.set(name, columns);
  }

  const tables = [];
  const dictionaryNames = new Set();
  for (const match of dictionary.matchAll(/^### 3\.\d+\s+([A-Za-z_]\w*)[^\n]*\n([\s\S]*?)(?=^### 3\.\d+\s+|(?![\s\S]))/gm)) {
    const name = match[1];
    if (dictionaryNames.has(name)) throw new Error(`Duplicate dictionary table: ${name}`);
    dictionaryNames.add(name);
    const mermaidColumns = mermaidTables.get(name);
    if (!mermaidColumns) throw new Error(`Missing Mermaid table: ${name}`);
    const columns = [];
    const columnNames = new Set();
    for (const line of match[2].split('\n')) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      const columnName = cells[0]?.match(/^`([A-Za-z_]\w*)`$/)?.[1];
      if (!columnName) {
        if (cells.length === 6 && /^[A-Za-z_]\w*$/.test(cells[0] ?? ''))
          throw new Error(`Unquoted dictionary column: ${name}.${cells[0]}`);
        continue;
      }
      if (cells.length !== 6) throw new Error(`Invalid dictionary row: ${name}.${columnName}`);
      if (columnNames.has(columnName)) throw new Error(`Duplicate dictionary column: ${name}.${columnName}`);
      columnNames.add(columnName);
      const nullableText = cells[2].replace(/\*/g, '');
      if (!/^(是|否)/.test(nullableText)) throw new Error(`Unknown nullability: ${name}.${columnName}`);
      const typeMatch = cells[1].match(/^(.+?)(?:\s*→\s*([A-Za-z_]\w*))?$/);
      if (!typeMatch) throw new Error(`Invalid type: ${name}.${columnName}`);
      const mermaidColumn = mermaidColumns.get(columnName);
      if (strictEdges && mermaidColumn) {
        const diagramType = mermaidColumn.type.toLowerCase();
        const dictionaryType = typeMatch[1].trim().toLowerCase();
        const expectedType = diagramType.includes('(') ? dictionaryType : dictionaryType.replace(/\(.*\)$/, '');
        if (diagramType !== expectedType) {
          throw new Error(`Mermaid type mismatch: ${name}.${columnName}: ${diagramType} != ${dictionaryType}`);
        }
      }
      if (strictEdges && mermaidColumn && mermaidColumn.fk !== Boolean(typeMatch[2])) {
        throw new Error(`Mermaid FK marker mismatch: ${name}.${columnName}`);
      }
      columns.push({
        name: columnName,
        type: typeMatch[1].trim(),
        nullable: nullableText.startsWith('是'),
        pk: mermaidColumn?.pk ?? false,
        ...(typeMatch[2] ? { fk: typeMatch[2] } : {}),
      });
    }
    if (columns.length === 0) throw new Error(`No dictionary columns: ${name}`);
    for (const columnName of mermaidColumns.keys()) {
      if (!columnNames.has(columnName))
        throw new Error(`Mermaid column missing from dictionary: ${name}.${columnName}`);
    }
    for (const columnName of columnNames) {
      if (!mermaidColumns.has(columnName))
        throw new Error(`Dictionary column missing from Mermaid: ${name}.${columnName}`);
    }
    tables.push({ name, columns });
  }
  if (tables.length === 0) throw new Error('No §3 dictionary tables found');
  for (const name of mermaidTables.keys()) {
    if (!dictionaryNames.has(name)) throw new Error(`Mermaid table missing from dictionary: ${name}`);
  }
  if (strictEdges) {
    const allowedParents = new Set([...mermaidTables.keys(), ...externalParents]);
    const tableColumns = new Map(tables.map((table) => [
      table.name, new Map(table.columns.map((column) => [column.name, column])),
    ]));
    const diagramEdges = new Set();
    for (const match of mermaid.matchAll(/^\s{4}([A-Za-z_]\w*)\s+\S+--\S+\s+([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)\s*$/gm)) {
      const [, parent, child, columnName] = match;
      const column = tableColumns.get(child)?.get(columnName);
      if (!allowedParents.has(parent) || !column || column.fk !== parent) {
        throw new Error(`Invalid Mermaid FK edge: ${parent} -> ${child}.${columnName}`);
      }
      const edge = `${child}.${columnName}`;
      if (diagramEdges.has(edge)) throw new Error(`Duplicate Mermaid FK edge: ${edge}`);
      diagramEdges.add(edge);
    }
    for (const table of tables) {
      for (const column of table.columns) {
        if (column.fk && allowedParents.has(column.fk) && !diagramEdges.has(`${table.name}.${column.name}`)) {
          throw new Error(`Missing Mermaid FK edge: ${table.name}.${column.name} -> ${column.fk}`);
        }
      }
    }
  }
  return { tables };
}

export const parseAccountAdminSchema = parsePhysicalSchema;
export const parseDatasetSchema = parsePhysicalSchema;
export const parseTaskRunSchema = (markdown) => parsePhysicalSchema(markdown, { strictEdges: true });
export const parseAnnotationReviewSchema = (markdown) => parsePhysicalSchema(markdown, { strictEdges: true });
export const parseTaskExportSchema = (markdown) => parsePhysicalSchema(markdown, {
  strictEdges: true,
  externalParents: ['task', 'users'],
});

export function mergeSchemaSources(...sources) {
  const tables = [];
  const names = new Set();
  for (const source of sources) {
    for (const table of source.tables) {
      if (names.has(table.name)) throw new Error(`Duplicate source table: ${table.name}`);
      names.add(table.name);
      tables.push(table);
    }
  }
  return { tables };
}

export function validateErData(source, data) {
  const errors = [];
  if (!Array.isArray(source?.tables) || !Array.isArray(data?.tables)) {
    return ['Source and ER data must each contain tables[]'];
  }

  const sourceTables = new Map(source.tables.map((table) => [table.name, table]));
  const dataTables = new Map();
  for (const table of data.tables) {
    if (dataTables.has(table.name)) errors.push(`Duplicate table: ${table.name}`);
    dataTables.set(table.name, table);
  }
  for (const name of sourceTables.keys()) {
    if (!dataTables.has(name)) errors.push(`Missing table: ${name}`);
  }
  for (const name of dataTables.keys()) {
    if (!sourceTables.has(name)) errors.push(`Extra table: ${name}`);
  }

  for (const [tableName, sourceTable] of sourceTables) {
    const table = dataTables.get(tableName);
    if (!table) continue;
    if (!Array.isArray(table.columns)) {
      errors.push(`Missing columns: ${tableName}`);
      continue;
    }
    const sourceColumns = new Map(sourceTable.columns.map((column) => [column.name, column]));
    const dataColumns = new Map();
    for (const column of table.columns) {
      if (dataColumns.has(column.name)) errors.push(`Duplicate column: ${tableName}.${column.name}`);
      dataColumns.set(column.name, column);
    }
    for (const name of sourceColumns.keys()) {
      if (!dataColumns.has(name)) errors.push(`Missing column: ${tableName}.${name}`);
    }
    for (const name of dataColumns.keys()) {
      if (!sourceColumns.has(name)) errors.push(`Extra column: ${tableName}.${name}`);
    }

    for (const [name, expected] of sourceColumns) {
      const actual = dataColumns.get(name);
      if (!actual) continue;
      const path = `${tableName}.${name}`;
      if (actual.type !== expected.type) errors.push(`${path}: type ${actual.type} != ${expected.type}`);
      if (Boolean(actual.pk) !== expected.pk) errors.push(`${path}: PK mismatch`);
      if (actual.fk !== expected.fk) errors.push(`${path}: FK ${actual.fk ?? 'none'} != ${expected.fk ?? 'none'}`);
      if (actual.fk && !dataTables.has(actual.fk)) errors.push(`${path}: FK parent ${actual.fk} does not exist`);

      const permitted = expected.nullable ? ['nullable'] : ['required', 'system'];
      if (!permitted.includes(actual.required)) {
        errors.push(`${path}: required ${actual.required} conflicts with dictionary nullability`);
      }
    }
  }

  for (const name of ['admin_role_permission', 'admin_role_permission_version']) {
    const table = dataTables.get(name);
    if (!table) continue;
    const description = table.description ?? '';
    if (/(?:有條件候選|conditional|D-9.*(?:決定是否|若取消|尚未))/i.test(description))
      errors.push(`${name}: stale D-9 conditional table status`);
    if (!/(?:候選|candidate)/i.test(description) || !/(?:尚未|undeployed|not deployed)/i.test(description))
      errors.push(`${name}: candidate and undeployed table status must be explicit`);
  }
  for (const name of ['dataset', 'dataset_version', 'dataset_import_batch', 'dataset_item', 'dataset_item_private']) {
    const table = dataTables.get(name);
    if (!table) continue;
    const description = table.description ?? '';
    if (!/(?:候選|candidate)/i.test(description) || !/(?:尚未|未部署|undeployed|not deployed)/i.test(description))
      errors.push(`${name}: candidate and undeployed table status must be explicit`);
  }
  return errors;
}

export function validateSchemaSummary(data, inventoryMarkdown) {
  const errors = [];
  const counts = [
    [data.tables.length, /(?:^|\D)(\d+)\s*張候選表/, 'tables'],
    [data.tables.reduce((total, table) => total + table.columns.length, 0),
      /(?:^|\D)(\d+)\s*欄/, 'columns'],
    [data.tables.reduce((total, table) => total + table.columns.filter((column) => column.fk).length, 0),
      /(?:^|\D)(\d+)\s*個候選單欄 FK/, 'FKs'],
  ];
  const summaries = [
    ['NoteCraft metadata', data.meta?.description ?? ''],
    ['inventory NoteCraft summary', inventoryMarkdown.split('\n')
      .find((line) => line.startsWith('**NoteCraft 規劃檢視**')) ?? ''],
  ];
  for (const [label, summary] of summaries) {
    for (const [actual, pattern, unit] of counts) {
      const stated = summary.match(pattern)?.[1];
      if (stated === undefined) errors.push(`${label}: missing ${unit} count`);
      else if (Number(stated) !== actual) errors.push(`${label}: ${unit} count ${stated} != ${actual}`);
    }
  }
  return errors;
}

async function main() {
  let source;
  let data;
  let inventory;
  try {
    source = mergeSchemaSources(
      parseAccountAdminSchema(await readFile(accountSourceUrl, 'utf8')),
      parseDatasetSchema(await readFile(datasetSourceUrl, 'utf8')),
      parseTaskRunSchema(await readFile(taskRunSourceUrl, 'utf8')),
      parseAnnotationReviewSchema(await readFile(annotationReviewSourceUrl, 'utf8')),
      parseTaskExportSchema(await readFile(taskExportSourceUrl, 'utf8')),
    );
    data = JSON.parse(await readFile(dataUrl, 'utf8'));
    inventory = await readFile(inventoryUrl, 'utf8');
  } catch (error) {
    console.error(`Cannot read database schema source or ER data: ${error.message}`);
    process.exitCode = 2;
    return;
  }
  const errors = [
    ...validateErData(source, data),
    ...validateSchemaSummary(data, inventory),
  ];
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }
  const columns = data.tables.reduce((count, table) => count + table.columns.length, 0);
  const fks = data.tables.reduce((count, table) => count + table.columns.filter((column) => column.fk).length, 0);
  console.log(`ER data matches source: ${data.tables.length} tables, ${columns} columns, ${fks} FKs`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
