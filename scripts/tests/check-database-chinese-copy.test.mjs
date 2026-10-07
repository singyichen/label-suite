import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const diagram = JSON.parse(readFileSync(
  new URL('../../docs/diagrams/architecture/database-schema.er.json', import.meta.url),
  'utf8',
));
const inventory = readFileSync(
  new URL('../../docs/diagrams/architecture/database-table-inventory.md', import.meta.url),
  'utf8',
);

const visibleCopy = [
  ['meta.title', diagram.meta.title],
  ['meta.description', diagram.meta.description],
  ['options.hint', diagram.options.hint],
  ['options.searchPlaceholder', diagram.options.searchPlaceholder],
  ...diagram.requirement.flatMap((item) => [
    [`requirement.${item.key}.label`, item.label],
    ...(item.title ? [[`requirement.${item.key}.title`, item.title]] : []),
  ]),
  ...diagram.flags.map((flag) => [`flags.${flag.key}.label`, flag.label]),
  ...diagram.groups.flatMap((group) => [
    [`groups.${group.key}.label`, group.label],
    [`groups.${group.key}.description`, group.description],
  ]),
  ...diagram.tables.flatMap((table) => [
    [`tables.${table.name}.label`, table.label],
    [`tables.${table.name}.description`, table.description],
    ...table.columns.map((column) => [
      `tables.${table.name}.columns.${column.name}.note`, column.note,
    ]),
  ]),
];

const bareJargon = /\b(?:run|dry|official|draft|cycle|round|snapshot|item|slot|reviewer|annotator|membership|config|schema|seed|migration)\b/gi;
const explanatoryCopy = (value) => value
  .replace(/`[^`]*`/g, '')
  .replace(/\]\([^)]*\)/g, ']')
  .replace(/\b[a-z]+(?:\/[a-z]+)+\b/gi, '');

test('NoteCraft ER headings and descriptions explain workflow concepts in Chinese', () => {
  const issues = visibleCopy.flatMap(([path, value]) => {
    if (typeof value !== 'string' || !/[\u3400-\u9fff]/u.test(value)) {
      return [`${path}: missing Chinese explanation`];
    }
    const matches = [...explanatoryCopy(value).matchAll(bareJargon)]
      .map((match) => match[0].toLowerCase());
    return matches.length ? [`${path}: ${[...new Set(matches)].join(', ')}`] : [];
  });

  if (issues.length) {
    assert.fail(`${issues.length} visible NoteCraft fields need Chinese copy:\n${issues.join('\n')}`);
  }
});

test('database table inventory defines run, cycle, and trial round for Chinese readers', () => {
  const glossary = inventory.match(/^##\s+[^\n]*(?:名詞|術語|詞彙)[^\n]*\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/m)?.[1];
  assert.ok(glossary, 'Missing a Chinese terminology section in database-table-inventory.md');

  for (const [term, meaning] of [
    ['run', /發布/u],
    ['cycle', /版本|輪次/u],
    ['trial round', /試|演練|回合/u],
  ]) {
    const entry = glossary.split('\n').find((line) =>
      line.includes(`\`${term}\``) && meaning.test(line));
    assert.ok(entry, `Missing a Chinese definition for ${term}`);
  }
});
