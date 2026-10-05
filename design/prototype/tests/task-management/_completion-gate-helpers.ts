/*
 * Traceability: specs/task-management/014-task-detail/spec.md FR-008b, AC-3.9.
 * Issue #1120 G3: 標記完成 is natively disabled until FR-008b (1)-(4) hold.
 *
 * Shared fixture for pre-existing suites whose subject is NOT the gate itself but
 * that must reach `completed`. T016 ships 5/5 submissions, 2 finalized units, 2
 * units awaiting arbitration and 1 pending final exception. This helper closes
 * them through the workspace module's own PUBLIC write paths (the same functions the
 * arbitration screen and the final exception pool call), so no app hook is
 * invented. The gate's own matrix lives in task-detail-completion-gate.spec.ts.
 */
import { expect, type Page } from '@playwright/test';

const T016_ANNOTATOR_ID = 'kioleemg12';

/** Open T016 (official_run_in_progress), resolve every dispute, reload, and wait for an enabled 標記完成. */
export async function openGateSatisfiedT016(page: Page, detailUrl: string) {
  await page.goto(`${detailUrl}?task_id=T016`);
  await expect(page.locator('#publishCompleteBtn')).toBeVisible();
  await page.evaluate((annotatorId) => {
    const ws = (window as any).LabelSuiteAnnotationWorkspaceData;
    ws.resolveExceptionPoolItem(
      'T016', 'official_run', 'ofm-05-final-exception', { annotatorId },
      'single_label', 'adopt_reviewer', 'positive', 'QA fixture: adopt the reviewer value',
    );
    ['ofm-03-awaiting-arbitration', 'ofm-04-reviewer-bypass'].forEach((sampleId) => {
      ws.submitArbitration(
        'T016', 'official_run', sampleId, { annotatorId, reviewerId: 'reviewer_chen' },
        [{ itemId: 'single_label::single_label', choice: 'adopt_b', value: 'neutral', reason: 'QA fixture' }],
      );
    });
  }, T016_ANNOTATOR_ID);
  await page.reload();
  await expect(page.locator('#publishCompleteBtn')).toBeEnabled();
}
