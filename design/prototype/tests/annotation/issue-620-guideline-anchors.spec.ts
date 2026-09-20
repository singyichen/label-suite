import { test, expect } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, patchDataFile } from './_workspace-helpers';

/* Traceability: specs/annotation/015-annotation-workspace/spec.md
 *   FR-096, FR-020D, AC-5.3, SC-005D
 *
 * Issue #620, group 1 (PR-620-A) of openspec/changes/guideline-section-anchors:
 * FR-096's 4th clause requires the reason text shown in dry-run feedback to
 * carry a clickable jump to the cited guideline section, but renderMarkdown()
 * (FR-020D) currently emits <h1>-<h3> for '#'-'###' headings with no `id`
 * attribute at all -- there is no anchor to jump to. This group only pins
 * that anchors EXIST, are stable across repeated renders, and stay unique
 * when heading text repeats within one guideline. It does NOT cover citation
 * token parsing or jump navigation -- that is group 2
 * (issue-620-guideline-citation-jump.spec.ts), gated on this group merging
 * first because there is nothing to point at until anchors exist.
 *
 * These tests deliberately do not assert the anchor id's concrete string
 * shape (no slug-format assumption): FR-096/FR-020D only require an id
 * derived from the heading text that is stable and unique per guideline, not
 * a specific derivation algorithm. Only property-based assertions are used:
 * non-empty, equal across repeated renders / entry points, distinct for
 * duplicate heading text.
 *
 * The duplicate-heading fixture below is injected at runtime via
 * patchDataFile rather than reused from the group-1 seed task (1.4, still
 * pending) -- a Red contract that reads fixture data a later Green task will
 * introduce would pass vacuously once that task lands, regardless of whether
 * this renderer change actually works.
 */

const mdItem = (page: import('@playwright/test').Page) =>
  page.getByTestId('ws-guideline-file-item').filter({ hasText: '.md' });

function headingIds(locator: import('@playwright/test').Locator) {
  return locator.locator('h1, h2, h3').evaluateAll((els) => els.map((el) => el.id));
}

test('every rendered heading carries a non-empty anchor id', async ({ page }) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);
  await mdItem(page).click();

  const body = page.getByTestId('ws-guideline-md-modal-body');
  await expect(body.locator('h1')).toHaveText('常見問題');

  const ids = await headingIds(body);
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    expect(id).toBeTruthy();
  }
});

test('the same unchanged guideline yields the same anchor id when reopened and after a page reload', async ({
  page,
}) => {
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);

  const body = page.getByTestId('ws-guideline-md-modal-body');

  await mdItem(page).click();
  const [firstOpenId] = await headingIds(body);
  expect(firstOpenId).toBeTruthy();

  await page.getByTestId('ws-guideline-md-modal-close').click();
  await mdItem(page).click();
  const [reopenId] = await headingIds(body);
  expect(reopenId).toBe(firstOpenId);

  await page.reload();
  await dismissGuidelineModal(page);
  await mdItem(page).click();
  const [reloadId] = await headingIds(body);
  expect(reloadId).toBe(firstOpenId);
});

test('the same guideline source yields the same anchor id across both rendering entry points', async ({
  page,
}) => {
  // No seed sets forceShowGuideline; stub it at runtime like the FR-020D
  // preview spec does, so the first-visit gate (#wsGuidelineModalBody) and
  // the file-click modal (#wsGuidelineMdModalBody) both render the same
  // Markdown source through renderMarkdown() and can be compared directly.
  await patchDataFile(
    page,
    'task-detail.data.js',
    `window.LabelSuiteTaskDetailData.profiles.T001.forceShowGuideline = true;`
  );
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));

  const gateBody = page.getByTestId('ws-guideline-modal-body');
  await expect(gateBody.locator('h1')).toHaveText('常見問題');
  const [gateId] = await headingIds(gateBody);
  expect(gateId).toBeTruthy();

  await dismissGuidelineModal(page);
  await mdItem(page).click();
  const modalBody = page.getByTestId('ws-guideline-md-modal-body');
  const [modalId] = await headingIds(modalBody);
  expect(modalId).toBe(gateId);
});

test('two headings with identical text within one guideline get distinct, non-empty anchor ids', async ({
  page,
}) => {
  await patchDataFile(
    page,
    'task-detail.data.js',
    `window.LabelSuiteTaskDetailData.profiles.T001.guidelineFiles = [{
      name: 'issue-620-dup-headings.md',
      type: 'markdown',
      content: '# 重複段落標題\\n\\n第一段落內容。\\n\\n# 重複段落標題\\n\\n第二段落內容。'
    }];`
  );
  await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
  await dismissGuidelineModal(page);
  await mdItem(page).click();

  const body = page.getByTestId('ws-guideline-md-modal-body');
  await expect(body.locator('h1')).toHaveCount(2);

  const ids = await headingIds(body);
  expect(ids).toHaveLength(2);
  for (const id of ids) {
    expect(id).toBeTruthy();
  }
  expect(ids[0]).not.toBe(ids[1]);
});
