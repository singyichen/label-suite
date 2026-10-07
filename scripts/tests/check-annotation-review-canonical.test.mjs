import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const annotation = read('../../specs/annotation/015-annotation-workspace/spec.md');
const task = read('../../specs/task-management/014-task-detail/spec.md');
const openChange = '../../openspec/changes/annotation-review-physical-contract';
const archivedChange = '../../openspec/changes/archive/2026-10-07-annotation-review-physical-contract';
const change = existsSync(new URL(`${openChange}/.openspec.yaml`, import.meta.url)) ? openChange : archivedChange;
const annotationDelta = read(`${change}/specs/annotation/015-annotation-workspace/spec.md`);
const taskDelta = read(`${change}/specs/task-management/014-task-detail/spec.md`);

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

test('live task AC-3.47 accepts draft reassignment without revealing or restoring the old draft', () => {
  const delta = taskDelta.match(/^### Requirement: AC-3\.47[^\n]*\n([\s\S]*?)(?=^### Requirement:|^## |(?![\s\S]))/m)?.[1];
  assert.ok(delta, 'Expected the OpenSpec AC-3.47 requirement');
  assert.match(delta, /- \*\*GIVEN\*\*[^\n]*未提交草稿/);
  assert.match(delta, /- \*\*WHEN\*\*[^\n]*(?:停用|移除|重派)/);
  assert.match(delta, /- \*\*THEN\*\*[^\n]*abandoned[^\n]*(?:繼任者|新受派者)/);

  const acceptance = task.match(/^### 使用者故事 3[^\n]*\n[\s\S]*?^\*\*驗收情境\*\*：\n([\s\S]*?)(?=^\*\*行為規則\*\*：)/m)?.[1];
  assert.ok(acceptance, 'Expected the current task-management User Story 3 acceptance list');
  const line = acceptance.split('\n').find((value) => /^47\.\s+\*\*AC-3\.47\*\*/.test(value));
  assert.ok(line, 'Expected a numbered current AC-3.47 acceptance line');
  const parts = line.match(/\*\*Given\*\*([^\n]*?)\*\*When\*\*([^\n]*?)\*\*Then\*\*([^\n]*)/);
  assert.ok(parts, 'AC-3.47 must state Given, When and Then');
  assert.match(parts[1], /(?:未提交[^\n]*?草稿|草稿[^\n]*?未提交)/,
    'Given must identify an unsent draft');
  assert.match(parts[2], /(?:停用|移除|重派)/,
    'When must identify membership loss or reassignment');
  assert.match(parts[3], /abandoned/,
    'Then must retire the old draft');
  assert.match(parts[3], /(?:繼任者|新受派者)[^\n]*?(?:空白|空紀錄|看不到|不可|不得|無法)/,
    'Then must keep the successor separate from the previous draft');
  assert.match(parts[3], /已提交[^\n]*?(?:保留|不變)|(?:保留|不變)[^\n]*?已提交/,
    'Then must preserve submitted history');
});

test('live FR-105 names the transaction and privacy contract', () => {
  const writeContract = requirement(annotation, 'FR-105');
  assert.match(writeContract, /(?:config|釘住)[\s\S]*?(?:OutputAnswer|outKey)|(?:OutputAnswer|outKey)[\s\S]*?(?:config|驗證)/,
    'The answer and review payload must be validated against pinned configuration');
  assert.match(writeContract, /(?:revision|版本)[\s\S]*?(?:凍結|不可變|衝突)/,
    'Submission and arbitration must protect immutable source revisions');
  assert.match(writeContract, /(?:active membership|有效成員)[\s\S]*?(?:task role|任務角色|assignment|指派)/,
    'Every write must validate current membership and task authority');
  assert.match(writeContract, /(?:dataset_item_private|gold\/test|隱藏答案)[\s\S]*?(?:不讀|不外洩|不得揭露)|(?:不讀|不外洩|不得揭露)[\s\S]*?(?:dataset_item_private|gold\/test|隱藏答案)/,
    'Ordinary paths must protect hidden answers and private dataset fields');
});

const acceptanceCases = [
  {
    id: 'AC-7.4',
    given: /(?:offset|位移)[^\n]*?(?:不同|相同)|(?:不同|相同)[^\n]*?(?:offset|位移)/,
    when: /(?:推導|比對)[^\n]*?(?:鍵|差異)|(?:鍵|差異)[^\n]*?(?:推導|比對)/,
    then: /(?:不合併|不碰撞|獨立)[^\n]*?(?:label|標籤|新增|移除)|(?:label|標籤|新增|移除)[^\n]*?(?:不合併|不碰撞|獨立)/,
    summary: /(?:offset|位移)[\s\S]*?(?:label|標籤)|(?:label|標籤)[\s\S]*?(?:offset|位移)/,
  },
  {
    id: 'AC-7.5',
    given: /(?:annotator|reviewer|標記員|審核員)[^\n]*?(?:同時|競爭|並發)|(?:同時|競爭|並發)[^\n]*?(?:annotator|reviewer|標記員|審核員)/,
    when: /(?:交易|提交|寫入|commit)/,
    then: /(?:版本|衝突|revision|凍結)[^\n]*?(?:票|來源|提交)|(?:票|來源|提交)[^\n]*?(?:版本|衝突|revision|凍結)/,
    summary: /(?:競爭|並發)[\s\S]*?(?:版本|revision|凍結|衝突)/,
  },
  {
    id: 'AC-7.6',
    given: /(?:全部|多個)[^\n]*?(?:爭議|鍵|key)|(?:爭議|鍵|key)[^\n]*?(?:全部|多個)/,
    when: /(?:batch|批次)[^\n]*?(?:提交|重送|retry)|(?:提交|重送|retry)[^\n]*?(?:batch|批次)/,
    then: /(?:一票|唯一|一次)[^\n]*?(?:部分|冪等|原子|拒絕)|(?:部分|冪等|原子|拒絕)[^\n]*?(?:一票|唯一|一次)/,
    summary: /(?:batch|批次)[\s\S]*?(?:冪等|部分|重送|一票|原子)/,
  },
  {
    id: 'AC-7.7',
    given: /(?:reject|駁回)[^\n]*?(?:票|vote)|(?:票|vote)[^\n]*?(?:reject|駁回)/,
    when: /(?:處置|resolution)[^\n]*?(?:重送|再次|retry)|(?:重送|再次|retry)[^\n]*?(?:處置|resolution)/,
    then: /(?:同內容|相同|冪等)[^\n]*?(?:異內容|不同|衝突|拒絕)[^\n]*?(?:公開|保留|不刪)/,
    summary: /(?:reject|駁回)[\s\S]*?(?:resolution|重送|排除|公開|保留)/,
  },
  {
    id: 'AC-7.8',
    given: /(?:前任|原|舊)[^\n]*?(?:草稿|draft)|(?:草稿|draft)[^\n]*?(?:前任|原|舊)/,
    when: /(?:失權|重派|候選|停用)/,
    then: /(?:繼任|新任|新受派|他人)[^\n]*?(?:看不到|不可|不得|拒絕|不[^\n]*?讀)[^\n]*?(?:還原|恢復|自動)/,
    summary: /(?:草稿|draft)[\s\S]*?(?:繼任|新受派|前任)[\s\S]*?(?:還原|恢復|私有|隱私|不可讀)/,
  },
];

test('live AC-7.4 through AC-7.8 contain case-specific Given/When/Then acceptance lines', () => {
  const currentCases = annotation.match(/^## run／assignment 身分驗收情境[^\n]*\n([\s\S]*?)(?=^## )/m)?.[1];
  assert.ok(currentCases, 'Expected the current run and assignment acceptance section');

  for (const { id, given, when, then } of acceptanceCases) {
    const line = currentCases.split('\n').find((value) => value.startsWith(`- **${id}**：`) || value.startsWith(`- **${id}**:`));
    assert.ok(line, `Expected a current ${id} acceptance line`);
    const parts = line.match(/^-[^\n]*?\*\*Given\*\*([^\n]*?)\*\*When\*\*([^\n]*?)\*\*Then\*\*([^\n]*)$/);
    assert.ok(parts, `${id} must state Given, When and Then on its current acceptance line`);
    assert.match(parts[1], given, `${id} Given must identify the case's starting state`);
    assert.match(parts[2], when, `${id} When must identify the case's operation`);
    assert.match(parts[3], then, `${id} Then must identify the case's expected result`);
  }
});

test('OpenSpec AC-7.4 through AC-7.8 define concrete requirements and distinct scenarios', () => {
  for (const { id, given, when, then, summary } of acceptanceCases) {
    const escapedId = id.replace('.', '\\.');
    const block = annotationDelta.match(new RegExp(`^### Requirement: ${escapedId}[^\\n]*\\n([\\s\\S]*?)(?=^### Requirement:|^## |(?![\\s\\S]))`, 'm'))?.[1];
    assert.ok(block, `Expected OpenSpec ${id} requirement`);
    const [description, scenario] = block.split(/^#### Scenario:/m);
    assert.ok(scenario, `Expected OpenSpec ${id} scenario`);
    assert.match(description, summary, `${id} requirement must describe its concrete rule, beyond a shared identity qualifier`);

    for (const [step, expected] of [['GIVEN', given], ['WHEN', when], ['THEN', then]]) {
      const line = scenario.split('\n').find((value) => value.startsWith(`- **${step}**`));
      assert.ok(line, `Expected OpenSpec ${id} ${step} step`);
      assert.match(line, expected, `${id} ${step} must describe the case-specific condition or outcome`);
    }
  }
});
