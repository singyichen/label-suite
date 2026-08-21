import { test, expect, type Page } from '@playwright/test';
import { buildListUrl, buildWorkspaceUrl, patchDataFile, skipGuidelineModal } from './_workspace-helpers';

/* Per-task min_reviewers (spec 015, review-flow demo Phase 2).
 *
 * MIN_REVIEWERS_DEFAULT = 1 was a fixed value until now: both
 * getReviewUnitStatus() call sites (annotation-list row derivation and the
 * workspace's arbitration-layout gate) omitted opts.minReviewers. This file
 * pins the plumbing of a per-task `minReviewers` profile seed
 * (task-detail.data.js) through resolveTaskProfile into both call sites:
 * with min_reviewers = 2, ONE agreeing reviewer submission must read
 * approved (已同意) instead of finalized, and ONE changed submission must
 * read modified (已修改) instead of disputed -- which also means the
 * arbitration layout must NOT engage yet for an eligible arbiter. */

const TASK = 'T001';
const SAMPLE = 'sent-001';
const ANNOTATOR = 'kioleemg12';
const REVIEWER = 'reviewer_wang';
const ARBITER = 'reviewer_chen';

const labelPayload = (selected: string) => ({ previewState: { single_label: { selected } } });

function seed(
  page: Page,
  args: { role: string; payload: unknown; identity: { annotatorId?: string; reviewerId?: string } }
): Promise<void> {
  return page.evaluate((a) => {
    (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        markSampleSubmitted: (
          taskId: string, role: string, runType: string, sampleId: string,
          payload: unknown, historySummary: string,
          identity: { annotatorId?: string; reviewerId?: string }
        ) => void;
      };
    }).LabelSuiteAnnotationWorkspaceData.markSampleSubmitted(
      'T001', a.role, 'official_run', 'sent-001', a.payload, '', a.identity
    );
  }, args);
}

function patchMinReviewers(page: Page, value: number): Promise<void> {
  return patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.${TASK}.minReviewers = ${value};
  `);
}

function firstUnitRow(page: Page) {
  return page
    .getByTestId('ws-sample-item')
    .filter({ has: page.getByTestId('list-review-annotator').getByText(ANNOTATOR) })
    .first();
}

test.describe('minReviewers = 2: list badges honor the per-task threshold', () => {
  test.beforeEach(async ({ page }) => {
    await patchMinReviewers(page, 2);
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: 'official_run' }));
    await seed(page, { role: 'annotator', payload: labelPayload('positive'), identity: { annotatorId: ANNOTATOR } });
  });

  test('one agreeing reviewer -> 已同意, not 已定稿', async ({ page }) => {
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('positive'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    await page.reload();

    await expect(firstUnitRow(page).locator('.status-badge')).toHaveText('已同意');
  });

  test('one changed reviewer -> 已修改, not 爭議中', async ({ page }) => {
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('negative'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    await page.reload();

    await expect(firstUnitRow(page).locator('.status-badge')).toHaveText('已修改');
  });
});

test.describe('minReviewers = 2: workspace arbitration gate honors the threshold', () => {
  test('a modified (not yet disputed) unit keeps the normal review card for an arbiter', async ({ page }) => {
    await skipGuidelineModal(page);
    await patchMinReviewers(page, 2);
    await page.goto(buildWorkspaceUrl({
      task_id: TASK, sample_id: SAMPLE, role: 'reviewer', run_type: 'official_run',
      annotator_id: ANNOTATOR, reviewer_id: ARBITER,
    }));
    await seed(page, { role: 'annotator', payload: labelPayload('positive'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('negative'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    await page.reload();

    await expect(page.getByTestId('ws-arbitration-card')).toHaveCount(0);
    await expect(page.getByTestId('ws-review-row-approve').first()).toBeVisible();
  });
});

test.describe('minReviewers default stays 1 when the profile seed is absent', () => {
  test('one agreeing reviewer -> 已定稿', async ({ page }) => {
    await page.goto(buildListUrl({ task_id: TASK, role: 'reviewer', run_type: 'official_run' }));
    await seed(page, { role: 'annotator', payload: labelPayload('positive'), identity: { annotatorId: ANNOTATOR } });
    await seed(page, {
      role: 'reviewer',
      payload: labelPayload('positive'),
      identity: { annotatorId: ANNOTATOR, reviewerId: REVIEWER },
    });
    await page.reload();

    await expect(firstUnitRow(page).locator('.status-badge')).toHaveText('已定稿');
  });
});
