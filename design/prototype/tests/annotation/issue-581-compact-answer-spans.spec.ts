import { test, expect } from '@playwright/test';
import {
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  selectWorkspaceText,
  skipGuidelineModal,
} from './_workspace-helpers';

/* sequence_tagging's persisted payload and CompactAnswer become span-shaped
 * (issue #581, OpenSpec change seq-tagging-span-workspace group 2).
 *
 * Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-024A-3 (submitted payload), FR-035 (CompactAnswer round-trip),
 *   FR-052 (offsets are authoritative, never re-derived from text)
 *
 * FR-024A-3 names four payload keys: spans[], snap_unit, bypass, version.
 * The prototype owns the first three -- spans and snap_unit inside
 * previewState.sequence_tagging, bypass inside previewBypass -- but has no
 * schema-version concept anywhere in its store (nothing in
 * annotation-workspace.data.js ever writes one), so `version` is a
 * backend-envelope field with no prototype surface to assert and is out of
 * scope here. The removal half of the requirement is entirely the
 * prototype's own, and is what this spec pins hardest.
 */

const SUBMISSION_PREFIX = 'labelsuite.wsSubmissions.';

/* The store is keyed task::role::run_type::identity::-, and the identity
 * segment comes from the default roster rather than the URL, so the spec
 * scans by prefix instead of hardcoding a name it does not control. */
async function readT006Payload(page: import('@playwright/test').Page) {
  return page.evaluate((prefix) => {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || key.indexOf(prefix) !== 0 || key.indexOf('T006') < 0) continue;
      const bucket = JSON.parse(window.localStorage.getItem(key) || '{}');
      /* Each bucket entry is {status, answers, ...}; the OutputAnswer
         payload collectAnswerPayload() builds is the `answers` half. */
      const record = bucket['sequence-tagging-001'];
      if (record && record.answers) return record.answers;
    }
    return null;
  }, SUBMISSION_PREFIX);
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test('the submitted payload carries spans and snap_unit, not tokens, tags, scheme or unit', async ({
  page,
}) => {
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.T006.datasetRecords.forEach(function (r) { r.spans = []; });
  `);
  await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
  await dismissGuidelineModal(page);

  await selectWorkspaceText(page, 'ws-input-content', '台積電');
  await page.getByTestId('ws-seq-label-btn-ORG').click();
  await selectWorkspaceText(page, 'ws-input-content', '台北');
  await page.getByTestId('ws-seq-label-btn-LOC').click();
  await page.getByTestId('ws-submit-btn').click();
  await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');

  const payload = await readT006Payload(page);
  expect(payload).not.toBeNull();
  const answer = (payload as Record<string, Record<string, Record<string, unknown>>>).previewState
    .sequence_tagging;

  expect(answer.spans).toEqual([
    { start: 0, end: 3, label: 'ORG' },
    { start: 13, end: 15, label: 'LOC' },
  ]);
  expect(answer.snap_unit).toBe('character');
  expect(Object.keys(answer)).not.toContain('tokens');
  expect(Object.keys(answer)).not.toContain('tags');
  expect(Object.keys(answer)).not.toContain('scheme');
  expect(Object.keys(answer)).not.toContain('unit');
  expect(Object.keys(answer)).not.toContain('tokenKey');

  /* The bypass half of FR-024A-3's key list lives one level up, beside the
     answer rather than inside it, and the prototype records a type only
     once its flag is set -- so an ordinary answer carries a falsy flag,
     and the set case is pinned by the bypass round-trip below. */
  const bypass = (payload as Record<string, Record<string, unknown>>).previewBypass;
  expect(bypass.sequence_tagging).toBeFalsy();

  /* No BIO prefix may survive anywhere in the payload. */
  expect(JSON.stringify(payload)).not.toMatch(/"[BIES]-/);
});

test('a repeated span text is restored to its own offset, not to the first match', async ({
  page,
}) => {
  /* 台 occurs at offset 0 (inside 台積電) and again at offset 13 (inside
     台北). The retired reconstruction walked the token list left to right
     consuming pairs by text, so a CompactAnswer whose first entry is the
     LATER occurrence landed on the earlier one. Offsets are authoritative
     (FR-052), so order in the array must not move a span. */
  await patchDataFile(page, 'annotation-workspace.data.js', `
    var data = window.LabelSuiteAnnotationWorkspaceData;
    data.REVIEWER_MOCK_ROWS.T006['sequence-tagging-001'] = [{
      annotator: 'kioleemg12',
      answers: { sequence_tagging: [
        { text: '台北', label: 'LOC', start: 13, end: 15 },
        { text: '台積電', label: 'ORG', start: 0, end: 3 }
      ] },
    }];
  `);
  await page.goto(
    buildWorkspaceUrl({
      task_id: 'T006',
      sample_id: 'sequence-tagging-001',
      role: 'reviewer',
      annotator_id: 'kioleemg12',
    })
  );
  await dismissGuidelineModal(page);

  const spans = await page.evaluate(() => {
    const ps = window.state?.previewState as
      | Record<string, { spans?: Array<{ start: number; end: number; label: string }> }>
      | undefined;
    return ps?.sequence_tagging?.spans ?? [];
  });

  expect(spans).toEqual(
    expect.arrayContaining([
      { start: 13, end: 15, label: 'LOC' },
      { start: 0, end: 3, label: 'ORG' },
    ])
  );
  expect(spans).toHaveLength(2);
});

test('bypassing the type records the flag beside an emptied span list', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T006', sample_id: 'sequence-tagging-001' }));
  await dismissGuidelineModal(page);

  await page.getByTestId('ws-bypass-sequence_tagging').check();
  await page.getByTestId('ws-submit-btn').click();
  await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');

  const payload = await readT006Payload(page);
  const bypass = (payload as Record<string, Record<string, unknown>>).previewBypass;
  expect(bypass.sequence_tagging).toBe(true);

  const answer = (payload as Record<string, Record<string, Record<string, unknown>>>).previewState
    .sequence_tagging;
  expect(answer.spans).toEqual([]);
});
