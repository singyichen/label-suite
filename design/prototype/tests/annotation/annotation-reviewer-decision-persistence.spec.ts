import { test, expect, type Page } from '@playwright/test';
import { buildWorkspaceUrl, dismissGuidelineModal, skipGuidelineModal } from './_workspace-helpers';

/* w6-resilience-a11y.md CONT-03 / issue #196: reviewer per-row decisions
 * used to live only in module-level vars (reviewRowDecisions/
 * reviewRowOriginals in annotation-workspace.config.js) with no
 * markSampleSaved-equivalent persistence call, unlike the annotator draft
 * path -- an unsent decision was lost on a full page reload. Per the
 * issue's own recommendation ("建議提供，維持角色對稱"), persistReviewDraft()
 * now mirrors markSampleSaved into the reviewer's localStorage bucket on
 * every decision change, and renderReviewerWorkspace() restores it before
 * the row buttons render. These tests pin the NEW behavior: an unsent
 * decision now survives a reload, and an already-submitted review is
 * unaffected either way. */

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

test.describe('Reviewer per-row decisions persist before submit (CONT-03, issue #196)', () => {
  test('an unsent row decision survives a full page reload', async ({ page }) => {
    await page.goto(REVIEWER_URL);
    await dismissGuidelineModal(page);

    const approveBtn = page.getByTestId('ws-review-row-approve');
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await dismissGuidelineModal(page);

    // Draft-persisted state: the decision survives the reload, same as an
    // annotator's saved draft (markSampleSaved), and the row has not been
    // submitted yet.
    await expect(page.getByTestId('ws-review-row-approve')).toHaveAttribute('aria-pressed', 'true');
    expect(await readReviewerSubmittedEvents(page)).toBe(0);
  });

  test('re-clicking an already-decided row cancels it back to undecided, and that clears too', async ({ page }) => {
    await page.goto(REVIEWER_URL);
    await dismissGuidelineModal(page);

    const approveBtn = page.getByTestId('ws-review-row-approve');
    await approveBtn.click();
    await approveBtn.click();
    await expect(approveBtn).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await dismissGuidelineModal(page);

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

    // The submitted record lives in the same localStorage bucket the draft
    // used, and markSampleSaved never downgrades a submitted entry, so a
    // later reload leaves the submission itself intact.
    expect(await readReviewerSubmittedEvents(page)).toBe(1);
  });
});
