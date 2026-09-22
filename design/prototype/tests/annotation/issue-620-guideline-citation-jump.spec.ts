import { test, expect } from '@playwright/test';
import { buildListUrl, patchDataFile } from './_workspace-helpers';

/* Traceability: openspec/changes/guideline-section-anchors/specs/annotation/
 * 015-annotation-workspace/spec.md — FR-096 point 4, issue #620 group 2.
 *
 * A feedback reason may cite a guideline heading as [[heading text]]. A
 * resolvable citation becomes a same-tab workspace link whose fragment is the
 * heading anchor; the workspace opens that Markdown file, scrolls to the
 * heading, and visibly marks it. An unknown heading loses only the citation
 * syntax: its title and the surrounding reason remain plain text.
 */

const TASK_ID = 'T002';
const SAMPLE_ID = 'emo-001';
const ANNOTATOR_ID = 'kioleemg12';
const REVIEWER_ID = 'reviewer_wang';
const ARBITER_ID = 'reviewer_chen';
const HEADING = '情緒詞判讀原則';

function patchGuideline(heading = HEADING): string {
  return `
    window.LabelSuiteTaskDetailData.profiles[${JSON.stringify(TASK_ID)}].guidelineFiles = [{
      name: 'issue-620-citation.md',
      type: 'markdown',
      content: '# ${heading}\\n\\n本段落說明如何判讀情緒詞。'
    }];
  `;
}

function seedAdjudicatedFeedback(reason: string): string {
  return `
    (function () {
      var data = window.LabelSuiteAnnotationWorkspaceData;
      var identity = {
        annotatorId: ${JSON.stringify(ANNOTATOR_ID)},
        reviewerId: ${JSON.stringify(REVIEWER_ID)}
      };
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'annotator', 'dry_run', ${JSON.stringify(SAMPLE_ID)},
        { previewState: { multi_label: { selected: ['sad', 'fear'] } } }, '', identity);
      data.markSampleSubmitted(${JSON.stringify(TASK_ID)}, 'reviewer', 'dry_run', ${JSON.stringify(SAMPLE_ID)},
        {
          previewState: { multi_label: { selected: ['sad', 'angry'] } },
          decisions: { multi_label: 'modify' },
          reasons: { multi_label: '審核修正理由' }
        }, '', identity);

      var items = data.getDisputeItems(
        ${JSON.stringify(TASK_ID)}, 'dry_run', ${JSON.stringify(SAMPLE_ID)}, identity, ['multi_label']
      );
      if (!items.length) throw new Error('issue #620 fixture expected dispute items');
      data.submitArbitration(
        ${JSON.stringify(TASK_ID)},
        'dry_run',
        ${JSON.stringify(SAMPLE_ID)},
        { annotatorId: ${JSON.stringify(ANNOTATOR_ID)}, reviewerId: ${JSON.stringify(ARBITER_ID)} },
        items.map(function (item) {
          return {
            itemId: item.outKey + '::' + item.key,
            choice: 'adopt_b',
            value: item.reviewerValues[${JSON.stringify(REVIEWER_ID)}],
            reason: ${JSON.stringify(reason)}
          };
        })
      );
    })();
  `;
}

async function openFeedback(page: import('@playwright/test').Page, reason: string) {
  await patchDataFile(page, 'task-detail.data.js', patchGuideline());
  await patchDataFile(page, 'annotation-workspace.data.js', seedAdjudicatedFeedback(reason));
  await page.goto(buildListUrl({
    task_id: TASK_ID,
    run_type: 'dry_run',
    annotator_id: ANNOTATOR_ID,
  }));
  return page.getByTestId('ws-dry-run-feedback-row').first();
}

test('a resolvable [[heading]] citation becomes a workspace link with the matching anchor', async ({ page }) => {
  const row = await openFeedback(page, `依據 [[${HEADING}]]，此處應改標為 angry。`);
  const reason = row.getByTestId('ws-dry-run-feedback-reason');
  const link = reason.getByTestId('ws-dry-run-feedback-guideline-link');

  await expect(reason).toHaveText(`依據 ${HEADING}，此處應改標為 angry。`);
  await expect(link).toHaveText(HEADING);
  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();
  const target = new URL(href!, page.url());
  expect(target.pathname).toContain('/pages/annotation/annotation-workspace.html');
  expect(decodeURIComponent(target.hash.slice(1))).toBe(HEADING);
});

test('clicking a citation opens its guideline and visibly marks the target heading', async ({ page }) => {
  const row = await openFeedback(page, `請依 [[${HEADING}]] 重新判讀。`);
  const link = row.getByTestId('ws-dry-run-feedback-reason').getByTestId('ws-dry-run-feedback-guideline-link');

  await Promise.all([
    page.waitForURL((url) => decodeURIComponent(url.hash.slice(1)) === HEADING, { timeout: 3000 }),
    link.click(),
  ]);

  const modal = page.getByTestId('ws-guideline-md-modal');
  await expect(modal).toBeVisible();
  const heading = modal.locator('h1').filter({ hasText: HEADING });
  await expect(heading).toHaveAttribute('data-guideline-anchor-target', 'true');
  await expect(heading).toBeFocused();
});

test('an unknown citation degrades to plain text without losing the surrounding reason', async ({ page }) => {
  const missing = '不存在的指南段落';
  const row = await openFeedback(page, `理由前文 [[${missing}]] 理由後文。`);
  const reason = row.getByTestId('ws-dry-run-feedback-reason');

  await expect(reason).toHaveText(`理由前文 ${missing} 理由後文。`);
  await expect(row.getByTestId('ws-dry-run-feedback-guideline-link')).toHaveCount(0);
});

test('an existing v2 review-flow seed is upgraded so citation reasons reach returning browsers', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('labelsuite.reviewFlowDemoSeed.v2', 'stale-v2-marker');
  });
  await page.goto(buildListUrl({
    task_id: 'T014',
    run_type: 'dry_run',
    annotator_id: '113450022',
  }));

  const result = await page.evaluate(() => {
    const data = (window as any).LabelSuiteAnnotationWorkspaceData;
    const history = data.getSampleHistory(
      'T014',
      'dry_run',
      'dry-04-dispute-resolved',
      { annotatorId: '113450022' }
    );
    return {
      reasons: history.map((event: { reason?: string }) => event.reason || ''),
      v2: window.localStorage.getItem('labelsuite.reviewFlowDemoSeed.v2'),
      v3: window.localStorage.getItem('labelsuite.reviewFlowDemoSeed.v3'),
    };
  });

  expect(result.reasons.some((reason: string) => reason.includes('[[負向（negative）的判準]]'))).toBe(true);
  expect(result.v2).toBeNull();
  expect(result.v3).toBeTruthy();
});
