import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourceUrl = new URL('../docs/diagrams/architecture/account-admin-db-schema.md', import.meta.url);
const dataUrl = new URL('../docs/diagrams/architecture/database-schema.er.json', import.meta.url);

export function parseAccountAdminSchema(markdown) {
  const mermaid = markdown.match(/## 2\. ERD\s*\n[\s\S]*?```mermaid\s*\n([\s\S]*?)\n```/)?.[1];
  const dictionary = markdown.match(/## 3\. 欄位字典\s*\n([\s\S]*?)(?=\n## 4\.|$)/)?.[1];
  if (!mermaid || !dictionary) {
    throw new Error('Source must contain §2 Mermaid ERD and §3 column dictionary');
  }

  const primaryKeys = new Map();
  for (const match of mermaid.matchAll(/^\s{4}([A-Za-z_]\w*)\s*\{\s*\n([\s\S]*?)^\s{4}\}/gm)) {
    const keys = new Set();
    for (const line of match[2].split('\n')) {
      const column = line.match(/^\s+\S+\s+([A-Za-z_]\w*)\s+(.+)$/);
      if (column && /\bPK\b/.test(column[2])) keys.add(column[1]);
    }
    primaryKeys.set(match[1], keys);
  }

  const tables = [];
  for (const match of dictionary.matchAll(/^### 3\.\d+\s+([A-Za-z_]\w*)[^\n]*\n([\s\S]*?)(?=^### 3\.\d+\s+|(?![\s\S]))/gm)) {
    const name = match[1];
    const keys = primaryKeys.get(name);
    if (!keys) throw new Error(`Missing Mermaid table: ${name}`);
    const columns = [];
    for (const line of match[2].split('\n')) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      const columnName = cells[0]?.match(/^`([A-Za-z_]\w*)`$/)?.[1];
      if (!columnName) continue;
      if (cells.length !== 6) throw new Error(`Invalid dictionary row: ${name}.${columnName}`);
      const nullableText = cells[2].replace(/\*/g, '');
      if (!/^(是|否)/.test(nullableText)) throw new Error(`Unknown nullability: ${name}.${columnName}`);
      const typeMatch = cells[1].match(/^(.+?)(?:\s*→\s*([A-Za-z_]\w*))?$/);
      if (!typeMatch) throw new Error(`Invalid type: ${name}.${columnName}`);
      columns.push({
        name: columnName,
        type: typeMatch[1].trim(),
        nullable: nullableText.startsWith('是'),
        pk: keys.has(columnName),
        ...(typeMatch[2] ? { fk: typeMatch[2] } : {}),
      });
    }
    if (columns.length === 0) throw new Error(`No dictionary columns: ${name}`);
    tables.push({ name, columns });
  }
  if (tables.length === 0) throw new Error('No §3 dictionary tables found');
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
    if (table && !/D-9/.test(table.description ?? '')) {
      errors.push(`${name}: D-9 conditional table status must be explicit`);
    }
  }
  return errors;
}

async function main() {
  let source;
  let data;
  try {
    source = parseAccountAdminSchema(await readFile(sourceUrl, 'utf8'));
    data = JSON.parse(await readFile(dataUrl, 'utf8'));
  } catch (error) {
    console.error(`Cannot read database schema source or ER data: ${error.message}`);
    process.exitCode = 2;
    return;
  }
  const errors = validateErData(source, data);
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
