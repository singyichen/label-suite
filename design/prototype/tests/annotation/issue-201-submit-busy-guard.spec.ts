import { test, expect, type Page } from '@playwright/test';
import {
  buildListUrl,
  buildWorkspaceUrl,
  dismissGuidelineModal,
  patchDataFile,
  skipGuidelineModal,
} from './_workspace-helpers';

/* Issue #201 / w6-resilience-a11y.md DUP-01: the submit button had no
 * disable-on-click/debounce, so a double-click ran handleSubmit twice and
 * appendHistoryEvent appended TWO 'submitted' history events for the same
 * sample/annotator/run -- history inflation that would corrupt audit
 * reconstruction. Uses T001 (single_label, 5 records), same fixture as
 * annotation-workspace-common.spec.ts. */

type TrailEvent = { action: string; role: string; actorId: string | null; at: string; summary: string };

async function readSubmittedEvents(page: Page): Promise<TrailEvent[]> {
  const history = await page.evaluate(() => {
    const data = (window as unknown as {
      LabelSuiteAnnotationWorkspaceData: {
        getSampleHistory: (
          taskId: string,
          runType: string,
          sampleId: string,
          identity: Record<string, never>
        ) => TrailEvent[];
      };
    }).LabelSuiteAnnotationWorkspaceData;
    return data.getSampleHistory('T001', 'official_run', 'sent-001', {});
  });
  return history.filter((e) => e.action === 'submitted');
}

test.beforeEach(async ({ page }) => {
  await skipGuidelineModal(page);
  // Strip the gold_label output-role prefill so answering below is
  // unambiguously the annotator's own action (same rationale as
  // annotation-workspace-common.spec.ts).
  await patchDataFile(page, 'task-detail.data.js', `
    window.LabelSuiteTaskDetailData.profiles.T001.datasetRecords[0].gold_label = null;
  `);
});

test.describe('Submit double-click guard (issue #201, DUP-01)', () => {
  test('double-clicking submit rapidly records exactly one submitted history event', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    const submitBtn = page.getByTestId('ws-submit-btn');
    await Promise.all([submitBtn.click(), submitBtn.click()]);

    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
    expect(await readSubmittedEvents(page)).toHaveLength(1);
  });

  /* w6-resilience-a11y.md DUP-01, remaining legs: the history-event test
   * above covers audit-trail dedup; the acceptance row also requires that
   * the double-click leaves a single idempotent submitted STATUS and that
   * the annotation list never grows a second row for the sample. */
  test('after a double-click the status is a single submitted state and the list shows one row (DUP-01)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    const submitBtn = page.getByTestId('ws-submit-btn');
    await Promise.all([submitBtn.click(), submitBtn.click()]);

    const status = await page.evaluate(() => {
      const data = (window as unknown as {
        LabelSuiteAnnotationWorkspaceData: {
          getSampleStatus: (
            taskId: string,
            role: string,
            runType: string,
            sampleId: string,
            identity: Record<string, never>
          ) => string;
        };
      }).LabelSuiteAnnotationWorkspaceData;
      return data.getSampleStatus('T001', 'annotator', 'official_run', 'sent-001', {});
    });
    expect(status).toBe('submitted');

    await page.goto(buildListUrl({ task_id: 'T001' }));
    const submittedRow = page.getByTestId('ws-sample-item').filter({ hasText: 'sent-001' });
    await expect(submittedRow).toHaveCount(1);
    await expect(submittedRow.locator('.status-badge')).toHaveText('已提交');
  });

  test('a normal single submit still records exactly one submitted history event (regression)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-submit-btn').click();

    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
    expect(await readSubmittedEvents(page)).toHaveLength(1);
  });
});
