import { test, expect, type Page } from '@playwright/test';
import {
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

  test('a normal single submit still records exactly one submitted history event (regression)', async ({ page }) => {
    await page.goto(buildWorkspaceUrl({ task_id: 'T001', sample_id: 'sent-001' }));
    await dismissGuidelineModal(page);

    await page.getByTestId('ws-single-label-chip-positive').click();
    await page.getByTestId('ws-submit-btn').click();

    await expect(page.getByTestId('ws-sample-item').first()).toHaveAttribute('data-submitted', 'true');
    expect(await readSubmittedEvents(page)).toHaveLength(1);
  });
});
