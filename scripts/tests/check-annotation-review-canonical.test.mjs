import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const annotation = read('../../specs/annotation/015-annotation-workspace/spec.md');
const task = read('../../specs/task-management/014-task-detail/spec.md');

const liveRequirements = (source) => {
  const requirements = source.match(/^### 功能需求\n([\s\S]*?)(?=^### |^## )/m)?.[1];
  assert.ok(requirements, 'Expected a current functional requirements section');
  return requirements;
};

const requirement = (source, id) => {
  const block = liveRequirements(source).match(
    new RegExp(`^- \\*\\*${id}\\*\\*[^\\n]*(?:\\n(?!- \\*\\*FR-|###? ).*)*`, 'm'),
  )?.[0];
  assert.ok(block, `Expected current ${id} requirement`);
  return block;
};

const entity = (source, name) => {
  const entities = source.match(/^### 關鍵實體[^\n]*\n([\s\S]*?)(?=^### |^## )/m)?.[1];
  assert.ok(entities, 'Expected current key entities section');
  const row = entities.split('\n').find((line) => line.startsWith(`- **${name}**:`));
  assert.ok(row, `Expected current ${name} entity`);
  return row;
};

test('live dispute and arbitration count clauses use the offset-based span key', () => {
  const diff = requirement(annotation, 'FR-052');
  const dispute = requirement(annotation, 'FR-059');
  const count = requirement(annotation, 'FR-061');
  assert.match(diff, /sequence_tagging[\s\S]*?start\s*\+\s*end\s*\+\s*label/);

  for (const [id, text] of [['FR-059', dispute], ['FR-061', count]]) {
    assert.match(text, /sequence_tagging[^\n]*?(?:start\s*[,，+]\s*end\s*[,，+]\s*label|\(start,\s*end,\s*label\))/,
      `${id} must identify a span by its start, end and label`);
    assert.doesNotMatch(text, /sequence_tagging[^\n]*?逐\s*token\s*位置/,
      `${id} must not use the obsolete token position key`);
  }
});

test('live OutputAnswer sequence payload uses spans and snap_unit', () => {
  const answer = entity(annotation, 'OutputAnswer');
  const sequence = answer.match(/`sequence_tagging`[^；。]*/)?.[0];
  assert.ok(sequence, 'Expected the sequence_tagging payload');
  assert.match(sequence, /spans/);
  assert.match(sequence, /start/);
  assert.match(sequence, /end/);
  assert.match(sequence, /label/);
  assert.match(sequence, /snap_unit/);
  assert.doesNotMatch(sequence, /\b(?:tokens|tags|scheme|unit):/,
    'The live sequence payload must not advertise token-era fields');
});

test('review submission freezes its annotator source in both run types', () => {
  const source = [requirement(annotation, 'FR-051'), requirement(annotation, 'FR-101')].join('\n');
  assert.match(source, /(?:審核員|reviewer)[^\n]*?(?:首次|第一)[^\n]*?提交/,
    'The first reviewer submission must be the freeze point');
  assert.match(source, /(?:標記員|annotator)[^\n]*?(?:不可|不得|禁止)[^\n]*?(?:寫入|儲存|提交|修改)/,
    'The annotator must lose write access after review submission');
  assert.match(source, /dry_run[^\n]*?official_run|official_run[^\n]*?dry_run|兩種\s*`?run_type`?/,
    'The source freeze must cover Dry and Official runs');
});

test('a submitted review can change only before arbitration begins', () => {
  const review = requirement(annotation, 'FR-103');
  assert.match(review, /(?:仲裁票|投票|votes\[\])[^\n]*?(?:後|已)[^\n]*?(?:不得|不可|禁止|拒絕|唯讀)|(?:已|任一)[^\n]*?(?:仲裁票|投票|votes\[\])[^\n]*?(?:不得|不可|禁止|拒絕|唯讀)/,
    'A vote must freeze the reviewer decision');
  assert.doesNotMatch(review, /不判定、亦不阻擋爭議項是否已有仲裁者/,
    'The previous explicit exception must be removed from the live rule');
});

test('V1 arbitration has one immutable vote per dispute key', () => {
  const arbitration = [requirement(annotation, 'FR-061'), requirement(annotation, 'FR-065')].join('\n');
  assert.match(arbitration, /(?:同一|全部)[^\n]*?(?:batch|批次)[^\n]*?(?:一次|原子|全部)|(?:同一|全部)[^\n]*?爭議項[^\n]*?(?:batch|批次)/,
    'The unit should submit all dispute decisions in one batch');
  assert.match(arbitration, /(?:每|同一)[^\n]*?爭議項[^\n]*?(?:至多一票|一票|一次|唯一)/,
    'Each dispute key must have at most one vote');
  assert.match(arbitration, /(?:不得|不可|禁止|拒絕)[^\n]*?(?:重投|改票|覆寫)/,
    'A different second vote must be rejected');
  assert.doesNotMatch(requirement(annotation, 'FR-065'), /覆寫、不新增|改票才可能發生|idempotent PUT/,
    'The old overwrite contract cannot remain live');
});

test('reassignment keeps the old unsent draft private and starts a clean successor', () => {
  const taskRules = [
    requirement(task, 'FR-005f'),
    requirement(task, 'FR-005l'),
    requirement(task, 'FR-010f-4'),
  ].join('\n');
  const annotationRules = [
    requirement(annotation, 'FR-014S'),
    entity(annotation, 'AnnotationRecord'),
  ].join('\n');

  assert.match(taskRules, /(?:草稿|未提交)[^\n]*?(?:保留|abandoned|封存|廢棄)/,
    'Reassignment must retain the previous draft in a non-active state');
  assert.match(taskRules, /(?:新受派者|繼任者|重新指派)[^\n]*?(?:不可|不得|禁止)[^\n]*?(?:看|讀|還原|取得)[^\n]*?草稿/,
    'A successor must not read the previous assignee draft');
  assert.match(annotationRules, /abandoned/,
    'The annotation record must distinguish an abandoned draft from an active one');
  assert.match(annotationRules, /(?:新受派者|繼任者|重新指派)[^\n]*?(?:空|新)[^\n]*?(?:草稿|紀錄|記錄)/,
    'A successor must begin with an empty annotation record');
});
