import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* w6-resilience-a11y.md CONT-03 (current-behavior boundary, not a Finding):
 * reviewer per-row decisions live in module-level vars
 * (reviewRowDecisions/reviewRowOriginals in annotation-workspace.config.js)
 * with NO markSampleSaved-equivalent persistence call -- unlike the
 * annotator draft path, which writes to a localStorage submission bucket.
 * These tests pin the ACTUAL asymmetry: an unsent decision is lost by a
 * full page reload, while an already-submitted review survives it.
 * Whether reviewer draft persistence should exist is a product decision
 * (phase-4 triage); this spec documents the status quo either way. */

const REVIEWER_URL = buildWorkspaceUrl({
  task_id: 'T001',
  sample_id: 'sent-001',
  role: 'reviewer',
  run_type: 'official_run',
});

async function readReviewerSubmittedEvents(page: Page): Promise<number> {
  return page.evaluate(() => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        getSampleHistory: (
          taskId: string,
          runType: string,
          sampleId: string,
          identity: Record<string, never>
        ) => Array<{ action: string; role: string }>;
      };
    }).LabelSuiteAnnotationWorkspaceData;
    return data
      .getSampleHistory('T001', 'official_run', 'sent-001', {})
      .filter((e) => e.role === 'reviewer' && e.action === 'submitted').length;
  });
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
});

test.describe('Reviewer per-row decisions are not persisted before submit (CONT-03)', () => {
  test('an unsent row decision is lost by a full page reload (current behavior)', async ({ page }) => {
    await page.goto(REVIEWER_URL);
    await dismissGuidelineModal(page);

    const approveBtn = page.getByTestId('ws-review-row-approve');
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await dismissGuidelineModal(page);

    // Memory-only state: the decision does not survive the reload.
    await expect(page.getByTestId('ws-review-row-approve')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a submitted review is unaffected by a later reload', async ({ page }) => {
    await page.goto(REVIEWER_URL);
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-review-row-approve').click();
    await page.getByTestId('ws-review-submit-btn').click();
    expect(await readReviewerSubmittedEvents(page)).toBe(1);

    await page.reload();
    await dismissGuidelineModal(page);

    // The submitted record lives in the localStorage bucket, so the reload
    // that wipes unsent decisions leaves the submission itself intact.
    expect(await readReviewerSubmittedEvents(page)).toBe(1);
  });
});
